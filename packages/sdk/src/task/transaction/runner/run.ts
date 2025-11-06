import { createPublicClient, type Hex, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { waitForTransactionReceipt } from 'viem/actions';
import { sendAlchemyCalls } from '../alchemy/send';
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
  let txs: Hex[] = [];
  if (args.options.alchemyOptions) {
    console.log('sending alchemy calls');
    txs = await sendAlchemyCalls({
      calls: result.calls,
      options: {
        privateKey: args.options.privateKey,
        rpcUrl: args.options.rpcUrl,
        alchemyOptions: args.options.alchemyOptions,
      },
    });
    console.log(txs);
  } else {
    console.log('sending onchain calls');
    txs = [
      await sendCalls({
        calls: result.calls,
        options: {
          privateKey: args.options.privateKey,
          rpcUrl: args.options.rpcUrl,
        },
      }),
    ];
  }

  const client = createPublicClient({
    transport: http(args.options.rpcUrl),
  });

  const receipt = await waitForTransactionReceipt(client, {
    hash: txs[0],
  });

  if (receipt.status === 'success') {
    if (!args.options.skipSuccessCallback) {
      args.runner.success(txs[0]);
    }
  } else {
    if (!args.options.skipFailCallback) {
      args.runner.fail(txs[0]);
    }
  }
}
