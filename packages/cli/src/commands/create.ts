import type { CommandModule } from 'yargs';
import { create } from './create/create';

export const createCommand: CommandModule = {
  command: 'create <name>',
  describe:
    'Create a new Thyme project or function. If run in an existing project, creates a new function. Otherwise, creates a new project.',
  builder: (yargs) =>
    yargs
      .positional('name', {
        description:
          'Name of the project (if creating new project) or function (if in existing project)',
        type: 'string',
        demandOption: true,
      })
      .option('path', {
        alias: 'p',
        description:
          'Path where to create the project or function (default: current directory)',
        type: 'string',
        default: './',
      })
      .option('template', {
        alias: 't',
        description: 'Template type to use (default: default)',
        type: 'string',
        default: 'default',
      }),
  handler: async (argv) => {
    try {
      await create({
        name: argv.name as string,
        path: (argv.path as string) || './',
        template: (argv.template as string) || 'default',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Error:', errorMessage);
      process.exit(1);
    }
  },
};
