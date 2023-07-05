# jsPsych Builder

[![npm (tag)](https://img.shields.io/npm/v/jspsych-builder/latest)](https://www.npmjs.com/package/jspsych-builder)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/bjoluc/jspsych-builder/build.yml)](https://github.com/bjoluc/jspsych-builder/actions)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

A CLI utility to easily develop and package [jsPsych](https://www.jspsych.org/) experiments.

Focus on writing your timeline – let jsPsych Builder do the rest.

## Motivation

[jsPsych](https://www.jspsych.org/) can be loaded in three different ways:
Via a CDN, via standalone scripts, or via NPM (ES6).
The latter option, while very convenient, is the hardest to manually set up.
jsPsych Builder solves this by internally configuring common development tools (webpack, Babel, etc.) and exposing them via a simple CLI. Most notably, it:

- sets up the HTML markup
- provides a development mode with automated browser refreshing (using webpack-dev-server)
- provides [Sass](https://sass-lang.com/) support
- helps with media preloading for custom plugins (by compiling lists of file paths to be preloaded)
- transpiles, bundles, and minifies scripts to guarantee wide browser compatibility and short loading times (using webpack and Babel)
- provides TypeScript and React support – simply rename your files to `*.ts`, `*.tsx`, or `*.jsx`.
- supports module-style imports of non-module plugins from `@jspsych-contrib`
- offers to bundle all the required files for deployment, yielding a zip archive
- offers to package experiments for [JATOS](https://www.jatos.org/)

## Requirements

jsPsych Builder requires [Node.js](https://nodejs.org) >= 14 to be installed on your machine.

## Getting started

> **Attention:** Starting with version 3, jsPsych Builder exclusively supports jsPsych v7. If you need to work with jsPsych v6, consider using jsPsych Builder [v2.1.0](https://github.com/bjoluc/jspsych-builder/tree/v2.1.0) via `npx jspsych-builder@v2 init`.

Create a new directory, open it in a terminal, and issue

```bash
npx jspsych-builder init
```

This will ask you a few questions and set up a new jsPsych project for you.
Within that project, jsPsych Builder installs itself as a development dependency, so no global package installation is required.

Once the project has been initialized, you can run `npm start` to start a development server for your experiment.
You may then open http://localhost:3000/ to see your experiment in action.
Whenever you make changes to your source files, the experiment will be updated in the browser as well.

Experiments built with jsPsych Builder adhere to the following directory structure:

```
├── assets
├── node_modules
├── package.json
├── package-lock.json
├── src
│   └── experiment.js
└── styles
    └── main.scss
```

`assets` is the place for your media files, where you are free to add nested directories.
`package.json` and `package-lock.json` are files created and maintained by npm, a JavaScript package manager.
You should leave them in place, as well as `node_modules`, the directory into which npm installs packages.
This is also where jsPsych has been saved to.

The `src` directory is where you write your actual experiments, and `styles` is the place for your custom stylesheets.
Within `src`, there can be multiple experiment files, as well as arbitrary directories and JavaScript files that you can `import` in your experiment files.
`experiment.js` is just the default name for the first experiment file.
All jsPsych Builder commands take an `experiment-file` argument to specify which experiment file shall be used.
By default, that option is set to `experiment`.
Changing it to `my-experiment` (for instance via `npm start my-experiment`) would make jsPsych Builder load the `src/my-experiment.js` file instead of `src/experiment.js`.
This allows you to have multiple related experiments in one place and share code between them.

## Writing experiments

If you are new to jsPsych, you might take a look at the jsPsych [demo experiment tutorial](https://www.jspsych.org/latest/tutorials/rt-task/#part-2-display-welcome-message).
Note that the tutorial [loads jsPsych via a CDN](https://www.jspsych.org/latest/tutorials/hello-world/#option-1-using-cdn-hosted-scripts).
You will have to `npm install` and import plugins instead, similar to the [NPM version of the hello-world tutorial](https://www.jspsych.org/latest/tutorials/hello-world/#option-3-using-npm)

### Experiment files

Experiment files need to export an asynchronous `run` function that initializes a JsPsych instance, runs the experiment with it, and optionally returns the JsPsych instance at the end.
You can check the [experiment template file](assets/template/src/experiment.tmpl.js) for an example.
If the `run` function returns the JsPsych instance, jsPsych Builder will display the results in the browser window at the end (or save them to JATOS when an experiment is served by JATOS).
Remove the `return` statement from the `run` function if you don't want jsPsych Builder to handle result data.

The top of the experiment file contains a special section ("docblock") with meta information ("pragmas").
This is where you specify the title, description, and version of your experiment, as well as any asset files and directories.

### Assets

The `@assets` pragma allows to include arbitrary asset files (like images, videos, etc.) in the build to use them in your experiment.
The default value

```
@assets assets/
```

includes all files within the `assets` directory.
You can also list individual files and directories, separated by commas.
For instance,

```
@assets assets/my-experiment,assets/fixmark.png,test.html
```

would include all files within `assets/my-experiment`, as well as `assets/fixmark.png`, and `test.html`.

The paths of all matched `asset` files are provided to the `run` function via the `assetPaths` parameter.
They are grouped by their media type (`images`, `video`, `audio`, `misc`), so you can preload media files with jsPsych's [preload plugin](https://www.jspsych.org/latest/plugins/preload/) if you need to.

> Migration notice:
>
> If you were previously using the `@imagesDir`, `@audioDir`, `@videoDir`, and `@miscDir` pragmas, you can migrate to the `@assets` pragma as shown in the following example:
>
> ```diff
> - @imagesDir images
> - @audioDir audio/common,audio/my-experiment
> + @assets media/images,media/audio/common,media/audio/my-experiment
> ```
>
> Note that `@assets` doesn't prefix paths with `media/` like the deprecated `@...Dir` pragmas did.

### Styles

You can write your style sheets using plain CSS or [Sass](https://sass-lang.com/) (.scss).
You may also import style sheets from node packages.
Note that you have to `import` your styles (or a root style sheet that imports the others) within your experiment file to make the build system include them.

## Packaging experiments

Once you have finished an experiment, you can run `npm run build`.
This will create a zip file containing all the files required to serve the experiment on any machine.
If you want to serve your experiment using [JATOS](https://www.jatos.org/), run `npm run jatos` instead to create a JATOS study file (`.jzip`) that can be imported via the JATOS web interface.

## Installing the jsPsych Builder CLI globally

In case you'd like to have direct access (without `npx` or NPM scripts) to the jsPsych Builder CLI, you can also install jsPsych Builder globally.
Depending on your system configuration, you may need admin rights to do so:

```bash
npm install -g jspsych-builder
```

If you are working on Linux or OSX and bash is your shell, you may enable command completion by running
`jspsych completion >> ~/.bashrc` (Linux) or `jspsych completion >> ~/.bash_profile` (OSX).

A detailed list of sub commands and their respective options can be displayed by running `jspsych` without any options, or `jspsych --help` with the name of a sub command.

## Customizing the webpack configuration

> If you decide to take this path, be aware that even minor and patch releases of jsPsych Builder may break your setup, since the webpack config can be subject to change without notice – you have been warned!

If you need to, you can customize jsPsych Builder's internal [webpack configuration](https://webpack.js.org/configuration/) to fit your needs:
In the root directory of your project (next to your `package.json`), create a `builder.config.mjs` file containing

```js
/** @param {import("webpack").Configuration} config */
export function webpack(config) {
  return config;
}
```

The function that you export gets the webpack config that jsPsych Builder has assembled internally.
You can modify it and return your modified version so jsPsych Builder will use it instead of its own config.
Similarly, if you need to alter webpack's [DevServer configuration](https://webpack.js.org/configuration/dev-server/), you can do so via

```js
/** @param {import("webpack-dev-server").Configuration} devServerConfig */
export function webpackDevServer(devServerConfig) {
  return devServerConfig;
}
```

in `builder.config.mjs`.
