import path from 'node:path';
import { loadAndValidateSchema } from '@bnhpio/thyme-sdk/task/schema';
import { validateSimulation } from '@bnhpio/thyme-sdk/task/transaction';
import dotenv from 'dotenv';
import { type Address, createPublicClient, formatEther, http } from 'viem';
import type { CommandModule } from 'yargs';
import { parseToml } from '../utils/parseToml';

export const oldSimulateCommand: CommandModule = {
  command: 'osimulate <function>',
  describe: 'Simulates a function run',
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
    await simulate(argv.function as string, {
      args: (argv.args as string) || 'args.json',
      profile: (argv.profile as string) || 'none',
      envFile: (argv.env as string) || '.env',
    });
  },
};

async function simulate(
  functionName: string,
  options: { args: string; profile: string; envFile: string },
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

  // Simulate and validate results
  try {
    await validateSimulation({
      runner: source.default,
      options: {
        account: toml.publicKey as Address,
        rpcUrl: toml.rpcUrl,
      },
      context: {
        userArgs: validatedArgs,
        secrets: undefined,
      },
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Display chain info
  const publicClient = createPublicClient({
    transport: http(toml.rpcUrl),
  });
  const chainId = await publicClient.getChainId();
  console.log('🔍 Chain ID:', chainId);
  const gasPrice = await publicClient.getGasPrice();
  console.log(
    '🔍 Gas price:',
    Number(gasPrice),
    'wei =',
    formatEther(gasPrice),
    'ETH',
  );
}

const parseEnvFile = (envFile: string): Record<string, string> => {
  const result = dotenv.config({ path: envFile });
  return result.parsed as Record<string, string>;
};
