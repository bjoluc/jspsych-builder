"use strict";

const chalk = require("chalk");

const packageJson = require("../package.json");
const interactions = require("./interactions");

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

/**
 * Given a yargs instance, configures an optional positional "experiment-file" argument
 *
 * @param {yargs.Argv<{}>} yargs
 */
function addExperimentFileOption(yargs) {
  yargs.positional("experiment-file", {
    alias: ["experiment", "e"],
    type: "string",
    default: "experiment",
    description:
      "The experiment file (JavaScript) to be read (within" +
      ' the "src" directory and without the ".js" suffix). ' +
      'Example: "my-experiment" resolves to "./src/my-experiment.js".',
  });
}

const yargs = require("yargs")
  // Common CLI options
  .usage("Usage: $0 <command> [options]")

  .group(["help", "version"], "General options:")
  .help("help")
  .alias("help", "h")
  .version(packageJson.version)
  .alias("version", "v")

  .demandCommand()
  .recommendCommands()
  .strict()

  .command({
    command: "init",
    desc: "Create a new jsPsych project in the current directory",
    builder: (yargs) => {
      yargs.options({
        title: {
          alias: "t",
          type: "string",
          description: "The title of the new experiment",
        },
        description: {
          alias: "d",
          type: "string",
          description: "The description of the new experiment",
        },
        "experiment-file": {
          alias: ["experiment", "e"],
          type: "string",
          description:
            "The name of the experiment JavaScript file to be created in the " +
            ' "src" directory (without the ".js" suffix).',
          default: "experiment",
        },
        "no-interaction": {
          alias: "n",
          type: "boolean",
          description: "Do not ask questions, but use the values provided via the other options",
          implies: ["description", "title"],
        },
      });
    },
    handler: async ({ title, description, experimentFile, noInteraction }) => {
      let userInput = { title, description };

      if (!noInteraction) {
        userInput = await interactions.init(userInput);
        if (userInput === null) {
          return;
        }
        console.log();
      }

      await handleErrors(() => require("./commands").init(experimentFile, userInput));
    },
  })

  .command({
    command: "run [experiment-file]",
    desc:
      "Build the specified experiment, start a local development server, and watch for " +
      "changes to the source files. " +
      "Once a source file is modified, update the build and any browser window " +
      "running the experiment.",
    builder: (yargs) => {
      addExperimentFileOption(yargs);
    },
    handler: ({ experimentFile }) => handleErrors(() => require("./commands").run(experimentFile)),
  })

  .command({
    command: "build [experiment-file] [options]",
    desc:
      "Build the specified experiment for deployment. " +
      "The resulting zip archive contains all the files required to serve the experiment on any machine. " +
      "If the --jatos flag is set, package the experiment for JATOS instead.",
    builder: (yargs) => {
      addExperimentFileOption(yargs);
      yargs.option("jatos", {
        alias: "j",
        type: "boolean",
        description:
          "Package the experiment for JATOS. " +
          "The resulting jzip file can then be imported as a JATOS study by JATOS.",
      });
    },
    handler: ({ experimentFile, jatos }) =>
      handleErrors(() => require("./commands").build(experimentFile, jatos)),
  })

  .completion(
    "completion",
    "Output a completion script for your .bashrc",
    function (current, argv, completionFilter, done) {
      if (argv._.some((arg) => ["run", "build", "jatos"].includes(arg))) {
        // Add suggestions for experiment files to the default completions
        completionFilter((err, defaultCompletions) => {
          done([
            ...defaultCompletions.filter((completion) => completion !== "--version"),
            ...require("glob")
              .sync(`src/${current}*.js`, { nodir: true })
              .map((path) => path.substring(4, path.length - 3)),
          ]);
        });
      } else {
        // Use the default completions
        completionFilter();
      }
    }
  );

module.exports.yargs = yargs;
