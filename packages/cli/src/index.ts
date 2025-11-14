#! /usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { authCommand } from './commands/auth';
import { createCommand } from './commands/create';
import { simulateCommand } from './commands/simulate';
import { uploadCommand } from './commands/upload/index';

yargs(hideBin(process.argv))
  .scriptName('thyme')
  .command(createCommand)
  .command(authCommand)
  .command(uploadCommand)
  .command(simulateCommand)
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .parse();
