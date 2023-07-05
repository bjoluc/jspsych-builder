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
import { mergeWith, sortedUniq } from "lodash-es";
import portFinder from "portfinder";
import { silent as resolveCwd } from "resolve-cwd";
import { Observable } from "rxjs";
import webpack, { Compiler } from "webpack";
import WebpackDevServer from "webpack-dev-server";

import {
  UserConfig,
  builderAssetsDir,
  defaultExperiment,
  distPath,
  getJatosStudyMetadata,
  getWebpackConfig,
  getWebpackDevServerConfig,
  loadUserConfig,
  packageVersion,
} from "./config";
import { InitInput } from "./interactions";
import {
  AssetPaths,
  getAssetPaths,
  getDeprecatedAssetDirectories,
  getDeprecatedAssetPaths,
  loadDocblockPragmas,
  separateDirectoryAndFilePaths,
} from "./util";

const pipeline = promisify(stream.pipeline);

export interface Pragmas {
  title: string;
  description: string;
  version: string;
  assets?: string;

  // Deprecated:
  imageDir?: string;
  audioDir?: string;
  videoDir?: string;
  miscDir?: string;
}

export interface BuilderContext {
  userInput?: InitInput;

  experiment: string;
  absoluteExperimentFilePath?: string;

  pragmas?: Pragmas;

  /** A list of all asset directory paths */
  assetDirsList?: string[];

  /** A list of paths of all asset files that do not reside in a directory in `assetDirsList` */
  assetFilesList?: string[];

  /**
   * The asset paths, grouped by their type, that will be passed to the experiment file's `run`
   * function
   */
  assetPaths?: AssetPaths;

  isForJatos?: boolean;
  isProduction?: boolean;

  devServerPort?: number;

  compiler?: Compiler;
  devServer?: WebpackDevServer;
  message?: string;

  config?: UserConfig;
}

async function prepareContext(ctx: BuilderContext) {
  const experiment = ctx.experiment;

  // Resolve experiment file
  let experimentFile;
  for (const suffix of ["", ".js", ".ts", ".jsx", ".tsx"]) {
    const relativePath = "./src/" + experiment + suffix;
    const absolutePath = resolveCwd(relativePath);
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

  const pragmas = loadDocblockPragmas(experimentFile);

  for (let pragma of ["title", "description", "version"]) {
    if (typeof pragmas[pragma] === "undefined") {
      throw new Error(
        `${chalk.bold(experimentFile)} does not specify a "${pragma}" pragma (like ${
          chalk.blue(`@${pragma} `) + chalk.green(`My ${pragma}`)
        }). Please add it and try again.`
      );
    }
  }

  ctx.pragmas = pragmas as any;

  const deprecatedAssetDirs = getDeprecatedAssetDirectories(ctx.pragmas!);
  const deprecatedAssetPaths = await getDeprecatedAssetPaths(deprecatedAssetDirs);

  const [assetDirectories, assetFiles] = await separateDirectoryAndFilePaths(
    ((ctx.pragmas?.assets ?? "") as string)
      .split(",")
      .map((path) => (path.startsWith("/") ? path.slice(1) : path)) // Remove leading slashes
      .filter(Boolean) // Remove empty entries
  );

  ctx.assetDirsList = [...assetDirectories, ...Object.values(deprecatedAssetDirs).flat()];
  ctx.assetFilesList = assetFiles;

  const assetPaths = await getAssetPaths(assetDirectories, assetFiles);
  ctx.assetPaths = mergeWith(assetPaths, deprecatedAssetPaths, (objValue, srcValue) =>
    sortedUniq(objValue.concat(srcValue).sort())
  );

  ctx.config = await loadUserConfig();
}

export const compileProjectTemplate: ListrTask<BuilderContext> = {
  title: "Compiling project template",
  task: (ctx) => {
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
  task: async (ctx) =>
    new Observable((observer) => {
      observer.next("reading source file");

      prepareContext(ctx)
        .then(() => {
          const compiler = webpack(getWebpackConfig(ctx));
          ctx.compiler = compiler;

          if (process.stdout.isTTY) {
            new webpack.ProgressPlugin((percentage, message) => {
              observer.next(`${Math.round(percentage * 100)}% ${message}`);
            }).apply(compiler);
          } else {
            observer.next("building");
          }

          compiler.run((error, stats) => {
            if (error) {
              observer.error(error);
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
        })
        .catch((error) => {
          observer.error(error);
        });
    }),
};

export const webpackDevServer: ListrTask<BuilderContext> = {
  title: "Starting development server",
  task: async (ctx) => {
    if (!ctx.devServerPort) {
      ctx.devServerPort = await portFinder.getPortPromise({ port: 3000 });
    }

    const devServer = (ctx.devServer = new WebpackDevServer(
      getWebpackDevServerConfig(ctx),
      ctx.compiler!
    ));
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
    const { experiment, isForJatos, pragmas } = ctx;

    const filename = experiment + "_" + pragmas?.version! + (isForJatos ? ".jzip" : ".zip");

    await pipeline(
      gulp.src(distPath + "/**/*"),
      gulpRename((file) => {
        file.dirname = experiment + "/" + file.dirname;
      }),

      // Optionally add a .jas file with JATOS metadata
      gulpIf(
        isForJatos ?? false,
        gulpFile(
          experiment + ".jas",
          JSON.stringify(
            getJatosStudyMetadata(
              experiment,
              pragmas?.title!,
              pragmas?.description!,
              pragmas?.version!
            )
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
