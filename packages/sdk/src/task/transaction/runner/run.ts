import { privateKeyToAccount } from 'viem/accounts';
import { sendCalls } from '../onchain/send';
import { simulateTask } from './simulate';
import type { Context, RunTaskArgs } from './types';

export async function runTask<T>(args: RunTaskArgs<T>): Promise<void> {
  const context: Context<T> = {
    userArgs: args.context.userArgs,
    secrets: args.context.secrets || {},
  };

  const result = await args.runner.run(context);

  if (result.canExec === false) {
    console.log('Skipping task because it cannot be executed:', result.message);
    return;
  }

  if (!args.options.skipSimulation) {
    try {
      const simulatedTask = await simulateTask({
        runner: args.runner,
        options: {
          account: privateKeyToAccount(args.options.privateKey).address,
          rpcUrl: args.options.rpcUrl,
        },
        context: args.context,
      });
      if (!simulatedTask) {
        console.error('Simulation failed: No result returned');
        return;
      }
      const failedCalls = simulatedTask.results.filter(
        (result) => result.status === 'failure',
      );
      if (failedCalls.length > 0) {
        console.error(
          'Simulation failed:',
          failedCalls.map((result) => result.error).join('\n'),
        );
        return;
      }
    } catch (error) {
      console.error('Simulation failed:', error);
      return;
    }
  }

  const tx = await sendCalls({
    calls: result.calls,
    options: {
      privateKey: args.options.privateKey,
      rpcUrl: args.options.rpcUrl,
    },
  });
  console.log(tx);
}
