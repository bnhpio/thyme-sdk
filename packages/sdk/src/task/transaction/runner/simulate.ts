import type { Call, SimulateCallsReturnType } from 'viem';
import { simulateCalls } from '../onchain/simulate';
import type { Context, SimulateTaskArgs } from './types';

/**
 * Run a simulation task
 * @param args - The arguments for the simulation
 * @param args.runner - The runner to use
 * @param args.options - The options for the simulation
 * @param args.options.account - The account to use (optional)
 * @param args.options.rpcUrl - The RPC URL to use
 * @param args.context - The context for the simulation
 * @param args.context.userArgs - The user arguments for the simulation
 * @param args.context.secrets - The secrets for the simulation
 * @returns
 */
export async function simulateTask<T>(
  args: SimulateTaskArgs<T>,
): Promise<SimulateCallsReturnType<Call[]> | undefined> {
  const context: Context<T> = {
    userArgs: args.context.userArgs,
    secrets: args.context.secrets || {},
  };

  const result = await args.runner.run(context);

  if (result.canExec === false) {
    return undefined;
  }

  return simulateCalls({
    calls: result.calls,
    options: {
      account: args.options.account,
      rpcUrl: args.options.rpcUrl,
    },
  });
}
