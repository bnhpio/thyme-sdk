import { loadAndValidateSchema } from '@bnhpio/thyme-sdk/task/schema';
import { runTask } from '@bnhpio/thyme-sdk/task/transaction';
import dotenv from 'dotenv';
import path from 'path';
import type { Hex } from 'viem';
import type { CommandModule } from 'yargs';
import { parseToml } from '../utils/parseToml';

export const runCommand: CommandModule = {
  command: 'run <function>',
  describe: 'Execute a function',
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
        description: 'Run profile to use for execution (defined in untl.toml)',
        type: 'string',
        demandOption: true,
      })
      .option('env', {
        description:
          'Environment file to use for execution in root of the project (default: .env)',
        type: 'string',
        default: '.env',
      })
      .option('skip-simulation', {
        description: 'Skip simulation before execution',
        type: 'boolean',
        default: false,
      })
      .option('skip-success-callback', {
        description: 'Skip success callback after execution',
        type: 'boolean',
        default: false,
      })
      .option('skip-fail-callback', {
        description: 'Skip fail callback on execution error',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv) => {
    await run(argv.function as string, {
      args: (argv.args as string) || 'args.json',
      profile: (argv.profile as string) || 'none',
      envFile: (argv.env as string) || '.env',
      skipSimulation: argv.skipSimulation as boolean,
      skipSuccessCallback: argv.skipSuccessCallback as boolean,
      skipFailCallback: argv.skipFailCallback as boolean,
    });
  },
};

async function run(
  functionName: string,
  options: {
    args: string;
    profile: string;
    envFile: string;
    skipSimulation: boolean;
    skipSuccessCallback: boolean;
    skipFailCallback: boolean;
  },
) {
  const sourcePath = path.join(
    process.cwd(),
    'functions',
    functionName,
    'index.ts',
  );
  const schemaPath = path.join(
    process.cwd(),
    'functions',
    functionName,
    'schema.ts',
  );
  const argsPath = path.join(
    process.cwd(),
    'functions',
    functionName,
    options.args,
  );

  // Load and validate schema
  let validatedArgs: unknown;
  try {
    const validationResult = await loadAndValidateSchema({
      schemaPath,
      argsPath,
    });
    validatedArgs = validationResult.args;
  } catch (error) {
    console.error(
      'Schema validation failed:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }

  const source = await import(sourcePath);

  const toml = await parseToml(
    path.join(process.cwd(), 'untl.toml'),
    parseEnvFile(options.envFile),
    options.profile,
  );

  // Execute task
  try {
    await runTask({
      runner: source.default,
      options: {
        privateKey: toml.privateKey as Hex,
        rpcUrl: toml.rpcUrl,
        skipSimulation: options.skipSimulation,
        skipSuccessCallback: options.skipSuccessCallback,
        skipFailCallback: options.skipFailCallback,
      },
      context: {
        userArgs: validatedArgs,
        secrets: undefined,
      },
    });
  } catch (error) {
    console.error(
      'Execution failed:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

const parseEnvFile = (envFile: string): Record<string, string> => {
  const result = dotenv.config({ path: envFile });
  return result.parsed as Record<string, string>;
};
