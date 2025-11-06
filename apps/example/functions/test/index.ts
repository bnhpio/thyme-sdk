import { onFail, onRun, onSuccess } from '@bnhpio/thyme-sdk/task/transaction';
import type { Args } from './schema';

const run = onRun<Args>(async () => {
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
