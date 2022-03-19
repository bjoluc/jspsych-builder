import HtmlWebpackPlugin from "html-webpack-plugin";
import HtmlWebpackTagsPlugin from "html-webpack-tags-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import webpack, { Configuration } from "webpack";
import slash from "slash";
// import { fileURLToPath } from "url";
import path from "path";
import { BuilderContext } from "./tasks";

// Global constants
export const builderDir = slash(path.resolve(__dirname, "../"));
// export const builderDir = slash(path.resolve(fileURLToPath(import.meta.url), "../.."));
export const builderAssetsDir = builderDir + "/assets";
export const builderNodeModulesDir = builderDir + "/node_modules";

export const getWebpackConfig = (ctx: BuilderContext) => {
  let config: Configuration = {
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
    ],
    module: {
      rules: [
        {
          test: /.(j|t)sx?$/,
          exclude: /node_modules(?![\\\/]jspsych)/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-typescript", "@babel/preset-react"],
              plugins: [
                "@babel/plugin-proposal-class-properties",
                ["@babel/plugin-transform-classes", { loose: true }],
                "@babel/plugin-proposal-object-rest-spread",
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
  };

  if (ctx.isProduction) {
    config.optimization = { minimize: true };
  } else {
    config.devtool = "inline-source-map";
  }

  config = ctx.config ? ctx.config.webpack(config) : config
  return config;
};
