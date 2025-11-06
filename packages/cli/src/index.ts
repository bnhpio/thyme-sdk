#! /usr/bin/env bun
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createCommand } from './commands/create.js';
import { deployCommand } from './commands/deploy.js';
import { registerCommand } from './commands/register.js';
import { runCommand } from './commands/run.js';
import { simulateCommand } from './commands/simulate.js';
import { validateCommand } from './commands/validate.js';

yargs(hideBin(process.argv))
  .scriptName('thyme')
  .command(createCommand)
  .command(registerCommand)
  .command(runCommand)
  .command(deployCommand)
  .command(validateCommand)
  .command(simulateCommand)
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .parse();
