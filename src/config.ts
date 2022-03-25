import path from "path";
import { fileURLToPath } from "url";

// @ts-expect-error
import babelPluginProposalClassProperties from "@babel/plugin-proposal-class-properties";
// @ts-expect-error
import babelPluginProposalObjectRestSpread from "@babel/plugin-proposal-object-rest-spread";
// @ts-expect-error
import babelPluginTransformClasses from "@babel/plugin-transform-classes";
// @ts-expect-error
import babelPresetEnv from "@babel/preset-env";
// @ts-expect-error
import babelPresetReact from "@babel/preset-react";
// @ts-expect-error
import babelPresetTypescript from "@babel/preset-typescript";
import { CleanWebpackPlugin } from "clean-webpack-plugin";
import CopyWebpackPlugin from "copy-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import HtmlWebpackTagsPlugin from "html-webpack-tags-plugin";
import { pick } from "lodash-es";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import { silent as resolveCwd } from "resolve-cwd";
import slash from "slash";
import { v4 as uuid } from "uuid";
import webpack, { Configuration } from "webpack";

import packageJson from "../package.json";
import { BuilderContext } from "./tasks";

// Global constants
export const packageName = packageJson.name;
export const packageVersion = packageJson.version;

export const defaultExperiment = "experiment";
export const builderDir = slash(path.resolve(fileURLToPath(import.meta.url), "../.."));
export const builderAssetsDir = builderDir + "/assets";
export const builderNodeModulesDir = builderDir + "/node_modules";
export const distPath = path.resolve(".jspsych-builder");

/**
 * Load `builder.config.js`. If the file is present, returns the module loaded from it.
 * Otherwise, returns undefined.
 */
export async function loadUserConfig() {
  const configPath =
    resolveCwd("./builder.config.js") ??
    resolveCwd("./builder.config.mjs") ??
    resolveCwd("./builder.config.cjs");
  if (configPath) {
    // Using `eval` here to bypass webpack import handling
    // (https://webpack.js.org/api/module-methods/#dynamic-expressions-in-import)
    return await eval(`import("${configPath.replaceAll('"', '\\"')}")`);
  }
}

export const getWebpackConfig = (context: BuilderContext) => {
  const config: Configuration = {
    entry: builderAssetsDir + "/app.js",
    output: {
      path: distPath,
      filename: "js/app.js",
    },
    resolve: {
      // Try cwd node_modules first, then jspsych-builder node_modules
      modules: ["node_modules", builderNodeModulesDir],
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      alias: {
        // Set the current experiment file as an alias so it can be imported in app.js
        JsPsychBuilderCurrentExperiment: context.absoluteExperimentFilePath!,
      },
    },
    resolveLoader: {
      modules: ["node_modules", builderNodeModulesDir],
    },
    plugins: [
      new MiniCssExtractPlugin({ filename: "css/[name].css" }),
      // Define a global constant with data for usage in app.js
      new webpack.DefinePlugin({
        JSPSYCH_BUILDER_OPTIONS: JSON.stringify({
          assetPaths: context.assetPaths,
          ...pick(context.pragmas!, ["title", "version"]),
        }),
      }),
      new HtmlWebpackPlugin({
        title: context.pragmas?.title! + (context.isProduction ? "" : " (Development Build)"),
        meta: {
          "X-UA-Compatible": { "http-equiv": "X-UA-Compatible", content: "ie=edge" },
          viewport: "width=device-width, initial-scale=1.0",
        },
      }),
      new HtmlWebpackTagsPlugin({
        tags: context.isForJatos ? [{ path: "/assets/javascripts/jatos.js", append: false }] : [],
      }),
      new CleanWebpackPlugin(),
    ],
    module: {
      rules: [
        {
          test: /.(j|t)sx?$/,
          exclude: /node_modules(?![\\\/]jspsych)/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [babelPresetEnv, babelPresetTypescript, babelPresetReact],
              plugins: [
                babelPluginProposalClassProperties,
                [babelPluginTransformClasses, { loose: true }],
                babelPluginProposalObjectRestSpread,
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: [{ loader: MiniCssExtractPlugin.loader }, "css-loader"],
        },
        {
          test: /\.s[ac]ss$/i,
          use: [{ loader: MiniCssExtractPlugin.loader }, "css-loader", "sass-loader"],
        },
      ],
    },
    performance: {
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    mode: context.isProduction ? "production" : "development",
    stats: {
      all: false,
      errors: true,
      warnings: true,
    },
    infrastructureLogging: {
      level: "error",
    },
  };

  if (context.isProduction) {
    config.optimization = { minimize: true };
  } else {
    config.devtool = "inline-source-map";
  }

  if (context.assetDirsList!.length + context.assetFilesList!.length > 0) {
    config.plugins?.push(
      new CopyWebpackPlugin({
        patterns: [
          ...context.assetDirsList!.map<CopyWebpackPlugin.Pattern>((directory) => ({
            from: directory,
            to: directory,
            noErrorOnMissing: true, // to prevent errors for empty directories
          })),
          ...context.assetFilesList!.map<CopyWebpackPlugin.Pattern>((file) => ({
            from: file,
            to: file,
          })),
        ],
      })
    );
  }

  return context.config ? context.config.webpack(config) : config;
};

export function getJatosStudyMetadata(
  slug: string,
  title: string,
  description: string,
  version: string
) {
  return {
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
}
