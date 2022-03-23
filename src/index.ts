#!/usr/bin/env node

import updateNotifier from "update-notifier";

import { argv } from "./cli";
import { packageName, packageVersion } from "./config";

// Notify about updates at the end
updateNotifier({ pkg: { name: packageName, version: packageVersion } }).notify();

// Run the program
argv;

// Export types for user code:
export * from "./user-types";
