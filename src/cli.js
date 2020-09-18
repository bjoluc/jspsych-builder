"use strict";

const { Command } = require("commander");
const Listr = require("listr");
const chalk = require("chalk");

const packageJson = require("../package.json");
const interactions = require("./interactions");

const program = new Command();

const defaultExperiment = "experiment";
module.exports.defaultExperiment = defaultExperiment;

/**
 * Invokes the provided callback function, catches any error and prints it to the console.
 *
 * @param {() => Promise<Any>} callback
 */
async function handleErrors(callback) {
  try {
    await callback();
  } catch (err) {
    console.error("\n" + chalk.bold(chalk.red("Error:")) + "\n" + err.message);
  }
}

// Common CLI options
program
  .storeOptionsAsProperties(false)
  .name("jspsych")
  .version(packageJson.version)
  .option(
    "-e, --experiment [experiment-file]",
    "The name of the main experiment file (without the '.js')",
    defaultExperiment
  );

// CLI commands
program
  .command("init")
  .description("Creates a new jsPsych project in the current directory.")
  .option(
    "-n --no-interaction",
    "Do not ask questions, but use the values provided via the other options."
  )
  .option("-t --title [title]", "The title of the new experiment")
  .option("-d --description [description]", "The description of the new experiment")
  .action(async (command) => {
    const options = command.opts();
    const experiment = program.opts().experiment;

    const defaults = {};
    if (typeof options.title === "string") {
      defaults.title = options.title;
    }
    if (typeof options.description === "string") {
      defaults.description = options.description;
    }

    let userInput;
    if (!options.interaction) {
      if (!defaults.title || !defaults.description) {
        console.error(
          "Both " +
            chalk.bold("--title") +
            " and " +
            chalk.bold("--description") +
            " have to be set in " +
            chalk.bold("--no-interaction") +
            " mode."
        );
        process.exit(1);
      }
      userInput = defaults;
    } else {
      userInput = await interactions.init(defaults);
      if (userInput === null) {
        return;
      }
      console.log("");
    }

    const tasks = require("./tasks");
    const runner = new Listr([tasks.compileProjectTemplate, tasks.installDependencies]);

    const ctx = {
      experiment,
      userInput,
    };

    await handleErrors(async () => {
      await runner.run(ctx);
      console.log(
        "\nDone! Now run " +
          chalk.bold(
            experiment === defaultExperiment ? "jspsych run" : `jspsych -e ${experiment} run`
          ) +
          " to start developing!"
      );
    });
  });

program
  .command("run")
  .description(
    "Builds the experiment, starts a local development server, and watches for changes to the source files. " +
      "Once a source file is modified, the build is updated, as is any browser window running the experiment."
  )
  .action(async () => {
    const tasks = require("./tasks");
    const runner = new Listr([tasks.build, tasks.webpackDevServer]);

    const ctx = {
      experiment: program.opts().experiment,
      isProduction: false,
      isForJatos: false,
    };

    await handleErrors(async () => {
      await runner.run(ctx);
    });
  });

program
  .command("build")
  .description(
    "Builds the experiment for deployment. " +
      "The resulting zip archive contains all the files required to serve the experiment on any machine."
  )
  .action(async () => {
    const tasks = require("./tasks");
    const runner = new Listr([tasks.build, tasks.package]);

    const ctx = {
      experiment: program.opts().experiment,
      isProduction: true,
      isForJatos: false,
    };

    await handleErrors(async () => {
      await runner.run(ctx);
      console.log(ctx.message);
    });
  });

program
  .command("jatos")
  .description(
    "Builds the experiment and packages it for JATOS. " +
      "The resulting jzip file can be imported as a JATOS study by JATOS."
  )
  .action(async () => {
    const tasks = require("./tasks");
    const runner = new Listr([tasks.build, tasks.package]);

    const ctx = {
      experiment: program.opts().experiment,
      isProduction: true,
      isForJatos: true,
    };

    await handleErrors(async () => {
      await runner.run(ctx);
      console.log(ctx.message);
    });
  });

module.exports.program = program;
