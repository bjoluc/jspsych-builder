#!/usr/bin/env node
const shell = require("shelljs");
const execa = require("execa");
const delay = require("delay");
const axios = require("axios").default;

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

    const cmd = "../../src/index.js";

    const logTaskHeader = (name) => console.log(`\n=== Running '${name}' ===\n`);

    logTaskHeader("jspsych init");
    await execute(cmd, [
      "-e",
      "my-experiment",
      "init",
      "-n",
      "-t",
      "My Experiment",
      "-d",
      "The description",
    ]);

    logTaskHeader("jspsych run");
    const proc = execute(cmd, ["-e", "my-experiment", "run"]);

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
    proc.kill("SIGTERM"); // Kill the dev server

    logTaskHeader("jspsych build");

    const checkForBuiltPackage = () => {
      if (shell.find("packaged/").length < 1) {
        console.error("No file was found in `packaged/`");
        process.exit(1);
      }
      shell.rm("-r", "packaged");
    };
    await execute(cmd, ["-e", "my-experiment", "build"]);
    checkForBuiltPackage();

    logTaskHeader("jspsych jatos");
    await execute(cmd, ["-e", "my-experiment", "jatos"]);
    checkForBuiltPackage();

    console.log("\nStory test passed");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  shell.cd("..");
  shell.rm("-rf", "story");
  process.exit(0); // Do not wait for the timeout set by delay() above
})();
