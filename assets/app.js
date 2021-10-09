"use strict";

import "core-js/stable";
import "regenerator-runtime/runtime";

import { run } from "JsPsychBuilderCurrentExperiment"; // webpack alias for the main experiment file

const { assetPaths } = JSPSYCH_BUILDER_CONFIG; // Injected by webpack

// Create common jsPsych configuration
const initOptions = {
  preload_images: assetPaths.images,
  preload_audio: assetPaths.audio,
  preload_video: assetPaths.video,
};

if (typeof jatos === "undefined") {
  // Experiment is run locally
  run({
    initOptions,
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
  }).then((jsPsych) => {
    if (jsPsych) {
      jsPsych.data.displayData();
    }
  });
} else {
  // Experiment is served by JATOS
  jatos.onLoad(async () => {
    const jsPsych = await run({
      initOptions,
      environment: "jatos",
      input: jatos.studyJsonInput,
    });

    if (jsPsych) {
      jatos.submitResultData(jsPsych.data.get().json(), jatos.startNextComponent);
    }
  });
}
