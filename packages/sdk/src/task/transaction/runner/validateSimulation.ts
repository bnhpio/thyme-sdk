import type { Call, SimulateCallsReturnType } from 'viem';
import { simulateTask } from './simulate';
import type { SimulateTaskArgs } from './types';

export interface ValidateSimulationResult<T> {
  /**
   * The simulation result with validated successful calls
   */
  result: SimulateCallsReturnType<Call[]>;
  /**
   * The user arguments that were used
   */
  userArgs: T;
}

/**
 * Simulates a task and validates that all calls succeeded.
 * Throws an error if the task cannot be executed or if any call fails.
 *
 * @param args - The arguments for the simulation
 * @returns The validated simulation result
 * @throws Error if the task cannot be executed or if any call fails
 */
export async function validateSimulation<T>(
  args: SimulateTaskArgs<T>,
): Promise<ValidateSimulationResult<T>> {
  const simulateResult = await simulateTask(args);

  if (!simulateResult) {
    throw new Error('Simulation failed: Task cannot be executed');
  }

  const failedCalls = simulateResult.results.filter(
    (result) => result.status === 'failure',
  );

  if (failedCalls.length > 0) {
    const errorMessages = failedCalls
      .map((result) => result.error?.message || String(result.error))
      .join(', ');
    throw new Error(`Simulation failed: ${errorMessages}`);
  }

  return {
    result: simulateResult,
    userArgs: args.context.userArgs,
  };
}
