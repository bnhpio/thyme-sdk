import { onFail, onRun, onSuccess } from '@bnhpio/thyme-sdk/runner';
import { isAddress, zeroAddress } from 'viem';
import type { Args } from './schema';

const run = onRun<Args>(async (ctx) => {
  console.log('ctx', ctx);

  const address = ctx.userArgs.address;

  if (isAddress(address)) {
    return {
      canExec: true,
      calls: [
        {
          to: zeroAddress,
          data: '0x',
          value: 0n,
        },
      ],
    };
  }

  return {
    canExec: false,
    message: 'Not implemented',
  };
});

const fail = onFail(async (ctx, result, error) => {
  console.log('Function failed with args:', ctx.userArgs);
  console.warn('Failed result:', result);
  console.error(error);
});

const success = onSuccess(async (ctx, result) => {
  console.log('Function succeeded with args:', ctx.userArgs);
  console.warn(result);
});

export default {
  run,
  fail,
  success,
};
