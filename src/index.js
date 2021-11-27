#!/usr/bin/env node
"use strict";

import updateNotifier from "update-notifier";
import { argv } from "./cli.js";
import { requireJson } from "./util.js";

const pkg = requireJson("../package.json");

// Notify about updates at the end
updateNotifier({ pkg }).notify();

// Run the program
argv;
