"use strict";

import gulp from "gulp";
import del from "del";
import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import HtmlWebpackTagsPlugin from "html-webpack-tags-plugin";
import chalk from "chalk";
import path from "path";
import resolveCwd from "resolve-cwd";
import slash from "slash";
import Listr from "listr";
import slugify from "slugify";
import { execa } from "execa";
import { fileURLToPath } from "url";

import gulpZip from "gulp-zip";
import gulpTemplate from "gulp-template";
import gulpRename from "gulp-rename";
import gulpIf from "gulp-if";
import gulpCached from "gulp-cached";
import gulpFile from "gulp-file";

import { promisify } from "util";
import stream from "stream";
const pipeline = promisify(stream.pipeline);

import {
  loadDocblockPragmas,
  getAssetDirectories,
  getAssetPaths,
  getJatosStudyMetadata,
  requireJson,
} from "./util.js";
import { defaultExperiment } from "./cli.js";

const packageJson = requireJson("../package.json");

// Global constants
const builderDir = slash(path.resolve(fileURLToPath(import.meta.url), "../.."));
const builderAssetsDir = builderDir + "/assets";
const builderNodeModulesDir = builderDir + "/node_modules";

export const compileProjectTemplate = {
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
        gulpTemplate(templateData),
        gulpRename((path) => {
          path.basename = "package";
        }),
        gulp.dest(".")
      ),
      pipeline(
        gulp.src([templateDir + "/src/experiment.tmpl.js"]),
        gulpTemplate(templateData),
        gulpRename((path) => {
          path.basename = experiment;
        }),
        gulp.dest("src/")
      ),
    ]);
  },
};

export const installDependencies = {
  title: "Installing dependencies",
  task: () => execa("npm", ["install"]),
};

export const prepareContext = {
  title: "Reading experiment file",
  task: async (ctx, task) => {
    const experiment = ctx.experiment;

    // Resolve experiment file
    let experimentFile;
    for (const suffix of ["", ".js", ".ts", ".jsx", ".tsx"]) {
      const relativePath = "./src/" + experiment + suffix;
      const absolutePath = resolveCwd.silent(relativePath);
      if (absolutePath) {
        experimentFile = relativePath;
        ctx.absoluteExperimentFilePath = absolutePath;
      }
    }

    task.title = "Reading " + experimentFile;

    if (!experimentFile) {
      let message = `Experiment file ${chalk.bold(
        experiment + ".js"
      )} (or .ts, .jsx, .tsx) does not exist.`;

      if (experiment === defaultExperiment) {
        message += ` Did you forget to provide the ${chalk.green("[experiment-file]")} argument?`;
      }

      throw new Error(message);
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

const clean = {
  title: "Cleaning build directory",
  task: (ctx) => del(ctx.dist),
};

export const copyAssets = {
  title: "Copying assets",
  task: (ctx, task) => {
    if (ctx.assetDirGlobs.length === 0) {
      task.skip("No asset directories have been specified.");
    } else {
      const copy = () =>
        pipeline(
          gulp.src(ctx.assetDirGlobs, { base: "media" }),

          // For watching: Memorize the files and exclude asset files that did not change since the last copying
          gulpCached("assets", { optimizeMemory: true }),

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

// Bundle javascript with webpack, transpile it with babel
const getWebpackConfig = (ctx) => {
  /** @type {import("webpack").Configuration} */
  const config = {
    entry: builderAssetsDir + "/app.js",
    output: {
      path: ctx.dist,
      filename: "js/app.js",
    },
    resolve: {
      // Try cwd node_modules first, then jspsych-builder node_modules
      modules: ["node_modules", builderNodeModulesDir],
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      alias: {
        // Set the current experiment file as an alias so it can be imported in app.js
        JsPsychBuilderCurrentExperiment: ctx.absoluteExperimentFilePath,
      },
    },
    resolveLoader: {
      modules: ["node_modules", builderNodeModulesDir],
    },
    plugins: [
      new MiniCssExtractPlugin({ filename: "css/[name].css" }),
      // Define a global constant with data for usage in app.js
      new webpack.DefinePlugin({
        JSPSYCH_BUILDER_CONFIG: JSON.stringify({
          assetPaths: ctx.assetPaths,
        }),
      }),
      new HtmlWebpackPlugin({
        title: ctx.meta.title + (ctx.isProduction ? "" : " (Development Build)"),
        meta: {
          "X-UA-Compatible": { "http-equiv": "X-UA-Compatible", content: "ie=edge" },
          viewport: "width=device-width, initial-scale=1.0",
        },
      }),
      new HtmlWebpackTagsPlugin({
        tags: ctx.isForJatos ? [{ path: "/assets/javascripts/jatos.js", append: false }] : [],
      }),
    ],
    module: {
      rules: [
        {
          test: /.(j|t)sx?$/,
          exclude: /node_modules(?![\\\/]jspsych)/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-typescript", "@babel/preset-react"],
              plugins: [
                "@babel/plugin-proposal-class-properties",
                ["@babel/plugin-transform-classes", { loose: true }],
                "@babel/plugin-proposal-object-rest-spread",
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

export const webpackDevServer = {
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

// Composed build task
export const build = {
  title: "Building ",
  task: (ctx, task) => {
    task.title += ctx.experiment;
    return new Listr([prepareContext, clean, copyAssets, webpackBuild]);
  },
};

// Create a zip archive with the build – either plain or for JATOS
export const pack = {
  title: "Packaging experiment",
  task: async (ctx) => {
    const { experiment, isForJatos, dist, meta } = ctx;

    const filename = experiment + "_" + meta.version + (isForJatos ? ".jzip" : ".zip");

    await pipeline(
      gulp.src(dist + "/**/*"),
      gulpRename((file) => {
        file.dirname = experiment + "/" + file.dirname;
      }),

      // Optionally add a .jas file with JATOS metadata
      gulpIf(
        isForJatos,
        gulpFile(
          experiment + ".jas",
          JSON.stringify(
            getJatosStudyMetadata(experiment, meta.title, meta.description, meta.version)
          )
        )
      ),

      gulpZip(filename),
      gulp.dest("packaged")
    );

    ctx.message = "Your build has been exported to " + chalk.cyan("packaged/" + filename);
    if (isForJatos) {
      ctx.message += '\nYou can now import that file with a JATOS server ("import study"). Cheers!';
    }
  },
};
