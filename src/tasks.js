"use strict";

const gulp = require("gulp");
const loadGulpPlugins = require("gulp-load-plugins");
const del = require("del");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const chalk = require("chalk");
const path = require("path");
const resolveCwd = require("resolve-cwd");
const Listr = require("listr");
const slugify = require("slugify");
const execa = require("execa");

const { promisify } = require("util");
const pipeline = promisify(require("stream").pipeline);

const packageJson = require("../package.json");
const {
  loadDocblockPragmas,
  getAssetDirectories,
  getAssetPaths,
  getJatosStudyMetadata,
} = require("./util");
const { defaultExperiment } = require("./cli");

// Global constants
const builderDir = path.resolve(__dirname, "..");
const builderAssetsDir = builderDir + "/assets";
const builderNodeModulesDir = builderDir + "/node_modules";

// Load all Gulp plugins into one variable
const plugins = loadGulpPlugins();

module.exports.compileProjectTemplate = {
  title: "Compiling project template",
  task: (ctx) => {
    const templateDir = builderAssetsDir + "/template";
    const experiment = ctx.experiment;
    const input = ctx.userInput;

    const templateData = {
      experiment,
      title: input.title,
      description: input.description,
      packageName: slugify(input.title, { lower: true }),
      packageVersion: "0.0.1",
      builderVersion: packageJson.version,
    };

    return Promise.all([
      // Copy raw files
      pipeline(
        gulp.src([templateDir + "/**/*", "!" + templateDir + "/**/*.tmpl.*"], { dot: true }),
        gulp.dest(".")
      ),

      // Compile template files
      pipeline(
        gulp.src([templateDir + "/package.tmpl.json"]),
        plugins.template(templateData),
        plugins.rename((path) => {
          path.basename = "package";
        }),
        gulp.dest(".")
      ),
      pipeline(
        gulp.src([templateDir + "/src/experiment.tmpl.js"]),
        plugins.template(templateData),
        plugins.rename((path) => {
          path.basename = experiment;
        }),
        gulp.dest("src/")
      ),
    ]);
  },
};

module.exports.installDependencies = {
  title: "Installing dependencies",
  task: () => execa("npm", ["install"]),
};

const prepareContext = {
  title: "Reading ",
  task: async (ctx, task) => {
    const experiment = ctx.experiment;
    task.title += experiment + ".js";

    const experimentFile = "./src/" + experiment + ".js";

    // Resolve the experiment file
    try {
      ctx.absoluteExperimentFilePath = resolveCwd(experimentFile);
    } catch (e) {
      if (e.code === "MODULE_NOT_FOUND") {
        e.message = `Experiment file ${chalk.bold(experimentFile)} does not exist.`;

        if (experiment === defaultExperiment) {
          e.message += ` Did you forget to provide the ${chalk.green(
            "[experiment-file]"
          )} argument?`;
        }

        throw e;
      }
    }

    ctx.meta = loadDocblockPragmas(experimentFile);

    for (let pragma of ["title", "description", "version"]) {
      if (typeof ctx.meta[pragma] === "undefined") {
        throw new Error(
          `${chalk.bold(experimentFile)} does not specify a "${pragma}" pragma (like ${
            chalk.blue(`@${pragma} `) + chalk.green(`My ${pragma}`)
          }). Please add it and try again.`
        );
      }
    }

    ctx.relativeDistPath = ".jspsych-builder/" + experiment;
    ctx.dist = path.resolve(ctx.relativeDistPath);

    ctx.assetDirs = getAssetDirectories(ctx.meta);
    ctx.assetDirsList = [].concat(...Object.values(ctx.assetDirs));
    ctx.assetDirGlobs = ctx.assetDirsList.map((dir) => dir + "/**/*");
    ctx.assetPaths = await getAssetPaths(ctx.assetDirs);
  },
};

module.exports.prepareContext = prepareContext;

const clean = {
  title: "Cleaning build directory",
  task: (ctx) => del(ctx.dist),
};

const copyAssets = {
  title: "Copying assets",
  task: (ctx, task) => {
    if (ctx.assetDirGlobs.length === 0) {
      task.skip("No asset directories have been specified.");
    } else {
      const copy = () =>
        pipeline(
          gulp.src(ctx.assetDirGlobs, { base: "media" }),

          // For watching: Memorize the files and exclude asset files that did not change since the last copying
          plugins.cached("assets", { optimizeMemory: true }),

          gulp.dest(ctx.dist + "/media")
        );

      if (ctx.watchAssets) {
        task.title += " and starting to watch asset directories";
        const watcher = gulp.watch(
          ctx.assetDirsList,
          { events: ["add", "addDir", "change", "unlink", "unlinkDir"] },
          copy
        );

        // Mirror deletion of files and directories
        const mirrorDeletion = (deletedPath) => {
          del.sync(path.resolve(ctx.dist, path.relative(path.resolve("."), deletedPath)));
        };
        watcher.on("unlink", mirrorDeletion);
        watcher.on("unlinkDir", mirrorDeletion);

        ctx.assetWatcher = watcher;
      }

      return copy();
    }
  },
};

module.exports.copyAssets = copyAssets;

// Bundle javascript with webpack, transpile it with babel
const getWebpackConfig = (ctx) => {
  /** @type {import("webpack").Configuration} */
  const config = {
    entry: builderAssetsDir + "/app.js",
    output: {
      filename: "js/app.js",
      path: ctx.dist,
    },
    resolve: {
      // Try cwd node_modules first, then jspsych-builder node_modules
      modules: ["node_modules", builderNodeModulesDir],
      alias: {
        // Set the current experiment file as an alias so it can be imported in app.js
        JsPsychBuilderCurrentExperiment: ctx.absoluteExperimentFilePath,
      },
    },
    resolveLoader: {
      modules: ["node_modules", builderNodeModulesDir],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "css/[name].css",
      }),
      // Define a global constant with data for usage in app.js
      new webpack.DefinePlugin({
        JSPSYCH_BUILDER_CONFIG: JSON.stringify({
          assetPaths: ctx.assetPaths,
        }),
      }),
    ],
    module: {
      rules: [
        {
          test: /.js$/,
          exclude: /node_modules(?![\\\/]jspsych)/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [[require("@babel/preset-env"), { modules: "commonjs" }]],
              plugins: [
                require("@babel/plugin-proposal-class-properties"),
                [require("@babel/plugin-transform-classes"), { loose: true }],
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: [{ loader: MiniCssExtractPlugin.loader }, "css-loader"],
        },
        {
          test: /\.s[ac]ss$/i,
          use: [{ loader: MiniCssExtractPlugin.loader }, "css-loader", "sass-loader"],
        },
      ],
    },
    performance: {
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    mode: ctx.isProduction ? "production" : "development",
    stats: {
      all: false,
      errors: true,
      warnings: true,
    },
  };

  if (ctx.isProduction) {
    config.optimization = { minimize: true };
  } else {
    config.devtool = "inline-source-map";
  }

  return config;
};

const webpackBuild = {
  title: "Building scripts and styles",
  task: (ctx) =>
    new Promise((resolve, reject) => {
      webpack(getWebpackConfig(ctx), (err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        if (stats.hasErrors()) {
          reject(new Error(stats.toString({ all: false, errors: true })));
          return;
        }
        if (stats.hasWarnings()) {
          console.log(stats.toString({ all: false, warnings: true }));
        }
        resolve();
      });
    }),
};

const webpackDevServer = {
  title: "Starting development server",
  task: async (ctx) => {
    const compiler = webpack({
      ...getWebpackConfig(ctx),
      infrastructureLogging: {
        level: "error",
      },
    });

    const devServer = new WebpackDevServer(
      {
        static: {
          directory: ctx.dist,
        },
        devMiddleware: {
          publicPath: "http://localhost:3000/",
        },
        port: 3000,
        client: {
          overlay: true,
        },
      },
      compiler
    );
    await devServer.start();

    ctx.message = `Project is running at ${chalk.green.bold(
      `http://localhost:${devServer.server.address().port}/`
    )}`;
  },
};

module.exports.webpackDevServer = webpackDevServer;

const html = {
  title: "Building index.html",
  task: (ctx) => {
    let htmlReplacements = {
      title: {
        src: ctx.meta.title + (ctx.isProduction ? "" : " (Development Build)"),
        tpl: "<title>%s</title>",
      },
    };

    if (ctx.isForJatos) {
      htmlReplacements.jatosjs = "/assets/javascripts/jatos.js";
    }

    return pipeline(
      gulp.src(builderAssetsDir + "/index.html"),
      plugins.htmlReplace(htmlReplacements),
      plugins.inject(gulp.src(ctx.dist + "/css/**/*"), {
        addRootSlash: false,
        ignorePath: ctx.relativeDistPath,
        quiet: true,
      }),
      plugins.removeEmptyLines({ removeComments: true }),
      gulp.dest(ctx.dist)
    );
  },
};

module.exports.html = html;

// Composed build task
module.exports.build = {
  title: "Building ",
  task: (ctx, task) => {
    task.title += ctx.experiment;
    return new Listr([prepareContext, clean, copyAssets, webpackBuild, html]);
  },
};

// Create a zip archive with the build – either plain or for JATOS
module.exports.package = {
  title: "Packaging experiment",
  task: async (ctx) => {
    const { experiment, isForJatos, dist, meta } = ctx;

    const filename = experiment + "_" + meta.version + (isForJatos ? ".jzip" : ".zip");

    await pipeline(
      gulp.src(dist + "/**/*"),
      plugins.rename((file) => {
        file.dirname = experiment + "/" + file.dirname;
      }),

      // Optionally add a .jas file with JATOS metadata
      plugins.if(
        isForJatos,
        plugins.file(
          experiment + ".jas",
          JSON.stringify(
            getJatosStudyMetadata(experiment, meta.title, meta.description, meta.version)
          )
        )
      ),

      plugins.zip(filename),
      gulp.dest("packaged")
    );

    ctx.message = "Your build has been exported to " + chalk.cyan("packaged/" + filename);
    if (isForJatos) {
      ctx.message += '\nYou can now import that file with a JATOS server ("import study"). Cheers!';
    }
  },
};
