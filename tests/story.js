#!/usr/bin/env node

import { strict as assert } from "assert";

import axios from "axios";
import delay from "delay";
import { execa } from "execa";
import shell from "shelljs";

function execute(...args) {
  const proc = execa(...args);
  proc.stdout.pipe(process.stdout);
  return proc;
}

(async () => {
  try {
    shell.cd("tests");

    shell.echo("Starting story test");

    shell.echo('Resetting "story" directory');
    shell.rm("-rf", "story");
    shell.mkdir("story");
    shell.cd("story");

    const cmd = "../../dist/index.js";

    const logTaskHeader = (name) => console.log(`\n=== Running '${name}' ===\n`);

    logTaskHeader("jspsych init");
    await execute(cmd, [
      "init",
      "-e",
      "my-experiment",
      "-n",
      "-t",
      "My Experiment",
      "-d",
      "The description",
    ]);

    logTaskHeader("jspsych run");
    const proc = execute(cmd, ["run", "my-experiment"]);

    const address = "http://localhost:3000/";

    await Promise.race([
      new Promise((resolve) => {
        proc.stdout.on("data", (chunk) => {
          if (chunk.toString().includes(address)) {
            resolve();
          }
        });
      }),
      delay(60000), // If the dev server is not up after 60 seconds, continue anyway
    ]);

    await axios.get(address); // Throw an error when the dev server is not up

    // Test asset watching
    shell.mkdir("assets/test");
    shell.touch("assets/test/1.txt");
    shell.touch("assets/test/2.txt");
    await delay(1000);
    // Verify that the new files were copied over
    await axios.get(address + "assets/test/1.txt");
    await axios.get(address + "assets/test/2.txt");

    proc.kill("SIGTERM"); // Kill the dev server

    logTaskHeader("jspsych build");

    const checkForBuiltPackage = (filename) => {
      assert(shell.test("-f", "packaged/" + filename));
      shell.rm("-r", "packaged");
    };
    await execute(cmd, ["build", "my-experiment"]);
    checkForBuiltPackage("my-experiment_0.1.0.zip");

    logTaskHeader("jspsych build --jatos");
    await execute(cmd, ["build", "--jatos", "my-experiment"]);
    checkForBuiltPackage("my-experiment_0.1.0.jzip");

    console.log("\nStory test passed");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  shell.cd("..");
  shell.rm("-rf", "story");
  process.exit(0); // Do not wait for the timeout set by delay() above
})();
