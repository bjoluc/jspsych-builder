#!/usr/bin/env node

// When bundled by ncc, auto registration does not work for any-observable@0.3.0 (transitive dep. of
// listr@0.14.3), hence:
import "any-observable/register/rxjs-all";

import updateNotifier from "update-notifier";

import { argv } from "./cli";
import { packageName, packageVersion } from "./config";

// Notify about updates at the end
updateNotifier({ pkg: { name: packageName, version: packageVersion } }).notify();

// Run the program
argv;

// Export types for user code:
export * from "./user-types";
