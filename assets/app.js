"use strict";

import "core-js/stable";
import "regenerator-runtime/runtime";

import { run } from "JsPsychBuilderCurrentExperiment"; // webpack alias for the main experiment file

const { assetPaths } = JSPSYCH_BUILDER_CONFIG; // Injected by webpack

if (typeof jatos === "undefined") {
  // Experiment is run locally
  run({
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
    assetPaths,
  }).then((jsPsych) => {
    if (jsPsych) {
      jsPsych.data.displayData();
    }
  });
} else {
  // Experiment is served by JATOS
  jatos.onLoad(async () => {
    const jsPsych = await run({
      input: jatos.studyJsonInput,
      environment: "jatos",
      assetPaths,
    });

    if (jsPsych) {
      jatos.submitResultData(jsPsych.data.get().json(), jatos.startNextComponent);
    }
  });
}
