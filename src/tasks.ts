import gulp from "gulp";
import del from "del";
import WebpackDevServer from "webpack-dev-server";
import chalk from "chalk";
import path from "path";
import resolveCwd from "resolve-cwd";
import Listr, { ListrTask } from "listr";
import { execa } from "execa";
import webpack from "webpack";

import gulpZip from "gulp-zip";
import gulpTemplate from "gulp-template";
import gulpRename from "gulp-rename";
import gulpIf from "gulp-if";
import gulpCached from "gulp-cached";
// @ts-expect-error No types for `gulp-file`
import gulpFile from "gulp-file";

import { promisify } from "util";
import stream from "stream";
const pipeline = promisify(stream.pipeline);
import { FSWatcher } from "fs";
import { version as builderVersion } from "../package.json";

import {
  loadDocblockPragmas,
  getAssetDirectories,
  getAssetPaths,
  getJatosStudyMetadata,
  AssetPaths,
} from "./util";
import { defaultExperiment } from "./cli";
import { builderAssetsDir, getWebpackConfig } from "./config";
import { InitInput } from "./interactions";

export interface BuilderContext {
  userInput?: InitInput;

  experiment: string;
  absoluteExperimentFilePath?: string;
  relativeDistPath?: string;

  meta?: any;
  dist?: string;

  assetDirs?: AssetPaths;
  assetDirsList?: string[];
  assetDirGlobs?: string[];
  assetPaths?: AssetPaths;

  watchAssets?: boolean;
  assetWatcher?: FSWatcher;

  isForJatos?: boolean;
  isProduction?: boolean;

  message?: string;

  config?: any
}

export const compileProjectTemplate = {
  title: "Compiling project template",
  task: (ctx: BuilderContext) => {
    const templateDir = builderAssetsDir + "/template";
    const experiment = ctx.experiment;
    const input = ctx.userInput!;

    const templateData = {
      experiment,
      title: input.title,
      description: input.description,
      builderVersion,
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
        gulpTemplate(templateData, {}),
        gulpRename((path) => {
          path.basename = "package";
        }),
        gulp.dest(".")
      ),
      pipeline(
        gulp.src([templateDir + "/src/experiment.tmpl.js"]),
        gulpTemplate(templateData, {}),
        gulpRename((path) => {
          path.basename = experiment;
        }),
        gulp.dest("src/")
      ),
    ]);
  },
};

export const installDependencies: ListrTask<BuilderContext> = {
  title: "Installing dependencies",
  task: () => execa("npm", ["install"]),
};

export const prepareContext: ListrTask<BuilderContext> = {
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
    ctx.assetDirsList = Object.values(ctx.assetDirs).flat();
    ctx.assetDirGlobs = ctx.assetDirsList.map((dir) => dir + "/**/*");
    ctx.assetPaths = await getAssetPaths(ctx.assetDirs);

    // We need to ignore this since we're actually loading this at run-time.
    const configPath = resolveCwd.silent(path.join(process.cwd(), "jspsych.config.cjs"))
    // @ts-ignore
    ctx.config = configPath ? require(configPath) : undefined
  },
};

const clean: ListrTask<BuilderContext> = {
  title: "Cleaning build directory",
  task: (ctx) => del(ctx.dist!),
};

export const copyAssets: ListrTask<BuilderContext> = {
  title: "Copying assets",
  task: (ctx, task) => {
    if (ctx.assetDirGlobs!.length === 0) {
      task.skip("No asset directories have been specified.");
      return;
    } else {
      const copy = () =>
        pipeline(
          gulp.src(ctx.assetDirGlobs!, { base: "media" }),

          // For watching: Memorize the files and exclude asset files that did not change since the last copying
          gulpCached("assets", { optimizeMemory: true }),

          gulp.dest(ctx.dist + "/media")
        );

      if (ctx.watchAssets) {
        task.title += " and starting to watch asset directories";
        const watcher = gulp.watch(ctx.assetDirsList!, {}, copy);

        // Mirror deletion of files and directories
        const mirrorDeletion = (deletedPath: string) => {
          del.sync(path.resolve(ctx.dist!, path.relative(path.resolve("."), deletedPath)));
        };
        watcher.on("unlink", mirrorDeletion);
        watcher.on("unlinkDir", mirrorDeletion);

        ctx.assetWatcher = watcher;
      }

      return copy();
    }
  },
};

const webpackBuild: ListrTask<BuilderContext> = {
  title: "Building scripts and styles",
  task: (ctx) =>
    new Promise<void>((resolve, reject) => {
      webpack(getWebpackConfig(ctx), (err, stats) => {
        if (err) {
          reject(err);
          return;
        }
        if (stats?.hasErrors()) {
          reject(new Error(stats.toString({ all: false, errors: true })));
          return;
        }
        if (stats?.hasWarnings()) {
          console.log(stats.toString({ all: false, warnings: true }));
        }
        resolve();
      });
    }),
};

export const webpackDevServer: ListrTask<BuilderContext> = {
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

    const addressInfo = devServer.server?.address();
    if (typeof addressInfo === "object" && addressInfo !== null) {
      ctx.message = `Project is running at ${chalk.green.bold(
        `http://localhost:${addressInfo.port}/`
      )}`;
    }
  },
};

// Composed build task
export const build: ListrTask<BuilderContext> = {
  title: "Building ",
  task: (ctx, task) => {
    task.title += ctx.experiment;
    return new Listr([prepareContext, clean, copyAssets, webpackBuild]);
  },
};

// Create a zip archive with the build – either plain or for JATOS
export const pack: ListrTask<BuilderContext> = {
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
        isForJatos ?? false,
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
