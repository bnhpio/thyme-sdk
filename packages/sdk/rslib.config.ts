import { defineConfig } from '@rslib/core';

export default defineConfig({
  source: {
    entry: {
      index: './src/index.ts',
      archive: './src/archive/index.ts',
      runner: './src/runner/index.ts',
      onchain: './src/onchain/index.ts',
      schema: './src/schema/index.ts',
      sandbox: './src/sandbox/index.ts',
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
