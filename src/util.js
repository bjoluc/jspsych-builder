"use strict";

const fs = require("fs");
var glob = require("glob-promise");
const { v4: uuid } = require("uuid");
const { extract, parse } = require("jest-docblock");

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
 * Given the docblock pragmas from the experiment file, reads the specified image, audio, and video
 * directories recursively and returns an object containing the respective file paths.
 */
exports.getAssetPaths = async (pragmas) => {
  const resolvePaths = async (pragmaString) => {
    const directories = pragmaString.split(",");

    const paths = [];
    await Promise.all(
      directories.map(async (dir) => {
        const matches = await glob("media/" + dir + "/**/*", { nodir: true });
        paths.push(...matches);
      })
    );
    return paths;
  };

  const assetPaths = {};
  await Promise.all(
    [
      ["images", pragmas.imageDir],
      ["audio", pragmas.audioDir],
      ["video", pragmas.videoDir],
    ].map(async ([assetType, assetDirs]) => {
      assetPaths[assetType] = typeof assetDirs == "undefined" ? [] : await resolvePaths(assetDirs);
    })
  );
  return assetPaths;
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
