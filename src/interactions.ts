import chalk from "chalk";
import inquirer from "inquirer";

export type InitInput = { title: string; description: string };

async function getConfirmation(message: string) {
  return (
    await inquirer.prompt<{ confirmed: boolean }>([
      { type: "confirm", name: "confirmed", message, default: true },
    ])
  ).confirmed;
}

export async function init(defaults: Partial<InitInput>) {
  console.log(chalk.bold("Welcome to jsPsych-builder!"));
  console.log("This command will set up a new jsPsych experiment in the current directory.");

  if (!(await getConfirmation("Do you want to continue?"))) {
    return;
  }

  const response = await inquirer.prompt<InitInput>(
    [
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
    ],
    defaults
  );

  if (
    !(await getConfirmation("jsPsych-builder is ready to initialize your experiment. Continue?"))
  ) {
    return;
  }

  return response;
}
