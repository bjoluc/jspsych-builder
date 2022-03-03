/**
 * The commands module assembles the tasks from the task module and exports functions to run them.
 */

import Listr from "listr";
// @ts-expect-error No types package available
import SilentRenderer from "listr-silent-renderer";

import chalk from "chalk";
import gulp from "gulp";
import cache from "gulp-cached";
import del from "del";
import path from "path";
import { intersection } from "lodash-es";

import * as tasks from "./tasks";
import { loadDocblockPragmas, getDifferingKeys } from "./util";
import { InitInput } from "./interactions";

export async function init(experiment: string, userInput: InitInput) {
  await new Listr([tasks.compileProjectTemplate, tasks.installDependencies]).run({
    experiment,
    userInput,
  });
  console.log("\nDone! Now run " + chalk.bold("jspsych run") + " to start developing!");
}

export async function build(experiment: string, isForJatos = false) {
  const runner = new Listr([tasks.build, tasks.pack]);

  const context = await runner.run({
    experiment,
    isProduction: true,
    isForJatos,
  });
  console.log(context.message);
}

export async function run(experiment: string) {
  const ctx = await new Listr([tasks.build, tasks.webpackDevServer]).run({
    experiment,
    isProduction: false,
    isForJatos: false,
    watchAssets: true,
  });

  console.log(ctx.message);

  let watcher = ctx.assetWatcher!;
  const experimentFile = ctx.absoluteExperimentFilePath!;

  // Watch for changes to the experiment file
  gulp.watch(experimentFile, async () => {
    // Compute names of changed pragmas
    const changedPragmas = getDifferingKeys(ctx.meta!, loadDocblockPragmas(experimentFile));

    // Re-run tasks that depend on one of the changed pragmas
    if (changedPragmas.size) {
      await new Listr([tasks.prepareContext], { renderer: SilentRenderer }).run(ctx);

      if (
        intersection([...changedPragmas], ["imageDir", "audioDir", "videoDir", "miscDir"]).length
      ) {
        // Restart assets watching (delete assets and copy over again)
        watcher.close();
        del.sync(path.resolve(ctx.dist!, "media") + "/**/*");
        delete cache.caches["assets"];
        await new Listr([tasks.copyAssets], { renderer: SilentRenderer }).run(ctx);
        watcher = ctx.assetWatcher!;
      }
    }
  });
}
