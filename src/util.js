"use strict";

const fs = require("fs");
var glob = require("glob-promise");
const { v4: uuid } = require("uuid");
const { extract, parse } = require("jest-docblock");
const { diff } = require("deep-diff");

/**
 * Parses and returns the docblock pragma data from a specified file
 *
 * @param {string} filePath The path of the file to parse the data from
 */
exports.loadDocblockPragmas = (filePath) => {
  const fileContents = fs.readFileSync(filePath).toString();
  return parse(extract(fileContents));
};

/**
 * Given two objects a and b, returns a set of top-level keys that have been modified, added, or
 * deleted in b, compared to a.
 *
 * @param {Object} a
 * @param {Object} b
 * @returns {Set<string>}
 */
exports.getDifferingKeys = (a, b) => {
  const changedKeys = new Set();
  const result = diff(a, b);
  if (result) {
    for (let property of result) {
      changedKeys.add(property.path[0]);
    }
  }
  return changedKeys;
};

/**
 * Given the docblock pragmas from the experiment file, extracts the specified image, audio, and
 * video directories and returns an object containing the respective paths.
 */
exports.getAssetDirectories = (pragmas) =>
  Object.fromEntries(
    [
      ["images", pragmas.imageDir],
      ["audio", pragmas.audioDir],
      ["video", pragmas.videoDir],
      ["misc", pragmas.miscDir],
    ].map(([assetType, assetDirsString]) => [
      assetType,
      assetDirsString ? assetDirsString.split(",").map((dir) => "media/" + dir) : [],
    ])
  );

/**
 * Given the object returned by `getAssetDirectories()`, reads the specified directories recursively
 * and returns an object containing the respective file paths.
 */
exports.getAssetPaths = async (assetDirectories) => {
  const resolvePaths = async (directories) =>
    typeof directories === "undefined"
      ? []
      : [].concat(
          ...(await Promise.all(directories.map((dir) => glob(dir + "/**/*", { nodir: true }))))
        );

  return Object.fromEntries(
    await Promise.all(
      Object.entries(assetDirectories).map(async ([type, dirs]) => [type, await resolvePaths(dirs)])
    )
  );
};

exports.getJatosStudyMetadata = (slug, title, description, version) => {
  let study = {
    version: "3",
    data: {
      uuid: uuid(),
      title: `${title} (${version})`,
      description,
      groupStudy: false,
      linearStudy: false,
      dirName: `${slug}_${version}`,
      comments: "",
      jsonData: null,
      endRedirectUrl: null,
      componentList: [
        {
          uuid: uuid(),
          title: "jsPsych timeline",
          htmlFilePath: "index.html",
          reloadable: true,
          active: true,
          comments: "",
          jsonData: null,
        },
      ],
      batchList: [
        {
          uuid: uuid(),
          title: "Default",
          active: true,
          maxActiveMembers: null,
          maxTotalMembers: null,
          maxTotalWorkers: null,
          allowedWorkerTypes: null,
          comments: null,
          jsonData: null,
        },
      ],
    },
  };
  return study;
};
