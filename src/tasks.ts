import path from "path";
import stream from "stream";
import { promisify } from "util";

import chalk from "chalk";
import { execa } from "execa";
import gulp from "gulp";
// @ts-expect-error No types for `gulp-file`
import gulpFile from "gulp-file";
import gulpIf from "gulp-if";
import gulpRename from "gulp-rename";
import gulpTemplate from "gulp-template";
import gulpZip from "gulp-zip";
import { ListrTask } from "listr";
import resolveCwd from "resolve-cwd";
import { Observable } from "rxjs";
import webpack, { Compiler } from "webpack";
import WebpackDevServer from "webpack-dev-server";

import {
  builderAssetsDir,
  defaultExperiment,
  getJatosStudyMetadata,
  getWebpackConfig,
  packageVersion,
} from "./config";
import { InitInput } from "./interactions";
import { AssetPaths, getAssetDirectories, getAssetPaths, loadDocblockPragmas } from "./util";

const pipeline = promisify(stream.pipeline);

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

  isForJatos?: boolean;
  isProduction?: boolean;

  compiler?: Compiler;
  devServer?: WebpackDevServer;
  message?: string;
}

async function prepareContext(ctx: BuilderContext) {
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
      builderVersion: packageVersion,
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

export const build: ListrTask<BuilderContext> = {
  title: "Building",
  task: (ctx) =>
    new Observable((observer) => {
      observer.next("reading source file");
      prepareContext(ctx).then(() => {
        const compiler = webpack(getWebpackConfig(ctx));
        ctx.compiler = compiler;

        if (process.stdout.isTTY) {
          new webpack.ProgressPlugin((percentage, message) => {
            observer.next(`${Math.round(percentage * 100)}% ${message}`);
          }).apply(compiler);
        } else {
          observer.next("building");
        }

        compiler.run((err, stats) => {
          if (err) {
            observer.error(err);
            return;
          }
          if (stats?.hasErrors()) {
            observer.error(new Error(stats.toString({ all: false, errors: true })));
            return;
          }
          if (stats?.hasWarnings()) {
            console.log(stats.toString({ all: false, warnings: true }));
          }
          observer.complete();
        });
      });
    }),
};

export const webpackDevServer: ListrTask<BuilderContext> = {
  title: "Starting development server",
  task: async (ctx) => {
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
      ctx.compiler!
    );
    ctx.devServer = devServer;
    await devServer.start();

    const addressInfo = devServer.server?.address();
    if (typeof addressInfo === "object" && addressInfo !== null) {
      ctx.message = `Project is running at ${chalk.green.bold(
        `http://localhost:${addressInfo.port}/`
      )}`;
    }
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

    ctx.message = "Your build has been exported to " + chalk.cyan(`packaged/${filename}`);
    if (isForJatos) {
      ctx.message += '\nYou can now import that file with a JATOS server ("import study"). Cheers!';
    }
  },
};