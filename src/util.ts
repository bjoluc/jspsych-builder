import { readFileSync } from "fs";

import { diff } from "deep-diff";
import glob from "glob-promise";
import { extract, parse } from "jest-docblock";

/**
 * Parses and returns the docblock pragma data from a specified file
 *
 * @param {string} filePath The path of the file to parse the data from
 */
export function loadDocblockPragmas(filePath: string) {
  const fileContents = readFileSync(filePath).toString();
  return parse(extract(fileContents));
}

/**
 * Given two objects a and b, returns a set of top-level keys that have been modified, added, or
 * deleted in b, compared to a.
 */
export function getDifferingKeys(a: Record<string, any>, b: Record<string, any>) {
  const changedKeys = new Set<string>();
  const result = diff(a, b);
  if (result) {
    for (let property of result) {
      if (property.path) {
        changedKeys.add(property.path[0]);
      }
    }
  }
  return changedKeys;
}

export type AssetPaths = {
  images: string[];
  audio: string[];
  video: string[];
  misc: string[];
};

/**
 * Given the docblock pragmas from the experiment file, extracts the specified image, audio, and
 * video directories and returns an object containing the respective paths.
 */
export function getAssetDirectories(pragmas: Record<string, string>): AssetPaths {
  const splitDirectoriesString = (assetDirsString: string) =>
    assetDirsString?.split(",").map((dir) => "media/" + dir) ?? [];

  return {
    images: splitDirectoriesString(pragmas.imageDir),
    audio: splitDirectoriesString(pragmas.audioDir),
    video: splitDirectoriesString(pragmas.videoDir),
    misc: splitDirectoriesString(pragmas.miscDir),
  };
}

/**
 * Given the object returned by `getAssetDirectories()`, reads the specified directories recursively
 * and returns an object containing the respective file paths.
 */
export async function getAssetPaths(assetDirectories: AssetPaths): Promise<AssetPaths> {
  const resolvePaths = async (directories?: string[]) =>
    directories
      ? (await Promise.all(directories.map((dir) => glob(dir + "/**/*", { nodir: true })))).flat()
      : [];

  return Object.fromEntries(
    await Promise.all(
      Object.entries(assetDirectories).map(async ([type, dirs]) => [type, await resolvePaths(dirs)])
    )
  );
}
