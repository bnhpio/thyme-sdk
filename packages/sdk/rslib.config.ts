import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts',
      'task/archive': './src/task/archive/index.ts',
      'task/transaction': './src/task/transaction/index.ts',
      'task/schema': './src/task/schema/index.ts',
      'account/alchemy': './src/account/index.ts',
    },
  },
  lib: [
    {
      format: 'esm',
      syntax: ['node 18'],
      dts: true,
    },
  ],
});
