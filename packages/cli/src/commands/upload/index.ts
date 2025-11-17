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
        description:
          'Authentication token (optional if set via "thyme auth <token>")',
        type: 'string',
        alias: 'a',
        demandOption: false,
      })
      .option('organizationId', {
        description:
          'Organization ID (optional - will prompt for selection if not provided)',
        type: 'string',
        alias: 'o',
        demandOption: false,
      })
      .option('env', {
        description:
          'Environment file to use for the upload in root of the project (default: .env)',
        type: 'string',
        default: '.env',
      }),
  handler: async (argv) => {
    const functionName = argv.function as string;
    const options: UploadOptions = {
      authToken: argv.authToken as string | undefined,
      organizationId: argv.organizationId as string | undefined,
      envFile: (argv.env as string) || '.env',
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
