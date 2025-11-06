import { validateSchema } from '@bnhpio/thyme-sdk/task/schema';
import { simulateTask } from '@bnhpio/thyme-sdk/task/transaction';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import path from 'path';
import { type Address, createPublicClient, formatEther, http } from 'viem';
import type { CommandModule } from 'yargs';
import z from 'zod';
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

  const schemaModule: { schema: z.ZodSchema } = await import(schemaPath);
  const jsonSchema = z.toJSONSchema(schemaModule.schema, {
    target: 'openapi-3.0',
  });
  const schemaContent = JSON.stringify(jsonSchema, null, 2);
  // validate schema
  const argsJSON = await readFile(argsPath, 'utf-8');

  const isValid = await validateSchema(schemaContent, argsJSON);
  if (!isValid) {
    console.error('Invalid schema');
    process.exit(1);
  }

  const source = await import(sourcePath);
  const parsedArgs = JSON.parse(argsJSON);

  const toml = await parseToml(
    path.join(process.cwd(), 'untl.toml'),
    parseEnvFile(options.envFile),
    options.profile,
  );

  const simulateResult = await simulateTask({
    runner: source.default,
    options: {
      account: toml.publicKey as Address,
      rpcUrl: toml.rpcUrl,
    },
    context: {
      userArgs: parsedArgs,
      secrets: undefined,
    },
  });

  if (!simulateResult) {
    console.error('Error simulating transaction:');
    process.exit(1);
  }

  const isFailed = simulateResult.results.some(
    (result) => result.status === 'failure',
  );
  if (isFailed) {
    console.error('Transaction failed:');
    console.error(
      simulateResult.results.map((result) => result.error).join('\n'),
    );
    process.exit(1);
  }
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
