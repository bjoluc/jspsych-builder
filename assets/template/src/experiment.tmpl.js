/**
 * @title <%= title %>
 * @description <%= description %>
 * @version 0.1
 *
 * The following lines specify which media directories will be packaged and preloaded by jsPsych.
 * Modify them to arbitrary paths within the `media` directory, or delete them.
 * @imageDir images
 * @audioDir audio
 * @videoDir video
 */

// You can import the custom stylesheets you use (.scss or .css).
import "../styles/main.scss";

// jsPsych plugins
import "jspsych/plugins/jspsych-html-keyboard-response";
import "jspsych/plugins/jspsych-fullscreen";

/**
 * This is where you define your jsPsych timeline.
 *
 * @param input A custom object that can be specified via the JATOS web interface ("JSON study
 *              input").
 */
export function createTimeline(input = {}) {
  let timeline = [];

  // Welcome screen
  timeline.push({
    type: "html-keyboard-response",
    stimulus: "<p>Welcome to <%= title %>!<p/>",
  });

  // Switch to fullscreen
  timeline.push({
    type: "fullscreen",
    fullscreen_mode: true,
  });

  return timeline;
}

// Whatever you `export` from this file will be passed to `jsPsych.init()` (except for `timeline`
// and `on_finish`)

// Note: `preload_images`, `preload_audio`, and `preload_video` will be set automatically if you
// don't export them.
