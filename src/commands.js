"use strict";

/**
 * The commands module assembles the tasks from the task module and exports functions to run them.
 */

const Listr = require("listr");
const chalk = require("chalk");
const gulp = require("gulp");

const tasks = require("./tasks");

module.exports.init = async (experimentFile, userInput) => {
  await new Listr([tasks.compileProjectTemplate, tasks.installDependencies]).run({
    experiment: experimentFile,
    userInput,
  });
  console.log("\nDone! Now run " + chalk.bold("jspsych run") + " to start developing!");
};

module.exports.build = async (experimentFile, isForJatos = false) => {
  const tasks = require("./tasks");
  const runner = new Listr([tasks.build, tasks.package]);

  const ctx = {
    experiment: experimentFile,
    isProduction: true,
    isForJatos,
  };

  await runner.run(ctx);
  console.log(ctx.message);
};

module.exports.run = async (experimentFile) => {
  const context = {
    experiment: experimentFile,
    isProduction: false,
    isForJatos: false,
    watchAssets: true,
  };

  const watcher = (await new Listr([tasks.build, tasks.webpackDevServer]).run(context))
    .assetWatcher;
};
