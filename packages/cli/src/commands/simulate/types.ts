import type { Address } from 'viem';

/**
 * Command options interface for the simulate command
 */
export interface SimulateOptions {
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
export interface FunctionPaths {
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
export interface SimulationConfig {
  /** Public key (address) to use for simulation */
  publicKey: Address;
  /** RPC URL for the blockchain network */
  rpcUrl: string;
}
