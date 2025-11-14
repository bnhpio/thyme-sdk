import type { CommandModule } from 'yargs';
import { auth } from './auth';

export const authCommand: CommandModule = {
  command: 'auth <token>',
  describe:
    'Store authentication token in .env file. The token will be used automatically when uploading functions.',
  builder: (yargs) =>
    yargs
      .positional('token', {
        description: 'Authentication token to store',
        type: 'string',
        demandOption: true,
      })
      .option('env', {
        description: 'Environment file to use (default: .env)',
        type: 'string',
        default: '.env',
      }),
  handler: async (argv) => {
    try {
      await auth(argv.token as string, (argv.env as string) || '.env');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Error:', errorMessage);
      process.exit(1);
    }
  },
};
