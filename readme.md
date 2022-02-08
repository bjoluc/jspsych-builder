# jsPsych Builder

[![npm (tag)](https://img.shields.io/npm/v/jspsych-builder/latest)](https://www.npmjs.com/package/jspsych-builder)
[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/bjoluc/jspsych-builder/build)](https://github.com/bjoluc/jspsych-builder/actions)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A CLI utility to easily develop and package [jsPsych](https://www.jspsych.org/) experiments.

Focus on writing your timeline – let jsPsych Builder do the rest.

**Attention:**
Starting with version 3, jsPsych Builder exclusively supports jsPsych v7.
If you need to use jsPsych v6, consider installing jsPsych Builder [v2.1.0](https://github.com/bjoluc/jspsych-builder/tree/v2.1.0) via `npm install jspsych-builder@2` instead.

## Motivation

[jsPsych](https://www.jspsych.org/) can be loaded in three different ways:
Via a CDN, via standalone scripts, or via NPM (ES6).
The latter option, while very convenient, is the hardest to manually set up.
jsPsych Builder solves this by internally configuring common development tools (webpack, Babel, etc.) and exposing them via a simple CLI. Most notably, it:
* sets up the HTML markup
* provides a development mode with automated browser refreshing (using webpack-dev-server)
* provides [SASS](https://sass-lang.com/) support
* helps with media preloading for custom plugins (by compiling lists of file paths to be preloaded)
* transpiles, bundles, and minifies scripts to guarantee wide browser compatibility and short loading times (using webpack and Babel)
* provides TypeScript and React support – simply rename your files to `*.ts`, `*.tsx`, or `*.jsx`.
* offers to bundle all the required files for deployment, yielding a zip archive
* offers to package experiments for [JATOS](https://www.jatos.org/)

## Requirements

jsPsych Builder requires [Node.js](https://nodejs.org) >= 14 to be installed on your machine.

## Installation

```bash
npm install -g jspsych-builder
```

Depending on your system configuration, you may need admin rights to do so.

If you are working on Linux or OSX and bash is your shell, you may enable command completion by running
`jspsych completion >> ~/.bashrc` (Linux) or `jspsych completion >> ~/.bash_profile` (OSX).

## Getting started

Create a new directory, open it in a terminal, and issue

```bash
jspsych init
```

This will ask you a few questions and set up a new jsPsych project for you.
Once that's done, you can run `jspsych run` to start a development server for your experiment.
You may then open http://localhost:3000/ to see your experiment in action.
Whenever you make changes to your source files, the experiment will be updated in the browser as well.

Experiments built with jsPsych Builder adhere to the following directory structure:

```
├── media
│   ├── audio
│   ├── images
│   └── video
├── node_modules
├── package.json
├── package-lock.json
├── src
│   └── experiment.js
└── styles
    └── main.scss
```

`media` contains your media files, where you are free to modify directory names and add sub directories.
`package.json` and `package-lock.json` are files created and maintained by npm, a JavaScript package manager.
You should leave them in place, as well as `node_modules`, the directory into which npm installs packages.
This is also where jsPsych has been saved to.

The `src` directory is where you write your actual experiments, and `styles` is the place for your custom stylesheets.
Within `src`, there can be multiple experiment files, as well as arbitrary directories and JavaScript files that you can `import` in your experiment files.
`experiment.js` is just the default name for the first experiment file.
All `jspsych` commands take an `experiment-file` argument to specify which experiment file shall be used.
By default, that option is set to `experiment`.
Changing it to `my-second-experiment` (e.g. `jspsych run my-second-experiment`), for instance, would make jsPsych Builder load the `src/my-second-experiment.js` file instead of `src/experiment.js`.

## Writing experiments

If you are new to jsPsych, you might take a look at the jsPsych [demo experiment tutorial](https://www.jspsych.org/latest/tutorials/rt-task/#part-2-display-welcome-message).
Note that the tutorial [loads jsPsych via a CDN](https://www.jspsych.org/latest/tutorials/hello-world/#option-1-using-cdn-hosted-scripts).
You will have to `npm install` and import plugins instead, similar to the [NPM version of the hello-world tutorial](https://www.jspsych.org/latest/tutorials/hello-world/#option-3-using-npm)

### Experiment files

Experiment files need to export an asynchronous `run` function that initializes a JsPsych instance, runs the experiment with it, and optionally returns the JsPsych instance in the end.
You can check the [experiment template file](assets/template/src/experiment.tmpl.js) for an example.
If the `run` function returns the JsPsych instance, jsPsych Builder will display the results in the browser window at the end (or save them to JATOS when an experiment is served by JATOS).
Remove the `return` statement from the `run` function if you don't want jsPsych Builder to handle result data.

The top of the experiment file contains a special section ("docblock") with meta information ("pragmas") on your experiment.
Feel free to modify these, but make sure to keep the required `title`, `description`, and `version` pragmas.

### Media

The optional `@imagesDir`, `@audioDir`, `@videoDir`, and `@miscDir` pragmas have a special functionality:
You can specify a directory path (or a comma-separated list of paths) within the `media` directory and jsPsych Builder will recursively include all their contents in the build.
Additionally, the paths of all the included files will be passed to your `run` function as an `assetPaths` argument, in case you need to preload them (e.g. using the [preload plugin](https://www.jspsych.org/latest/plugins/preload/)).

### Styles

You can write your style sheets using plain CSS or SASS (.scss).
You may also import style sheets from node packages.
Note that you have to `import` your styles (or a root style sheet that imports the others) within your experiment file to make the build system include them.

## Packaging experiments

Once you have finished an experiment, you can run `jspsych build`.
This will create a zip file containing all the files required to serve the experiment on any machine.
If you want to serve your experiment using [JATOS](https://www.jatos.org/), run `jspsych build --jatos` instead to create a JATOS study file (`.jzip`) that can be imported via the JATOS web interface.

## Usage of the `jspsych` command

A detailed list of sub commands and their respective options can be displayed by running `jspsych` without any options, or `jspsych --help` with the name of a sub command.
