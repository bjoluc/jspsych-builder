#!/usr/bin/env node
"use strict";

const updateNotifier = require("update-notifier");
const cli = require("./cli");
const pkg = require("../package.json");

// Notify about updates at the end
updateNotifier({ pkg }).notify();

// Run the program
cli.yargs.argv;
