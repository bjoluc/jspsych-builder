import { JsPsych } from "jspsych";

/**
 * Options provided by jsPsych Builder
 */
export interface RunFunctionOptions {
  /**
   * The title of the experiment, as specified in the `@title` pragma
   */
  title: string;

  /**
   * The version of the experiment, as specified in the `@version` pragma
   */
  version: string;

  /**
   * A custom object that can be specified via the JATOS web interface ("JSON study input").
   */
  input?: any;

  /**
   * The context in which the experiment is run:
   *
   * * `development` for `jspsych run`
   * * `production` for `jspsych build`
   * * `jatos` if served by JATOS (`jspsych build --jatos`)
   */
  environment: "development" | "production" | "jatos";

  /**
   * An object with lists of file paths for the respective media types (images, audio, video,
   * misc)
   */
  assetPaths: {
    images: string[];
    audio: string[];
    video: string[];
    misc: string[];
  };
}

/**
 * This function will be executed by jsPsych Builder and is expected to run the jsPsych experiment
 */
export type RunFunction = (options: RunFunctionOptions) => Promise<JsPsych | void>;
