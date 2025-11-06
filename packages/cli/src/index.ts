#! /usr/bin/env bun
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createCommand } from './commands/create';
import { oldSimulateCommand } from './commands/oldSimulate';
import { registerCommand } from './commands/register';
import { runCommand } from './commands/run';
import { simulateCommand } from './commands/simulate';
import { uploadCommand } from './commands/upload';
import { validateCommand } from './commands/validate';

yargs(hideBin(process.argv))
  .scriptName('thyme')
  .command(createCommand)
  .command(registerCommand)
  .command(runCommand)
  .command(uploadCommand)
  .command(validateCommand)
  .command(simulateCommand)
  .command(oldSimulateCommand)
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .parse();
