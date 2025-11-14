# @bnhpio/thyme-sdk

A TypeScript SDK for building, validating, and executing blockchain automation
functions. This SDK provides the core functionality for creating executable
tasks that can interact with blockchain networks, validate inputs, and handle
execution results.

## Installation

```bash
npm install @bnhpio/thyme-sdk
# or
pnpm add @bnhpio/thyme-sdk
# or
bun add @bnhpio/thyme-sdk
```

## Features

- 🎯 **Runner**: Create executable tasks with lifecycle callbacks
- 🏖️ **Sandbox**: Isolated execution environment for safe function execution
- ⛓️ **Onchain**: Blockchain simulation and transaction validation using viem
- 📋 **Schema**: JSON schema validation using Zod and Ajv
- 📦 **Archive**: File compression and decompression utilities

## Modules

### Runner (`/runner`)

The runner module provides the core functionality for creating executable tasks
that can interact with blockchain networks.

#### Basic Usage

```typescript
import { onFail, onRun, onSuccess } from "@bnhpio/thyme-sdk/runner";
import type { Context } from "@bnhpio/thyme-sdk/runner";

interface Args {
	address: string;
	amount: bigint;
}

const run = onRun<Args>(async (ctx: Context<Args>) => {
	const { address, amount } = ctx.userArgs;

	// Your logic here
	if (!isValidAddress(address)) {
		return {
			canExec: false,
			message: "Invalid address provided",
		};
	}

	return {
		canExec: true,
		calls: [
			{
				to: address as `0x${string}`,
				data: "0x",
				value: amount,
			},
		],
	};
});

const success = onSuccess<Args>(async (ctx, result) => {
	console.log("Transaction succeeded:", result);
});

const fail = onFail<Args>(async (ctx, result, error) => {
	console.error("Transaction failed:", error);
});

export default {
	run,
	success,
	fail,
};
```

#### API Reference

##### `onRun<T>(callback: RunCallback<T>): RunCallback<T>`

Creates a run callback that determines if a task can be executed and what calls
to make.

**Parameters:**

- `callback`: Function that receives a `Context<T>` and returns a `Result`

**Returns:**

- `Result` object with either:
  - `{ canExec: false, message: string }` - Task cannot be executed
  - `{ canExec: true, calls: Call[] }` - Task can be executed with these calls

**Example:**

```typescript
const run = onRun<Args>(async (ctx) => {
	// Access user arguments
	const { address } = ctx.userArgs;

	// Access secrets (from environment)
	const apiKey = ctx.secrets.API_KEY;

	// Return execution result
	return {
		canExec: true,
		calls: [
			{
				to: "0x...",
				data: "0x...",
				value: 0n,
			},
		],
	};
});
```

##### `onSuccess<T>(callback: SuccessCallback<T>): SuccessCallback<T>`

Creates a success callback that runs when a task executes successfully.

**Parameters:**

- `callback`: Function that receives `Context<T>` and execution results

**Example:**

```typescript
const success = onSuccess<Args>(async (ctx, result) => {
	console.log("Execution successful");
	console.log("Results:", result);
	// result is an array of Hex strings (transaction return values)
});
```

##### `onFail<T>(callback: FailCallback<T>): FailCallback<T>`

Creates a failure callback that runs when a task fails to execute.

**Parameters:**

- `callback`: Function that receives `Context<T>`, results, and optional error

**Example:**

```typescript
const fail = onFail<Args>(async (ctx, result, error) => {
	console.error("Execution failed");
	if (error) {
		console.error("Error:", error.message);
	}
});
```

##### `simulateTask<T>(args: SimulateTaskArgs<T>): Promise<SimulateCallsReturnType<Call[]>>`

Simulates a task execution against a blockchain network.

**Parameters:**

- `args.runner`: Runner object with `run`, `success`, and `fail` callbacks
- `args.options.account`: Ethereum address to simulate from
- `args.options.rpcUrl`: RPC URL for the blockchain network
- `args.context.userArgs`: User-provided arguments
- `args.context.secrets`: Secret values (API keys, etc.)

**Returns:**

- Promise resolving to simulation results from viem

**Throws:**

- `NotExecutableError` if the task cannot be executed (`canExec === false`)

**Example:**

```typescript
import { simulateTask } from "@bnhpio/thyme-sdk/runner";

const result = await simulateTask({
	runner: {
		run,
		success,
		fail,
	},
	options: {
		account: "0x...",
		rpcUrl: "https://sepolia.infura.io/v3/...",
	},
	context: {
		userArgs: { address: "0x...", amount: 1000000000000000000n },
		secrets: { API_KEY: "secret-key" },
	},
});
```

#### Types

```typescript
interface Context<T> {
	userArgs: T;
	secrets: Secrets;
}

interface Secrets {
	[key: string]: string;
}

type Call = {
	to: Address;
	data: Hex;
	value?: bigint;
};

type Result =
	| { canExec: false; message: string }
	| { canExec: true; calls: Call[] };
```

### Sandbox (`/sandbox`)

The sandbox module provides an isolated execution environment for running
functions safely.

#### Basic Usage

```typescript
import { sandbox } from "@bnhpio/thyme-sdk/sandbox";

const result = await sandbox({
	file: compiledJavaScriptCode,
	context: {
		userArgs: { address: "0x..." },
		secrets: {},
	},
});

console.log("Logs:", result.logs);
console.log("Result:", result.result);
```

#### API Reference

##### `sandbox<T>(args: SandboxArguments<T>): Promise<SandboxResult>`

Executes code in an isolated sandbox environment.

**Parameters:**

- `args.file`: JavaScript code as a string (compiled from TypeScript)
- `args.context.userArgs`: User-provided arguments
- `args.context.secrets`: Secret values

**Returns:**

- Promise resolving to `SandboxResult` with:
  - `logs`: Array of captured console logs
  - `result`: Execution result from the runner

**Features:**

- Captures all console output (log, warn, error, info)
- Hides `process.env` from the executed code
- Cleans up temporary files automatically
- Validates that the code exports a proper Runner object

**Example:**

```typescript
const jsCode = `
import { onRun } from '@bnhpio/thyme-sdk/runner';
export default {
  run: onRun(async (ctx) => ({
    canExec: true,
    calls: [],
  })),
  success: async () => {},
  fail: async () => {},
};
`;

const result = await sandbox({
	file: jsCode,
	context: {
		userArgs: { address: "0x123..." },
		secrets: { API_KEY: "secret" },
	},
});
```

### Onchain (`/onchain`)

The onchain module provides blockchain simulation capabilities using viem.

#### Basic Usage

```typescript
import { simulateCalls } from "@bnhpio/thyme-sdk/onchain";
import type { Call } from "viem";

const calls: Call[] = [
	{
		to: "0x...",
		data: "0x...",
		value: 0n,
	},
];

const result = await simulateCalls({
	calls,
	options: {
		rpcUrl: "https://sepolia.infura.io/v3/...",
		account: "0x...", // optional
	},
});
```

#### API Reference

##### `simulateCalls(args: SimulateCallsOptions): Promise<SimulateCallsReturnType<Call[]>>`

Simulates a set of calls against a blockchain network.

**Parameters:**

- `args.calls`: Array of calls to simulate
- `args.options.rpcUrl`: RPC URL for the blockchain network
- `args.options.account`: Account to simulate from (optional)

**Returns:**

- Promise resolving to viem's `SimulateCallsReturnType`

**Example:**

```typescript
import { simulateCalls } from "@bnhpio/thyme-sdk/onchain";

const result = await simulateCalls({
	calls: [
		{
			to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
			data: "0x...",
			value: 1000000000000000000n, // 1 ETH
		},
	],
	options: {
		rpcUrl: process.env.RPC_URL!,
		account: "0x...",
	},
});
```

### Schema (`/schema`)

The schema module provides JSON schema validation using Zod and Ajv.

#### Basic Usage

```typescript
import { validateSchema } from "@bnhpio/thyme-sdk/schema";
import { z } from "zod";

const schema = z.object({
	address: z.string().min(1),
	amount: z.number().positive(),
});

// Convert Zod schema to JSON schema
const jsonSchema = JSON.stringify(z.toJSONSchema(schema));

// Validate arguments
const isValid = await validateSchema(
	jsonSchema,
	JSON.stringify({ address: "0x...", amount: 100 }),
);

if (isValid) {
	console.log("Arguments are valid!");
}
```

#### API Reference

##### `validateSchema(schema: string, args: string): Promise<boolean>`

Validates arguments against a JSON schema.

**Parameters:**

- `schema`: JSON schema as a string (from `z.toJSONSchema()`)
- `args`: Arguments to validate as a JSON string

**Returns:**

- Promise resolving to `true` if valid, `false` otherwise

**Example:**

```typescript
import { validateSchema } from "@bnhpio/thyme-sdk/schema";
import { z } from "zod";

const zodSchema = z.object({
	address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
	amount: z.bigint().positive(),
});

const jsonSchema = JSON.stringify(
	z.toJSONSchema(zodSchema, { target: "openapi-3.0" }),
);

const args = JSON.stringify({
	address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
	amount: "1000000000000000000", // bigint as string
});

const isValid = await validateSchema(jsonSchema, args);
```

### Archive (`/archive`)

The archive module provides file compression and decompression utilities.

#### Basic Usage

```typescript
import { compressFiles, decompressFiles } from "@bnhpio/thyme-sdk/archive";

// Compress files
const compressed = await compressFiles([
	{
		id: "file1",
		path: "src/index.ts",
		content: "const x = 1;",
	},
	{
		id: "file2",
		path: "src/utils.ts",
		content: "export const y = 2;",
	},
]);

// Decompress files
const decompressed = await decompressFiles(compressed);
console.log("Files:", decompressed.files);
console.log("Manifest:", decompressed.manifest);
```

#### API Reference

##### `compressFiles(files: FileEntry[], options?: CompressOptions): Promise<Uint8Array>`

Compresses multiple files into a single gzipped archive.

**Parameters:**

- `files`: Array of file entries to compress
- `options.level`: Compression level (1-9, default: 6)
- `options.includeMetadata`: Include file metadata (default: true)
- `options.version`: Archive version (default: '1.0.0')

**Returns:**

- Promise resolving to compressed data as `Uint8Array`

**Example:**

```typescript
const compressed = await compressFiles(
	[
		{
			id: "source",
			path: "function/index.ts",
			content: sourceCode,
			metadata: { size: sourceCode.length },
		},
	],
	{
		level: 9, // Maximum compression
		includeMetadata: true,
	},
);
```

##### `decompressFiles(compressedData: Uint8Array): Promise<DecompressResult>`

Decompresses a gzipped archive.

**Parameters:**

- `compressedData`: Compressed data as `Uint8Array`

**Returns:**

- Promise resolving to `DecompressResult` with:
  - `files`: Array of extracted file entries
  - `manifest`: Archive manifest with metadata

**Example:**

```typescript
const result = await decompressFiles(compressedData);
result.files.forEach((file) => {
	console.log(`File: ${file.path}`);
	console.log(`Content: ${file.content}`);
});
```

## Complete Example

Here's a complete example of a function that validates an address and creates a
transaction:

```typescript
// schema.ts
import { z } from "zod";

export const schema = z.object({
	address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
	amount: z.string().transform((val) => BigInt(val)),
});

export type Args = z.infer<typeof schema>;

// index.ts
import { onFail, onRun, onSuccess } from "@bnhpio/thyme-sdk/runner";
import { isAddress, parseEther } from "viem";
import type { Args } from "./schema";

const run = onRun<Args>(async (ctx) => {
	const { address, amount } = ctx.userArgs;

	if (!isAddress(address)) {
		return {
			canExec: false,
			message: "Invalid Ethereum address",
		};
	}

	return {
		canExec: true,
		calls: [
			{
				to: address,
				data: "0x",
				value: amount,
			},
		],
	};
});

const success = onSuccess<Args>(async (ctx, result) => {
	console.log(
		`✅ Successfully sent ${ctx.userArgs.amount} wei to ${ctx.userArgs.address}`,
	);
	console.log("Transaction results:", result);
});

const fail = onFail<Args>(async (ctx, result, error) => {
	console.error(`❌ Failed to send transaction to ${ctx.userArgs.address}`);
	if (error) {
		console.error("Error:", error.message);
	}
});

export default {
	run,
	success,
	fail,
};
```

## TypeScript Support

This package is written in TypeScript and includes full type definitions. All
modules are fully typed and support TypeScript's type inference.

## Dependencies

- `viem`: Ethereum library for blockchain interactions
- `zod`: Schema validation
- `ajv`: JSON schema validation
- `vm2`: Sandbox execution (for security)

## License

MIT
