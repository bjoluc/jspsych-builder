#!/usr/bin/env node

import { strict as assert } from "assert";

import axios from "axios";
import delay from "delay";
import { execa } from "execa";
import shell from "shelljs";

function execute(...args) {
  const proc = execa("../../dist/index.js", ...args);
  proc.stdout.pipe(process.stdout);
  return proc;
}

const logHeader = (title) => console.log(`\n=== ${title} ===\n`);
const logTaskHeader = (name) => logHeader(`Running '${name}'`);

(async () => {
  try {
    shell.cd("tests");

    shell.echo("Starting story test");

    shell.echo('Resetting "story" directory');
    shell.rm("-rf", "story");
    shell.mkdir("story");
    shell.cd("story");

    logTaskHeader("jspsych init");
    await execute([
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
    const proc = execute(["run", "my-experiment"]);

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
    await execute(["build", "my-experiment"]);
    checkForBuiltPackage("my-experiment_0.1.0.zip");

    logTaskHeader("jspsych build --jatos");
    await execute(["build", "--jatos", "my-experiment"]);
    checkForBuiltPackage("my-experiment_0.1.0.jzip");

    logHeader("Testing user config support");
    for (const [suffix, configFileContents] of Object.entries({
      js: `module.exports.webpack = (config) => { console.log("Hello from js config"); return config; };`,
      cjs: `module.exports.webpack = (config) => { console.log("Hello from cjs config"); return config; };`,
      mjs: `export const webpack = (config) => { console.log("Hello from mjs config"); return config; };`,
    })) {
      const configFilename = "builder.config." + suffix;
      console.log(`${configFilename}\n`);
      shell.ShellString(configFileContents).to(configFilename);

      assert(
        (await execute(["build", "my-experiment"])).stdout.includes(`Hello from ${suffix} config`)
      );

      shell.rm(configFilename);
      console.log();
    }

    console.log("\nStory test passed");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  shell.cd("..");
  shell.rm("-rf", "story");
  process.exit(0); // Do not wait for the timeout set by delay() above
})();
