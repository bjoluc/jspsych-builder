# jsPsych Builder

[![npm version](https://badge.fury.io/js/jspsych-builder.svg)](https://badge.fury.io/js/jspsych-builder)
[![Build Status](https://travis-ci.com/bjoluc/jspsych-builder.svg?branch=master)](https://travis-ci.com/bjoluc/jspsych-builder)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A CLI utility to easily develop and package [jsPsych](https://www.jspsych.org/) experiments.

Focus on writing your timeline – let jsPsych Builder do the rest.

## Motivation

[jsPsych](https://www.jspsych.org/) is a JavaScript library for the creation of browser-based psychological experiments.
Developing jsPsych experiments traditionally does not require any build steps or utilities.
There is, however, a number of things that can be improved and automated, like downloading and extracting jsPsych, setting up an HTML file, configuring media preloading, and copying all the required files for deployment.

jsPsych Builder automates that, but does not stop there:
It adds a development mode with automated browser-refreshing, npm support, SASS support, transpilation and bundling of scripts to guarantee wide browser compatibility and short loading times, as well as automated packaging for [JATOS](https://www.jatos.org/).
Under the hood, jsPsych Builder uses modern web development tools including webpack and Babel.

## Requirements

jsPsych Builder requires [Node.js](https://nodejs.org) >= 10 to be installed on your machine.

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

Experiments written with jsPsych Builder adhere to the following directory structure:

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
You should leave them in place, as well as `node_modules`, the directory into which npm installs local packages.
This is also where jsPsych has been saved to.

The `src` directory is where you write your actual experiments, and `styles` is the place for your custom stylesheets.
Within `src`, there can be multiple experiment files, as well as arbitrary directories and JavaScript files that you can `import` in your experiment files.
`experiment.js` is just the default name for the first experiment file.
All `jspsych` commands take an `experiment-file` argument to specify which experiment file shall be used.
By default, that option is set to `experiment`.
Changing it to `my-second-experiment` (e.g. `jspsych run my-second-experiment`), for instance, would make jsPsych Builder load the `src/my-second-experiment.js` file instead of `src/experiment.js`.

## Writing experiments

If you are new to jsPsych, you might have a look at the jsPsych [demo experiment tutorial](https://www.jspsych.org/tutorials/rt-task/#part-2-display-welcome-message).
You can skip part 1 there, as jsPsych Builder does the job for you.

### Experiment files

Unlike plain jsPsych experiments, experiments developed with jsPsych Builder do not require you to call `jsPsych.init()` yourself, but instead let you define your timeline in an exported function `createTimeline` in the experiment's root JavaScript file.
Every other value that you export will be passed as an option to [`jsPsych.init()`](https://www.jspsych.org/core_library/jspsych-core/#jspsychinit) along with the timeline.
Note that you can use (pretty much) all the latest JavaScript features without caring about their browser support, as your code will be transpiled by Babel.

The top of the experiment file contains a special section ("docblock") with meta information ("pragmas") on your experiment.
Feel free to change these to whatever you want, but make sure the `title`, `description`, and `version` pragmas stay in place.

### jsPsych Plugins

In order to use jsPsych plugins, they need to be imported within your experiment file.
The following line, for instance, makes the build system include the `html-keyboard-response` plugin:

```js
import "jspsych/plugins/jspsych-html-keyboard-response";
```

### Media

The optional `@imagesDir`, `@audioDir`, and `@videoDir` pragmas have a special functionality.
You can specify a directory path (or a comma-separated list of paths) within the `media` directory and jsPsych Builder will recursively include all their contents in the final package.
Additionally, the paths of all the included files will be passed to `jsPsych`'s `preload_images`, `preload_audio`, and `preload_video` options, respectively.
You can override the paths passed to [`jsPsych.init()`](https://www.jspsych.org/core_library/jspsych-core/#jspsychinit) by `export`ing the respective `preload_` options yourself from your experiment file.

There may also be cases in which you want to include files that do not belong to one of the three categories above.
Therefore, jsPsych builder also accepts a `@miscDir` pragma that serves the sole purpose of adding additional directories to the package.
Again, you can specify one or multiple directory paths within the media directory.
Note that the contents of the directories specified in `@miscDir` will not be preloaded by jsPsych.

### Styles

You can write your style sheets using plain CSS or SASS (.scss).
You may also import style sheets from node packages.
Note that you have to `import` your styles (or a root style sheet that imports the others) within your experiment file to make the build system (webpack) include them.
The jsPsych stylesheet itself is imported by default.

### Handling result data

[`jsPsych.init()`](https://www.jspsych.org/core_library/jspsych-core/#jspsychinit) supports an `on_finish` callback function that is executed when the experiment ends.
By default, jsPsych Builder defines that callback itself to display the result data in the browser window.
You can `export` `on_finish` from your experiment files to override this behavior.
When you export your experiment for JATOS, however, the `export`ed `on_finish` function will be ignored and the result data will be sent to the JATOS server instead.
If you would like to add a custom `on_finish` callback function for JATOS-served experiments, you can export an `on_finish_jatos` function which will be executed before the results are submitted to JATOS, and only when the experiment is served by JATOS.

## Packaging experiments

Once you have finished an experiment, you can run `jspsych build`.
This will create a zip file with all the files required to serve the experiment on any machine.
If you want to serve your experiment using [JATOS](https://www.jatos.org/), run `jspsych build --jatos` (or simply `jspsych jatos`) instead to create a JATOS study file (`.jzip`) that can be imported via the JATOS web interface.

## Usage of the `jspsych` command

A detailed list of sub-commands and their respective options can be displayed by running `jspsych` without any options, or `jspsych --help` with the name of a sub-command.
