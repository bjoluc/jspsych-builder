import "core-js/stable";
import "regenerator-runtime/runtime";

import "JsPsychJs"; // webpack alias for jspsych from the cwd node_modules
import "JsPsychCss"; // webpack alias for jspsych.css from the cwd node_modules

import * as experiment from "JsPsychBuilderCurrentExperiment"; // webpack alias for the main experiment file
const { createTimeline, on_finish, on_finish_jatos, ...exportedJsPsychOptions } = experiment;

const injectedConfig = JSPSYCH_BUILDER_CONFIG; // Injected by webpack

// Create common jsPsych configuration
const jsPsychConfig = {
  preload_images: injectedConfig.assetPaths.images,
  preload_audio: injectedConfig.assetPaths.audio,
  preload_video: injectedConfig.assetPaths.video,
  ...exportedJsPsychOptions,
};

if (typeof jatos !== "undefined") {
  // Experiment is served by JATOS
  jatos.onLoad(() => {
    jsPsych.init({
      ...jsPsychConfig,
      timeline: createTimeline(jatos.studyJsonInput),
      on_finish: () => {
        if (typeof on_finish_jatos !== "undefined") {
          on_finish_jatos();
        }
        const results = jsPsych.data.get().json();
        jatos.submitResultData(results, jatos.startNextComponent);
      },
    });
  });
} else {
  // Experiment is run locally
  jsPsych.init({
    ...jsPsychConfig,
    timeline: createTimeline(),
    on_finish:
      typeof on_finish !== "undefined"
        ? on_finish
        : () => {
            jsPsych.data.displayData();
          },
  });
}
