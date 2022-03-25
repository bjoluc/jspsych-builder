"use strict";

import "core-js/stable/index.js";
import "regenerator-runtime/runtime.js";

import { run } from "JsPsychBuilderCurrentExperiment"; // webpack alias for the main experiment file

const options = JSPSYCH_BUILDER_OPTIONS; // Injected by webpack

if (typeof jatos === "undefined") {
  // Experiment is run locally
  run({
    environment: process.env.NODE_ENV === "production" ? "production" : "development",
    ...options,
  }).then((jsPsych) => {
    if (jsPsych) {
      jsPsych.data.displayData();
    }
  });
} else {
  // Experiment is served by JATOS
  jatos.onLoad(async () => {
    const jsPsych = await run({
      environment: "jatos",
      input: jatos.studyJsonInput,
      ...options,
    });

    if (jsPsych) {
      jatos.submitResultData(jsPsych.data.get().json(), jatos.startNextComponent);
    }
  });
}
