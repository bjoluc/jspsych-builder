import { readFileSync } from "fs";
import fs from "fs/promises";

import { diff } from "deep-diff";
import { fileTypeFromFile } from "file-type";
import glob from "glob";
import { extract, parse } from "jest-docblock";
import { uniq } from "lodash-es";

import { Pragmas } from "./tasks";

/**
 * Parses and returns the docblock pragma data from a specified file
 *
 * @param {string} filePath The path of the file to parse the data from
 */
export function loadDocblockPragmas(filePath: string) {
  return parse(extract(readFileSync(filePath).toString()));
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

/**
 * Given a list of paths, returns two lists [directories, files] of directory and file paths. Throws
 * an ENOENT error if a provided path does not exist.
 */
export async function separateDirectoryAndFilePaths(paths: string[]) {
  const allStats = await Promise.all(paths.map((path) => fs.stat(path)));

  const directories = paths.filter((_, index) => allStats[index].isDirectory());
  const files = paths.filter((_, index) => allStats[index].isFile());
  return [directories, files];
}

/**
 * Returns the file paths of all (possibly nested) files in a directory.
 */
export async function resolveFilePaths(directoryPath: string) {
  return new Promise<string[]>((resolve, reject) => {
    glob(directoryPath + "/**/*", { nodir: true }, (err, files) =>
      err === null ? resolve(files) : reject(err)
    );
  });
}

export type AssetPaths = {
  images: string[];
  audio: string[];
  video: string[];
  misc: string[];
};

/**
 * Given a list of directory paths and a list of individual file paths, inspects the file extensions
 * of all (nested) files, sorts the paths into an `AssetPaths` object, and returns it.
 */
export async function getAssetPaths(directories: readonly string[], files: readonly string[]) {
  const filePaths = [...files];
  for (const directory of directories) {
    filePaths.push(...(await resolveFilePaths(directory)));
  }

  const assetPaths: AssetPaths = {
    images: [],
    audio: [],
    video: [],
    misc: [],
  };

  for (const file of uniq(filePaths).sort()) {
    const mimeType = (await fileTypeFromFile(file))?.mime;

    if (mimeType?.startsWith("image/")) {
      assetPaths.images.push(file);
    } else if (mimeType?.startsWith("audio/")) {
      assetPaths.audio.push(file);
    } else if (mimeType?.startsWith("video/")) {
      assetPaths.video.push(file);
    } else {
      assetPaths.misc.push(file);
    }
  }

  return assetPaths;
}

/**
 * Given the docblock pragmas from the experiment file, extracts the specified image, audio, and
 * video directories and returns an object containing the respective paths.
 */
export function getDeprecatedAssetDirectories(pragmas: Pragmas): AssetPaths {
  const splitDirectoriesString = (assetDirsString?: string) =>
    assetDirsString?.split(",").map((dir) => "media/" + dir) ?? [];

  return {
    images: splitDirectoriesString(pragmas.imageDir),
    audio: splitDirectoriesString(pragmas.audioDir),
    video: splitDirectoriesString(pragmas.videoDir),
    misc: splitDirectoriesString(pragmas.miscDir),
  };
}

/**
 * Given the object returned by `getDeprecatedAssetDirectories()`, reads the specified directories
 * recursively and returns an object containing the respective file paths.
 */
export async function getDeprecatedAssetPaths(assetDirectories: AssetPaths): Promise<AssetPaths> {
  const resolvePaths = async (directories?: string[]) =>
    directories ? (await Promise.all(directories.map((dir) => resolveFilePaths(dir)))).flat() : [];

  return Object.fromEntries(
    await Promise.all(
      Object.entries(assetDirectories).map(async ([type, dirs]) => [type, await resolvePaths(dirs)])
    )
  );
}
