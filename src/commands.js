"use strict";

/**
 * The commands module assembles the tasks from the task module and exports functions to run them.
 */

const Listr = require("listr");
const SilentRenderer = require("listr-silent-renderer");
const chalk = require("chalk");
const gulp = require("gulp");
const cache = require("gulp-cached");
const del = require("del");
const path = require("path");
const { intersection } = require("lodash");

const tasks = require("./tasks");
const { loadDocblockPragmas, getDifferingKeys } = require("./util");

module.exports.init = async (experiment, userInput) => {
  await new Listr([tasks.compileProjectTemplate, tasks.installDependencies]).run({
    experiment,
    userInput,
  });
  console.log("\nDone! Now run " + chalk.bold("jspsych run") + " to start developing!");
};

module.exports.build = async (experiment, isForJatos = false) => {
  const tasks = require("./tasks");
  const runner = new Listr([tasks.build, tasks.package]);

  const ctx = {
    experiment,
    isProduction: true,
    isForJatos,
  };

  await runner.run(ctx);
  console.log(ctx.message);
};

module.exports.run = async (experiment) => {
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
