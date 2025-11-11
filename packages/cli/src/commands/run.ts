import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { loadAndValidateSchema } from '@bnhpio/thyme-sdk/task/schema';
import type { Runner } from '@bnhpio/thyme-sdk/task/transaction';
import { runTask } from '@bnhpio/thyme-sdk/task/transaction';
import dotenv from 'dotenv';
import type { Hex } from 'viem';
import { isHex } from 'viem';
import type { CommandModule } from 'yargs';
import { logger } from '../utils/logger';
import { parseToml } from '../utils/parseToml';

/**
 * Command options interface for the run command
 */
interface RunOptions {
  /** Path to the arguments file relative to function directory */
  args: string;
  /** Profile name from untl.toml to use for execution */
  profile: string;
  /** Path to environment file in project root */
  envFile: string;
  /** Whether to skip simulation before execution */
  skipSimulation: boolean;
  /** Whether to skip success callback after execution */
  skipSuccessCallback: boolean;
  /** Whether to skip fail callback on execution error */
  skipFailCallback: boolean;
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
 * Yargs command definition for running a function
 *
 * Executes a function from the ./functions/<function> directory with
 * validated arguments, configuration from untl.toml, and optional
 * simulation and callback controls.
 */
export const runCommand: CommandModule = {
  command: 'run <function>',
  describe: 'Execute a function with validated arguments and configuration',
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
        description: 'Skip simulation before execution (not recommended)',
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
    try {
      await run(argv.function as string, {
        args: (argv.args as string) || 'args.json',
        profile: (argv.profile as string) || 'none',
        envFile: (argv.env as string) || '.env',
        skipSimulation: argv.skipSimulation as boolean,
        skipSuccessCallback: argv.skipSuccessCallback as boolean,
        skipFailCallback: argv.skipFailCallback as boolean,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger().error('Run command failed:', errorMessage);
      process.exit(1);
    }
  },
};

/**
 * Main run function that orchestrates the execution of a function
 *
 * This function:
 * 1. Validates file paths and existence
 * 2. Loads and validates function arguments against schema
 * 3. Imports the function module
 * 4. Loads configuration from untl.toml
 * 5. Validates configuration values
 * 6. Executes the task with proper error handling
 *
 * @param functionName - Name of the function to execute
 * @param options - Execution options including paths, profile, and flags
 * @throws Error if validation fails or execution encounters an error
 */
async function run(functionName: string, options: RunOptions): Promise<void> {
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

  // Execute the task
  await executeTask(runner, validatedArgs, config, options);
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
 * - Source file (index.ts) exists
 * - Schema file (schema.ts) exists
 * - Args file exists
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
 * - Private key format (hex string)
 * - RPC URL format (valid URL)
 *
 * @param options - Run options containing profile and env file paths
 * @returns Validated configuration object
 * @throws Error if configuration is invalid or missing
 */
async function loadAndValidateConfig(
  options: RunOptions,
): Promise<{ privateKey: Hex; rpcUrl: string }> {
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

  // Validate private key format
  if (!isHex(toml.privateKey)) {
    throw new Error(
      `Invalid private key format in profile "${options.profile}". Private key must be a valid hex string (0x...).`,
    );
  }

  // Validate RPC URL format
  if (!isValidRpcUrl(toml.rpcUrl)) {
    throw new Error(
      `Invalid RPC URL format in profile "${options.profile}". RPC URL must be a valid HTTP/HTTPS URL or start with ws:// or wss://.`,
    );
  }

  return {
    privateKey: toml.privateKey as Hex,
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
 * Executes the task with the provided runner, arguments, and configuration
 *
 * @param runner - The runner object containing run, success, and fail callbacks
 * @param validatedArgs - Validated arguments to pass to the runner
 * @param config - Configuration containing private key and RPC URL
 * @param options - Execution options including skip flags
 * @throws Error if task execution fails
 */
async function executeTask(
  runner: Runner<unknown>,
  validatedArgs: unknown,
  config: { privateKey: Hex; rpcUrl: string },
  options: RunOptions,
): Promise<void> {
  try {
    await runTask({
      runner,
      options: {
        privateKey: config.privateKey,
        rpcUrl: config.rpcUrl,
        skipSimulation: options.skipSimulation,
        skipSuccessCallback: options.skipSuccessCallback,
        skipFailCallback: options.skipFailCallback,
      },
      context: {
        userArgs: validatedArgs,
        secrets: undefined,
      },
      utils: logger(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Task execution failed: ${errorMessage}`);
  }
}

/**
 * Parses environment variables from a .env file
 *
 * @param envFile - Path to the environment file (relative to project root)
 * @returns Object containing parsed environment variables
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
