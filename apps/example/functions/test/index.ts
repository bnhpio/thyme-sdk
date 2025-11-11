import { onFail, onRun, onSuccess } from '@bnhpio/thyme-sdk/task/transaction';
import type { Args } from './schema';

const run = onRun<Args>(async (_, { log, warn, error }) => {
  // console.log('process.env.TEST_API', process.env.TEST_API);
  await log('log: TEST_API', 1);
  await warn('warn: TEST_API', 2);
  await error('error: TEST_API', 3);
  return {
    canExec: false,
    message: 'Not implemented',
  };
});

const fail = onFail(async (error) => {
  console.error(error);
});

const success = onSuccess(async (result) => {
  console.log(result);
});

export default {
  run,
  fail,
  success,
};
