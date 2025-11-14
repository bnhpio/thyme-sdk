import type { CommandModule } from 'yargs';
import { simulate } from './simulate';

/**
 * Yargs command definition for simulating a function
 *
 * Simulates a function from the ./functions/<function> directory with
 * validated arguments and configuration from untl.toml. This command
 * validates that all transactions would succeed before execution.
 */
export const simulateCommand: CommandModule = {
  command: 'simulate <function>',
  describe: 'Simulate a function run to validate transactions before execution',
  builder: (yargs) =>
    yargs
      .positional('function', {
        description:
          'The name of the function placed in the ./functions/<function> directory',
        type: 'string',
        demandOption: true,
      })
      .option('args', {
        description:
          'Path to the arguments file in ./functions/<function> (default: args.json)',
        type: 'string',
        default: 'args.json',
      })
      .option('profile', {
        description:
          'Run profile to use for the simulation (defined in untl.toml)',
        type: 'string',
        demandOption: true,
      })
      .option('env', {
        description:
          'Environment file to use for the simulation in root of the project (default: .env)',
        type: 'string',
        default: '.env',
      }),
  handler: async (argv) => {
    try {
      await simulate(argv.function as string, {
        args: (argv.args as string) || 'args.json',
        profile: (argv.profile as string) || 'none',
        envFile: (argv.env as string) || '.env',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Simulation command failed:', errorMessage);
      process.exit(1);
    }
  },
};
