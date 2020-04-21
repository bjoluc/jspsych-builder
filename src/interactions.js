"use strict";

const chalk = require("chalk");
const inquirer = require("inquirer");

module.exports.init = async (defaults) => {
  console.log(chalk.bold("Welcome to jsPsych-builder!"));
  console.log(
    "This command will set up a new jsPsych experiment in the current directory."
  );

  let confirmResponse = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: "Do you want to continue?",
      default: true,
    },
  ]);
  if (!confirmResponse.confirmed) {
    return null;
  }

  const response = await inquirer.prompt([
    {
      type: "input",
      name: "title",
      message: "Please enter the title of your new experiment",
      when: () => !defaults.title,
    },
    {
      type: "input",
      name: "description",
      message: "Please enter a short description of the experiment",
      when: () => !defaults.description,
    },
  ]);

  confirmResponse = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message:
        "jsPsych-builder is ready to initialize your experiment. Continue?",
      default: true,
    },
  ]);
  if (!confirmResponse.confirmed) {
    return null;
  }

  return { ...defaults, ...response };
};
