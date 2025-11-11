import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { loadAndValidateSchema } from '@bnhpio/thyme-sdk/task/schema';
import type { Runner } from '@bnhpio/thyme-sdk/task/transaction';
import { validateSimulation } from '@bnhpio/thyme-sdk/task/transaction';
import dotenv from 'dotenv';
import {
  type Address,
  createPublicClient,
  formatEther,
  http,
  isAddress,
} from 'viem';
import type { CommandModule } from 'yargs';
import { logger } from '../utils/logger';
import { parseToml } from '../utils/parseToml';

/**
 * Command options interface for the simulate command
 */
interface SimulateOptions {
  /** Path to the arguments file relative to function directory */
  args: string;
  /** Profile name from untl.toml to use for simulation */
  profile: string;
  /** Path to environment file in project root */
  envFile: string;
}

/**
 * Paths interface for function-related file paths
 */
interface FunctionPaths {
  /** Path to the function's index.ts file */
  sourcePath: string;
  /** Path to the function's schema.ts file */
  schemaPath: string;
  /** Path to the function's args file */
  argsPath: string;
  /** Base directory for the function */
  functionDir: string;
}

/**
 * Configuration interface for simulation
 */
interface SimulationConfig {
  /** Public key (address) to use for simulation */
  publicKey: Address;
  /** RPC URL for the blockchain network */
  rpcUrl: string;
}

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
      await logger().error('Simulation command failed:', errorMessage);
      process.exit(1);
    }
  },
};

/**
 * Main simulate function that orchestrates the simulation of a function
 *
 * This function:
 * 1. Validates function name and file paths
 * 2. Validates file existence and accessibility
 * 3. Loads and validates function arguments against schema
 * 4. Imports and validates the function module
 * 5. Loads and validates configuration from untl.toml
 * 6. Validates configuration values (RPC URL, public key)
 * 7. Runs simulation and validates results
 * 8. Displays chain information and gas prices
 *
 * @param functionName - Name of the function to simulate
 * @param options - Simulation options including paths, profile, and env file
 * @throws Error if validation fails or simulation encounters an error
 */
async function simulate(
  functionName: string,
  options: SimulateOptions,
): Promise<void> {
  // Validate function name to prevent path traversal
  if (!isValidFunctionName(functionName)) {
    throw new Error(
      `Invalid function name: "${functionName}". Function names must contain only alphanumeric characters, hyphens, and underscores.`,
    );
  }

  // Validate args file name to prevent path traversal
  if (!isValidFileName(options.args)) {
    throw new Error(
      `Invalid args file name: "${options.args}". File names must not contain path traversal characters (../, ./, etc.).`,
    );
  }

  // Build and validate file paths
  const paths = buildFunctionPaths(functionName, options.args);
  await validatePaths(paths);

  // Load and validate schema and arguments
  const validatedArgs = await loadAndValidateArguments(paths);

  // Import and validate function module
  const runner = await importAndValidateRunner(paths.sourcePath);

  // Load and validate configuration
  const config = await loadAndValidateConfig(options);

  // Run simulation and validate results
  await runSimulation(runner, validatedArgs, config);

  // Display chain information
  await displayChainInfo(config.rpcUrl);
}

/**
 * Validates that a function name is safe and doesn't contain path traversal characters
 *
 * @param functionName - The function name to validate
 * @returns True if the function name is valid, false otherwise
 */
function isValidFunctionName(functionName: string): boolean {
  // Allow alphanumeric, hyphens, and underscores only
  // Prevent path traversal attempts (../, ./, etc.)
  return /^[a-zA-Z0-9_-]+$/.test(functionName);
}

/**
 * Validates that a file name is safe and doesn't contain path traversal characters
 *
 * @param fileName - The file name to validate
 * @returns True if the file name is valid, false otherwise
 */
function isValidFileName(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') return false;

  // Prevent path traversal attempts (../, ./, etc.)
  // Allow alphanumeric, hyphens, underscores, dots, and forward slashes within filename
  // But disallow parent directory references
  if (fileName.includes('..') || fileName.startsWith('/')) return false;

  // Basic validation: should be a valid filename
  return fileName.length > 0 && fileName.length < 256;
}

/**
 * Builds file paths for a function's source, schema, and args files
 *
 * @param functionName - Name of the function
 * @param argsFileName - Name of the args file (default: args.json)
 * @returns Object containing all relevant file paths
 */
function buildFunctionPaths(
  functionName: string,
  argsFileName: string,
): FunctionPaths {
  const cwd = process.cwd();
  const functionDir = path.join(cwd, 'functions', functionName);

  return {
    sourcePath: path.join(functionDir, 'index.ts'),
    schemaPath: path.join(functionDir, 'schema.ts'),
    argsPath: path.join(functionDir, argsFileName),
    functionDir,
  };
}

/**
 * Validates that all required files exist and are accessible
 *
 * Checks:
 * - Function directory exists
 * - Source file (index.ts) exists and is readable
 * - Schema file (schema.ts) exists and is readable
 * - Args file exists and is readable
 *
 * @param paths - Object containing file paths to validate
 * @throws Error if any required file is missing or inaccessible
 */
async function validatePaths(paths: FunctionPaths): Promise<void> {
  const errors: string[] = [];

  // Check function directory
  try {
    await access(paths.functionDir, constants.F_OK);
  } catch {
    errors.push(
      `Function directory not found: ${paths.functionDir}. Make sure the function exists in ./functions/${path.basename(paths.functionDir)}/`,
    );
  }

  // Check source file
  try {
    await access(paths.sourcePath, constants.F_OK | constants.R_OK);
  } catch {
    errors.push(
      `Source file not found or not readable: ${paths.sourcePath}. Expected index.ts in function directory.`,
    );
  }

  // Check schema file
  try {
    await access(paths.schemaPath, constants.F_OK | constants.R_OK);
  } catch {
    errors.push(
      `Schema file not found or not readable: ${paths.schemaPath}. Expected schema.ts in function directory.`,
    );
  }

  // Check args file
  try {
    await access(paths.argsPath, constants.F_OK | constants.R_OK);
  } catch {
    errors.push(
      `Args file not found or not readable: ${paths.argsPath}. Make sure the args file exists.`,
    );
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Loads and validates function arguments against the schema
 *
 * @param paths - Object containing schema and args file paths
 * @returns Validated arguments parsed from the args file
 * @throws Error if schema loading or validation fails
 */
async function loadAndValidateArguments(
  paths: FunctionPaths,
): Promise<unknown> {
  try {
    const validationResult = await loadAndValidateSchema({
      schemaPath: paths.schemaPath,
      argsPath: paths.argsPath,
    });
    return validationResult.args;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Schema validation failed for ${paths.argsPath}: ${errorMessage}`,
    );
  }
}

/**
 * Imports the function module and validates it has a default export
 *
 * @param sourcePath - Path to the function's index.ts file
 * @returns The runner object from the module's default export
 * @throws Error if module cannot be imported or lacks default export
 */
async function importAndValidateRunner(
  sourcePath: string,
): Promise<Runner<unknown>> {
  try {
    const source = await import(sourcePath);

    if (!source.default) {
      throw new Error(
        `Module ${sourcePath} does not have a default export. Expected a Runner object.`,
      );
    }

    // Validate that default export has required methods
    const runner = source.default as Runner<unknown>;
    if (typeof runner.run !== 'function') {
      throw new Error(
        `Invalid runner: default export must have a 'run' method.`,
      );
    }

    return runner;
  } catch (error) {
    if (error instanceof Error && error.message.includes('default export')) {
      throw error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to import function module from ${sourcePath}: ${errorMessage}`,
    );
  }
}

/**
 * Loads and validates configuration from untl.toml and environment file
 *
 * Validates:
 * - untl.toml file exists
 * - Profile exists in untl.toml
 * - Public key format (valid Ethereum address)
 * - RPC URL format (valid URL)
 *
 * @param options - Simulate options containing profile and env file paths
 * @returns Validated configuration object
 * @throws Error if configuration is invalid or missing
 */
async function loadAndValidateConfig(
  options: SimulateOptions,
): Promise<SimulationConfig> {
  const tomlPath = path.join(process.cwd(), 'untl.toml');

  // Validate untl.toml exists
  try {
    await access(tomlPath, constants.F_OK | constants.R_OK);
  } catch {
    throw new Error(
      `Configuration file not found: ${tomlPath}. Make sure untl.toml exists in the project root.`,
    );
  }

  // Load environment variables
  const envVars = parseEnvFile(options.envFile);

  // Parse TOML configuration
  let toml: { rpcUrl: string; privateKey: string; publicKey: string };
  try {
    toml = await parseToml(tomlPath, envVars, options.profile);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load configuration from ${tomlPath}: ${errorMessage}`,
    );
  }

  // Validate public key format (must be a valid Ethereum address)
  if (!isAddress(toml.publicKey)) {
    throw new Error(
      `Invalid public key format in profile "${options.profile}". Public key must be a valid Ethereum address (0x...).`,
    );
  }

  // Validate RPC URL format
  if (!isValidRpcUrl(toml.rpcUrl)) {
    throw new Error(
      `Invalid RPC URL format in profile "${options.profile}". RPC URL must be a valid HTTP/HTTPS URL or start with ws:// or wss://.`,
    );
  }

  return {
    publicKey: toml.publicKey as Address,
    rpcUrl: toml.rpcUrl,
  };
}

/**
 * Validates that an RPC URL has a valid format
 *
 * @param url - The RPC URL to validate
 * @returns True if the URL format is valid, false otherwise
 */
function isValidRpcUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  // Allow HTTP, HTTPS, WebSocket, and WebSocket Secure URLs
  try {
    const urlObj = new URL(url);
    const validProtocols = ['http:', 'https:', 'ws:', 'wss:'];
    return validProtocols.includes(urlObj.protocol);
  } catch {
    // If URL parsing fails, it's invalid
    return false;
  }
}

/**
 * Runs the simulation and validates that all transactions would succeed
 *
 * @param runner - The runner object containing the run method
 * @param validatedArgs - Validated arguments to pass to the runner
 * @param config - Configuration containing public key and RPC URL
 * @throws Error if simulation fails or any transaction would fail
 */
async function runSimulation(
  runner: Runner<unknown>,
  validatedArgs: unknown,
  config: SimulationConfig,
): Promise<void> {
  try {
    await validateSimulation({
      runner,
      options: {
        account: config.publicKey,
        rpcUrl: config.rpcUrl,
      },
      context: {
        userArgs: validatedArgs,
        secrets: undefined,
      },
      utils: logger(),
    });
    logger().log(
      '✅ Simulation completed successfully - all transactions validated',
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Simulation failed: ${errorMessage}`);
  }
}

/**
 * Displays chain information including chain ID and current gas price
 *
 * This provides useful context about the network being simulated on.
 *
 * @param rpcUrl - RPC URL to connect to for chain information
 * @throws Error if unable to connect to RPC or fetch chain information
 */
async function displayChainInfo(rpcUrl: string): Promise<void> {
  try {
    const publicClient = createPublicClient({
      transport: http(rpcUrl),
    });

    const [chainId, gasPrice] = await Promise.all([
      publicClient.getChainId(),
      publicClient.getGasPrice(),
    ]);

    logger().log('🔍 Chain ID:', chainId);
    logger().log(
      '🔍 Gas price:',
      Number(gasPrice),
      'wei =',
      formatEther(gasPrice),
      'ETH',
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger().warn(
      `Failed to fetch chain information: ${errorMessage}. Simulation completed but chain info unavailable.`,
    );
    // Don't throw - this is informational only
  }
}

/**
 * Parses environment variables from a .env file
 *
 * @param envFile - Path to the environment file (relative to project root or absolute)
 * @returns Object containing parsed environment variables
 * @throws Error if env file exists but cannot be parsed
 */
function parseEnvFile(envFile: string): Record<string, string> {
  const envPath = path.isAbsolute(envFile)
    ? envFile
    : path.join(process.cwd(), envFile);

  const result = dotenv.config({ path: envPath });

  // Return empty object if no env file found (not an error, env vars may come from system)
  // Check if error exists and is not a "file not found" type error
  if (result.error) {
    const errorCode = (result.error as { code?: string }).code;
    if (errorCode && errorCode !== 'ENOENT') {
      throw new Error(
        `Failed to load environment file ${envPath}: ${result.error.message}`,
      );
    }
  }

  return (result.parsed as Record<string, string>) || {};
}
