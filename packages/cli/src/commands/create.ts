import type { CommandModule } from 'yargs';

export const createCommand: CommandModule = {
  command: 'create <name>',
  describe: 'Create a new function template',
  builder: (yargs) =>
    yargs
      .positional('name', {
        description: 'Name of the function to create',
        type: 'string',
        demandOption: true,
      })
      .option('path', {
        alias: 'p',
        description: 'Path where to create the function',
        type: 'string',
        default: './',
      })
      .option('template', {
        alias: 't',
        description: 'Template type to use',
        type: 'string',
        default: 'default',
      }),
  handler: (argv) => {
    console.log(`Creating function "${argv.name}"...`);
    console.log(`Path: ${argv.path}`);
    console.log(`Template: ${argv.template}`);
    // TODO: Implement function creation logic
  },
};
