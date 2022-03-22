"use strict";

/**
 * The commands module assembles the tasks from the task module and exports functions to run them.
 */

import Listr from "listr";
import SilentRenderer from "listr-silent-renderer";

import chalk from "chalk";
import gulp from "gulp";
import cache from "gulp-cached";
import del from "del";
import path from "path";
import { intersection } from "lodash-es";

import * as tasks from "./tasks.js";
import { loadDocblockPragmas, getDifferingKeys } from "./util.js";

export const init = async (experiment, userInput) => {
  await new Listr([tasks.compileProjectTemplate, tasks.installDependencies]).run({
    experiment,
    userInput,
  });
  console.log("\nDone! Now run " + chalk.bold("npm start") + " to start developing!");
};

export const build = async (experiment, isForJatos = false) => {
  const runner = new Listr([tasks.build, tasks.pack]);

  const ctx = {
    experiment,
    isProduction: true,
    isForJatos,
  };

  await runner.run(ctx);
  console.log(ctx.message);
};

export const run = async (experiment) => {
  const ctx = {
    experiment,
    isProduction: false,
    isForJatos: false,
    watchAssets: true,
  };

  await new Listr([tasks.build, tasks.webpackDevServer]).run(ctx);
  console.log(ctx.message);

  let watcher = ctx.assetWatcher;
  const experimentFile = ctx.absoluteExperimentFilePath;

  // Watch for changes to the experiment file
  gulp.watch(experimentFile, async () => {
    // Compute names of changed pragmas
    const changedPragmas = getDifferingKeys(ctx.meta, loadDocblockPragmas(experimentFile));

    // Re-run tasks that depend on one of the changed pragmas
    if (changedPragmas.size) {
      await new Listr([tasks.prepareContext], { renderer: SilentRenderer }).run(ctx);

      if (changedPragmas.has("title")) {
        await new Listr([tasks.html], { renderer: SilentRenderer }).run(ctx);
      }

      if (
        intersection([...changedPragmas], ["imageDir", "audioDir", "videoDir", "miscDir"]).length
      ) {
        // Restart assets watching (delete assets and copy over again)
        watcher.close();
        del.sync(path.resolve(ctx.dist, "media") + "/**/*");
        delete cache.caches["assets"];
        await new Listr([tasks.copyAssets], { renderer: SilentRenderer }).run(ctx);
        watcher = ctx.assetWatcher;
      }
    }
  });
};
