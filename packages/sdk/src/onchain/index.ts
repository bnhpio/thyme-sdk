import {
  type Call,
  createPublicClient,
  http,
  type SimulateCallsReturnType,
} from 'viem';
import type { SimulateCallsOptions } from './types';

/**
 * Simulates a set of calls against a given RPC URL and account(optional)
 * @param args - The options for the simulation
 * @param args.calls - The calls to simulate
 * @param args.options - The options for the simulation
 * @param args.options.rpcUrl - The RPC URL to use
 * @param args.options.account - The account to use (optional)
 * @returns The simulated transaction return type
 */
export async function simulateCalls(
  args: SimulateCallsOptions,
): Promise<SimulateCallsReturnType<Call[]>> {
  // create public client
  const publicClient = createPublicClient({
    transport: http(args.options.rpcUrl),
  });
  // simulate transaction
  const simulatedTransaction = await publicClient.simulateCalls({
    calls: args.calls,
    account: args.options.account,
  });
  return simulatedTransaction;
}
