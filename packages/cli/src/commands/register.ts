import type { CommandModule } from 'yargs';

export const registerCommand: CommandModule = {
  command: 'register <function>',
  describe: 'Register a scheduled or event-triggered task',
  builder: (yargs) =>
    yargs
      .positional('function', {
        description: 'Function to register',
        type: 'string',
        demandOption: true,
      })
      .option('schedule', {
        alias: 's',
        description: 'Cron schedule expression (e.g., "0 * * * *")',
        type: 'string',
      })
      .option('event', {
        alias: 'e',
        description: 'Event trigger configuration',
        type: 'string',
      })
      .option('network', {
        alias: 'n',
        description: 'Network to deploy to',
        type: 'string',
        default: 'mainnet',
      })
      .conflicts('schedule', 'event'),
  handler: (argv) => {
    console.log(`Registering function "${argv.function}"...`);
    if (argv.schedule) {
      console.log(`Schedule: ${argv.schedule}`);
    }
    if (argv.event) {
      console.log(`Event: ${argv.event}`);
    }
    console.log(`Network: ${argv.network}`);
    // TODO: Implement task registration logic
  },
};
