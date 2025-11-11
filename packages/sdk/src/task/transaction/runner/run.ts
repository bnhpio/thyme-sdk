import type { Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sendAlchemyCalls } from '../alchemy/send';
import { sendCalls } from '../onchain/send';
import type { Context, RunTaskArgs } from './types';
import { validateSimulation } from './validateSimulation';

export async function runTask<T>(args: RunTaskArgs<T>): Promise<Hex[]> {
  const context: Context<T> = {
    userArgs: args.context.userArgs,
    secrets: args.context.secrets || {},
  };

  const result = await args.runner.run(context, args.utils);

  if (result.canExec === false) {
    console.log('Skipping task because it cannot be executed:', result.message);
    throw new Error('Task cannot be executed');
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
        utils: args.utils,
      });
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      throw new Error('Simulation failed');
    }
  }
  let txs: Hex[] = [];
  if (args.options.alchemyOptions) {
    try {
      txs = await sendAlchemyCalls({
        calls: result.calls,
        options: {
          privateKey: args.options.privateKey,
          rpcUrl: args.options.rpcUrl,
          alchemyOptions: args.options.alchemyOptions,
        },
      });
      args.runner.success(txs);
      return txs;
    } catch (error: unknown) {
      // @ts-expect-error - error.cause is not typed
      console.error(error.cause);
      // @ts-expect-error - error.cause is not typed
      args.runner.fail(txs, error.cause);
      return [];
    }
  } else {
    try {
      txs = [
        await sendCalls({
          calls: result.calls,
          options: {
            privateKey: args.options.privateKey,
            rpcUrl: args.options.rpcUrl,
          },
        }),
      ];
      args.runner.success(txs);
      return txs;
    } catch (e) {
      console.error(e);
      args.runner.fail(txs, e as Error);
      return [];
    }
  }
}
