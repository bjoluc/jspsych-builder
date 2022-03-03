#!/usr/bin/env node

import updateNotifier from "update-notifier";
import { argv } from "./cli";
import { name, version } from "../package.json";

// Notify about updates at the end
updateNotifier({ packageName: name, packageVersion: version }).notify();

// Run the program
argv;
