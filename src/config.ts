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
import MiniCssExtractPlugin from "mini-css-extract-plugin";
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

export const getWebpackConfig = (ctx: BuilderContext) => {
  const config: Configuration = {
    entry: builderAssetsDir + "/app.js",
    output: {
      path: ctx.dist,
      filename: "js/app.js",
    },
    resolve: {
      // Try cwd node_modules first, then jspsych-builder node_modules
      modules: ["node_modules", builderNodeModulesDir],
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      alias: {
        // Set the current experiment file as an alias so it can be imported in app.js
        JsPsychBuilderCurrentExperiment: ctx.absoluteExperimentFilePath!,
      },
    },
    resolveLoader: {
      modules: ["node_modules", builderNodeModulesDir],
    },
    plugins: [
      new MiniCssExtractPlugin({ filename: "css/[name].css" }),
      // Define a global constant with data for usage in app.js
      new webpack.DefinePlugin({
        JSPSYCH_BUILDER_CONFIG: JSON.stringify({
          assetPaths: ctx.assetPaths,
        }),
      }),
      new HtmlWebpackPlugin({
        title: ctx.meta.title + (ctx.isProduction ? "" : " (Development Build)"),
        meta: {
          "X-UA-Compatible": { "http-equiv": "X-UA-Compatible", content: "ie=edge" },
          viewport: "width=device-width, initial-scale=1.0",
        },
      }),
      new HtmlWebpackTagsPlugin({
        tags: ctx.isForJatos ? [{ path: "/assets/javascripts/jatos.js", append: false }] : [],
      }),
      new CopyWebpackPlugin({
        patterns: ctx.assetDirsList!.map((directory) => ({
          from: directory,
          to: directory,
          noErrorOnMissing: true, // TODO should this stay true?
        })),
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
    mode: ctx.isProduction ? "production" : "development",
    stats: {
      all: false,
      errors: true,
      warnings: true,
    },
    infrastructureLogging: {
      level: "error",
    },
  };

  if (ctx.isProduction) {
    config.optimization = { minimize: true };
  } else {
    config.devtool = "inline-source-map";
  }

  return config;
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
