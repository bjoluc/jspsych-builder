"use strict";

import "core-js/stable/index.js";
import "regenerator-runtime/runtime.js";

import { run } from "JsPsychBuilderCurrentExperiment"; // webpack alias for the main experiment file

const options = JSPSYCH_BUILDER_OPTIONS; // Injected by webpack

if (typeof jatos === "undefined") {
  // Experiment is run locally
  console.log("I am not running in JATOS")
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
    // Get query params
    const queryParams = jatos.urlQueryParameters
    console.log(`Jatos Query: ${JSON.stringify(queryParams)}`)
    // Run the jsPsych Experiment
    const jsPsych = await run({
      environment: "jatos",
      input: jatos.studyJsonInput,
      queryParams: queryParams,
      ...options,
    });

    if (jsPsych) {
      jatos.submitResultData(jsPsych.data.get().json(), jatos.startNextComponent);
    }
  });
}
