#!/usr/bin/env node

const cli = require("./cli");

// Run the program
cli.program.parseAsync(process.argv);
