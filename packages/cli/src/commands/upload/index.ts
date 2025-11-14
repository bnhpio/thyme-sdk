import type { CommandModule } from 'yargs';
import type { UploadOptions } from './types';
import { upload } from './upload';

export const uploadCommand: CommandModule = {
  command: 'upload <function>',
  describe: 'Upload a function',
  builder: (yargs) =>
    yargs
      .positional('function', {
        description: 'Function to upload',
        type: 'string',
        demandOption: true,
      })
      .option('authToken', {
        description: 'Authentication token',
        type: 'string',
        alias: 'a',
        demandOption: true,
      })
      .option('organizationId', {
        description: 'Organization ID',
        type: 'string',
        alias: 'o',
        demandOption: true,
      }),
  handler: async (argv) => {
    const functionName = argv.function as string;
    const options: UploadOptions = {
      authToken: argv.authToken as string,
      organizationId: argv.organizationId as string,
    };

    try {
      await upload(functionName, options);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Error during deployment:', errorMessage);
      process.exit(1);
    }
  },
};
