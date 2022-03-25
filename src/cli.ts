import chalk from "chalk";
import glob from "glob";
import yargs, { Argv } from "yargs";
import { hideBin } from "yargs/helpers";

import * as commands from "./commands";
import { packageVersion } from "./config";

/**
 * Invokes the provided callback function, catches any error and prints it to the console.
 */
async function handleErrors(callback: () => Promise<any>) {
  try {
    await callback();
  } catch (err) {
    console.error(`\n${chalk.bold(chalk.red("Error:"))}\n${(err as Error).message}`);
  }
}

/**
 * Given a yargs builder, configures an optional positional "experiment-file" argument and returns
 * the builder
 */
function addExperimentFileOption<T>(yargs: Argv<T>) {
  return yargs.positional("experiment-file", {
    alias: ["experiment", "e"],
    type: "string",
    default: "experiment",
    description:
      "The experiment file (JavaScript) to be read (within" +
      ' the "src" directory and without the ".js" suffix). ' +
      'Example: "my-experiment" resolves to "./src/my-experiment.js".',
  });
}

export const argv = yargs(hideBin(process.argv))
  // Common CLI options
  .usage("Usage: $0 <command> [options]")

  .group(["help", "version"], "General options:")
  .help("help")
  .alias("help", "h")
  .version(packageVersion)
  .alias("version", "v")

  .demandCommand()
  .recommendCommands()
  .strict()

  .command(
    "init",
    "Create a new jsPsych project in the current directory",
    {
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
    },
    async ({ title, description, experimentFile, noInteraction }) => {
      await handleErrors(() =>
        commands.init({ title, description, experimentFile, noInteraction })
      );
    }
  )

  .command(
    "run [experiment-file] [options]",
    "Build the specified experiment, start a local development server, and watch for " +
      "changes to the source files. " +
      "Once a source file is modified, update the build and any browser window " +
      "running the experiment.",
    (yargsBuilder) =>
      addExperimentFileOption(yargsBuilder).option("port", {
        alias: "p",
        type: "number",
        description: "The port that the development server should listen on.",
        defaultDescription: "the smallest port number >= 3000 available",
      }),
    ({ experimentFile, port }) => handleErrors(() => commands.run(experimentFile, port))
  )

  .command(
    "build [experiment-file] [options]",
    "Build the specified experiment for deployment. " +
      "The resulting zip archive contains all the files required to serve the experiment on any machine. " +
      "If the --jatos flag is set, package the experiment for JATOS instead.",
    (yargs) =>
      addExperimentFileOption(yargs).option("jatos", {
        alias: "j",
        type: "boolean",
        description:
          "Package the experiment for JATOS. " +
          "The resulting jzip file can then be imported as a JATOS study by JATOS.",
      }),
    ({ experimentFile, jatos }) => handleErrors(() => commands.build(experimentFile, jatos))
  )

  .completion(
    "completion",
    "Output a completion script for your .bashrc",
    // @ts-expect-error Types do not seem to provide a `completionFilter` override
    (current, argv, completionFilter, done) => {
      if ((argv._ as string[]).some((arg) => ["run", "build", "jatos"].includes(arg))) {
        // Add suggestions for experiment files to the default completions
        completionFilter((_err: any, defaultCompletions: string[]) => {
          done([
            ...defaultCompletions.filter((completion) => completion !== "--version"),
            ...glob
              .sync(`src/${current}*.@(j|t)s?(x)`, { nodir: true })
              .map((path) => path.substring(4, path.lastIndexOf("."))),
          ]);
        });
      } else {
        // Use the default completions
        completionFilter();
      }
    }
  ).argv;
