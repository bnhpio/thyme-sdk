import { squared } from '@bnhpio/thyme-sdk';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

yargs(hideBin(process.argv))
  .command(
    'square <number>',
    'Square a number',
    (yargs) =>
      yargs.positional('number', {
        description: 'The number to square',
        type: 'number',
      }),
    (argv) => console.log(squared(argv.number ?? 0)),
  )
  .parse();
