/**
 * The commands module assembles tasks and interactions and exports functions to run them.
 */

// When bundled by ncc, auto registration does not work for any-observable@0.3.0 (transitive dep. of
// listr@0.14.3), hence:
import "any-observable/register/rxjs-all";

import chalk from "chalk";
import { watch } from "gulp";
import Listr from "listr";
// @ts-expect-error No types package available
import SilentRenderer from "listr-silent-renderer";

import * as interactions from "./interactions";
import * as tasks from "./tasks";
import { getDifferingKeys, loadDocblockPragmas } from "./util";

export type InitOptions = {
  title?: string;
  description?: string;
  experimentFile: string;
  noInteraction?: boolean;
};

export async function init({ title, description, experimentFile, noInteraction }: InitOptions) {
  const userInput = noInteraction
    ? { title: title!, description: description! } // TODO Title and description are required here and should be checked
    : await interactions.init({ title, description });

  if (!userInput) {
    return;
  }

  await new Listr([tasks.compileProjectTemplate, tasks.installDependencies]).run({
    experiment: experimentFile,
    userInput,
  });
  console.log("\nDone! Now run", chalk.bold("npm start"), "to start developing!");
}

export async function build(experiment: string, isForJatos = false) {
  const context = await new Listr([
    { ...tasks.build, title: `Building ${experiment}` },
    tasks.pack,
  ]).run({ experiment, isProduction: true, isForJatos });
  console.log(context.message);
}

export async function run(experiment: string, port?: number) {
  const ctx = await new Listr([
    { ...tasks.build, title: `Building ${experiment}` },
    tasks.webpackDevServer,
  ]).run({
    experiment,
    isProduction: false,
    isForJatos: false,
    devServerPort: port,
  });
  console.log(ctx.message);

  const experimentFile = ctx.absoluteExperimentFilePath!;

  // Watch for changes to the experiment file
  watch(experimentFile, async () => {
    // Compute names of changed pragmas
    const changedPragmas = getDifferingKeys(ctx.pragmas!, loadDocblockPragmas(experimentFile));

    if (changedPragmas.size > 0) {
      await ctx.devServer!.stop();

      // Rebuild and start the dev server again
      await new Listr([tasks.build]).run(ctx);
      await new Listr([tasks.webpackDevServer], { renderer: SilentRenderer }).run(ctx);
    }
  });
}
