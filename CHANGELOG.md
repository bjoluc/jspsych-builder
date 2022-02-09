# Changelog

All notable changes to this project will be documented in this file. See
[Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [4.1.2](https://github.com/bjoluc/jspsych-builder/compare/v4.1.1...v4.1.2) (2022-02-09)


### Bug Fixes

* **Dependencies:** Update dependency versions and replace outdated dependencies ([67d78c0](https://github.com/bjoluc/jspsych-builder/commit/67d78c006d57d1b836daa28cb62a047da9a94c4f))

### [4.1.1](https://github.com/bjoluc/jspsych-builder/compare/v4.1.0...v4.1.1) (2021-12-13)


### Bug Fixes

* Fix file paths on Windows – thanks @Haffi921! ([#12](https://github.com/bjoluc/jspsych-builder/issues/12)) ([e8e6184](https://github.com/bjoluc/jspsych-builder/commit/e8e6184e8a6867f4d2d6a470c1e40a173b3affad)), closes [#11](https://github.com/bjoluc/jspsych-builder/issues/11) [#11](https://github.com/bjoluc/jspsych-builder/issues/11)

## [4.1.0](https://github.com/bjoluc/jspsych-builder/compare/v4.0.1...v4.1.0) (2021-11-27)


### Features

* Add TypeScript and React support ([3668350](https://github.com/bjoluc/jspsych-builder/commit/36683504a34ab470d90bbd7570ead67a1e598d7c)), closes [#10](https://github.com/bjoluc/jspsych-builder/issues/10)


### Bug Fixes

* **Template:** Fix `jatos` script in `package.json` ([1a0db16](https://github.com/bjoluc/jspsych-builder/commit/1a0db16857ce8b076d7dd186334799d267d21d9e))
* **Template:** Set `private` flag in `package.json` ([533fa1a](https://github.com/bjoluc/jspsych-builder/commit/533fa1a52b8c32501bd1e2aaecb72a1ab1f18c24))

### [4.0.1](https://github.com/bjoluc/jspsych-builder/compare/v4.0.0...v4.0.1) (2021-10-10)


### Bug Fixes

* Fix asset paths compilation ([03499f9](https://github.com/bjoluc/jspsych-builder/commit/03499f9bac7b5ca391ae1101d126a8208bd02f8d))

## [4.0.0](https://github.com/bjoluc/jspsych-builder/compare/v3.0.0...v4.0.0) (2021-10-10)


### ⚠ BREAKING CHANGES

* The `initOptions` argument to the `run()` function has been replaced by
`assetPaths`, since preloading is no longer supported via init options since jsPsych v6.3.0.
Please refer to the [experiment file template](assets/template/src/experiment.tmpl.js) for
an up-to-date usage example.

### Bug Fixes

* Replace `initOptions` `run()` argument by `assetPaths` ([78a8687](https://github.com/bjoluc/jspsych-builder/commit/78a8687b42d2883f284244b1d2e0a0acb3117d6f))

## [3.0.0](https://github.com/bjoluc/jspsych-builder/compare/v2.1.0...v3.0.0) (2021-10-09)


### ⚠ BREAKING CHANGES

* **CLI:** The `jspsych jatos` command is no longer supported. Please use `jspsych build
--jatos` instead.
* Instead of a `createTimeline` function, experiment files are now expected to
export an async `run` function that initializes jsPsych and runs the experiment.
Please refer to the [experiment template file](assets/template/src/experiment.tmpl.js)
for an example. Furthermore, jsPsych Builder no longer handles named exports other than `run`,
and the jsPsych style sheet is not automatically imported anymore.
* **Dependencies:** The minimum supported Node.js version is now v14

### Features

* **CLI:** Remove `jspsych jatos` alias ([6f778e2](https://github.com/bjoluc/jspsych-builder/commit/6f778e22f93c8bb2d9d050cd977682547a3429f9))
* **CLI:** Slim down `jspsych run` console output ([7231cdf](https://github.com/bjoluc/jspsych-builder/commit/7231cdfc8ab378b1e34eab604da243a57770f99d))
* **Development mode:** Show fullscreen overlays for errors/warnings ([974cfa5](https://github.com/bjoluc/jspsych-builder/commit/974cfa58cba2ec2c5af4deabcc0fe96ebc0443f3))
* Support jsPsych v7 ([ba8725e](https://github.com/bjoluc/jspsych-builder/commit/ba8725e795567da7701cd9733f14a58a8e49abf8))


### Miscellaneous Chores

* **Dependencies:** Update dependencies ([829f95f](https://github.com/bjoluc/jspsych-builder/commit/829f95fe6fba27a3dfded3455feca2994aa3870c))

## [2.1.0](https://github.com/bjoluc/jspsych-builder/compare/v2.0.0...v2.1.0) (2021-05-11)


### Features

* **CLI:** Implement shell completion for the [experiment-file] option ([6f64ac0](https://github.com/bjoluc/jspsych-builder/commit/6f64ac06fb7a6f720a399fd32d9e8debb4d4a65e))

## [2.0.0](https://github.com/bjoluc/jspsych-builder/compare/v1.4.2...v2.0.0) (2021-02-11)


### ⚠ BREAKING CHANGES

* Node.js v10 is no longer supported.

### Bug Fixes

* Require Node.js >=v12 ([61e2fd3](https://github.com/bjoluc/jspsych-builder/commit/61e2fd3337080e474081c4790ced29df1dd0ee37))

### [1.4.2](https://github.com/bjoluc/jspsych-builder/compare/v1.4.1...v1.4.2) (2021-02-05)


### Bug Fixes

* **Template:** Set the version pragma to `0.1.0` for new experiments ([039abc0](https://github.com/bjoluc/jspsych-builder/commit/039abc07f2511094d1d093c160db3b22d3342aee))
* **Template:** Update jsPsych version to v6.2.0 ([699d166](https://github.com/bjoluc/jspsych-builder/commit/699d166d50534e6964ea6ec83330f9edf5cdcb61))

### [1.4.1](https://github.com/bjoluc/jspsych-builder/compare/v1.4.0...v1.4.1) (2020-10-23)


### Bug Fixes

* **webpack:** Revert to webpack v4 until v5 is more stable ([855d686](https://github.com/bjoluc/jspsych-builder/commit/855d6867c4a55090208f717b4a99f57e45fee71a))

## [1.4.0](https://github.com/bjoluc/jspsych-builder/compare/v1.3.0...v1.4.0) (2020-10-23)


### Features

* **`run` command:** Implement asset watching ([dd9fa09](https://github.com/bjoluc/jspsych-builder/commit/dd9fa09c5cb75b85bcad2e5a2869b5961aec8e72)), closes [#5](https://github.com/bjoluc/jspsych-builder/issues/5)
* **`run` command:** Implement pragma watching ([835835a](https://github.com/bjoluc/jspsych-builder/commit/835835a0e403c7bd977f4d6e5b93d53bc37edf69)), closes [#5](https://github.com/bjoluc/jspsych-builder/issues/5)

## [1.3.0](https://github.com/bjoluc/jspsych-builder/compare/v1.2.1...v1.3.0) (2020-09-19)


### Features

* **CLI:** Enhance CLI (arguments, help messages, bash completion) ([4e7512b](https://github.com/bjoluc/jspsych-builder/commit/4e7512ba01990ae58f1a70a32ef434e14ca149cf))
* **CLI:** Improve error presentation ([3df327c](https://github.com/bjoluc/jspsych-builder/commit/3df327ce43e6268d2bdc26e1d210ca91d50282b2))

### [1.2.1](https://github.com/bjoluc/jspsych-builder/compare/v1.2.0...v1.2.1) (2020-09-18)


### Bug Fixes

* **Template:** Use jsPsych GitHub repo in package.json ([a74be9c](https://github.com/bjoluc/jspsych-builder/commit/a74be9c6d15377c0349aa327a64c10f251b31ac7))
* **Webpack Config:** Increase size warning threshold ([a0cab37](https://github.com/bjoluc/jspsych-builder/commit/a0cab37f3c837d6d9157cd5613689c9bd0134aa7))

## [1.2.0](https://github.com/bjoluc/jspsych-builder/compare/v1.1.0...v1.2.0) (2020-04-30)


### Features

* **Experiments:** Support inclusion of arbitrary files via `@miscDir` ([e698c18](https://github.com/bjoluc/jspsych-builder/commit/e698c18c0767eb52146c1fec3bc14cd7abdd7344))

## [1.1.0](https://github.com/bjoluc/jspsych-builder/compare/v1.0.2...v1.1.0) (2020-04-23)


### Features

* **`init` command:** Include `jspsych-builder` as local dev dependency ([2726171](https://github.com/bjoluc/jspsych-builder/commit/2726171d3cbb1577cc551f272035c0e6d6a74c9e))
* **CLI:** Add update notification using `update-notifier` ([7b21875](https://github.com/bjoluc/jspsych-builder/commit/7b218752c5c3aa4a146032e2eaebdfff900e49e4))
* **Experiments:** Support custom `on_finish` and `on_finish_jatos` functions ([6f11826](https://github.com/bjoluc/jspsych-builder/commit/6f11826470108f3ef58128e556d76e2b647b535e))


### Bug Fixes

* **`init` command:** Optionally include `-e` option in success message ([823db5b](https://github.com/bjoluc/jspsych-builder/commit/823db5b45b27f3d39bae45f0c250232347d1e230))
* **CLI:** Throw error if required pragma is missing in experiment file ([e3d5db3](https://github.com/bjoluc/jspsych-builder/commit/e3d5db3dddb170c9529449035d5cfd242a5aa8c2))

### [1.0.2](https://github.com/bjoluc/jspsych-builder/compare/v1.0.1...v1.0.2) (2020-04-22)


### Bug Fixes

* **Assets:** Fix asset resolution ([43d51be](https://github.com/bjoluc/jspsych-builder/commit/43d51be2a0d781d83d981131fa72dce24c8313ee))

### [1.0.1](https://github.com/bjoluc/jspsych-builder/compare/v1.0.0...v1.0.1) (2020-04-22)


### Bug Fixes

* **dependencies:** Replace `node-sass` with `sass` ([c38c5e4](https://github.com/bjoluc/jspsych-builder/commit/c38c5e4eb585a2f02e44749f249728c6f329e63e))

## 1.0.0 (2020-04-22)


### Features

* Initial release ([daaed3b](https://github.com/bjoluc/jspsych-builder/commit/daaed3bdd4816f3b72811c2227c68e195c28fd76))
