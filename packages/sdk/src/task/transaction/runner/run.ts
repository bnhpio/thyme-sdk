import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { waitForTransactionReceipt } from 'viem/actions';
import { sendCalls } from '../onchain/send';
import type { Context, RunTaskArgs } from './types';
import { validateSimulation } from './validateSimulation';

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
      await validateSimulation({
        runner: args.runner,
        options: {
          account: privateKeyToAccount(args.options.privateKey).address,
          rpcUrl: args.options.rpcUrl,
        },
        context: args.context,
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      return;
    }
  }

  const txHash = await sendCalls({
    calls: result.calls,
    options: {
      privateKey: args.options.privateKey,
      rpcUrl: args.options.rpcUrl,
    },
  });

  const client = createPublicClient({
    transport: http(args.options.rpcUrl),
  });

  const receipt = await waitForTransactionReceipt(client, {
    hash: txHash,
  });

  if (receipt.status === 'success') {
    if (!args.options.skipSuccessCallback) {
      args.runner.success(txHash);
    }
  } else {
    if (!args.options.skipFailCallback) {
      args.runner.fail(txHash);
    }
  }
}
