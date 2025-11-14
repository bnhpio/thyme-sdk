# @bnhpio/thyme-cli

A command-line tool for creating, simulating, and deploying blockchain
automation functions. This CLI provides a streamlined workflow for developing
and testing functions before deploying them to production.

## Installation

```bash
npm install -g @bnhpio/thyme-cli
# or
pnpm add -g @bnhpio/thyme-cli
# or
bun add -g @bnhpio/thyme-cli
```

Or use it locally in your project:

```bash
npm install --save-dev @bnhpio/thyme-cli
# then use with: npx thyme <command>
```

## Commands

### `thyme create <name>`

Creates a new Thyme project or function. The command automatically detects
whether you're in an existing Thyme project:

- **If NOT in a Thyme project**: Creates a new project with the specified name
- **If in a Thyme project**: Creates a new function in the existing project

**Usage:**

```bash
# Create a new project
thyme create my-project
thyme create my-project --path ./projects

# Create a new function (when in an existing project)
thyme create my-function
thyme create my-function --template default
```

**Options:**

- `--path, -p`: Path where to create the project or function (default: `./`)
- `--template, -t`: Template type to use (default: `default`)

**Creating a New Project:**

When you run `thyme create my-project` outside of a Thyme project, it creates:

```
my-project/
├── package.json
├── tsconfig.json
├── untl.toml
├── .env.example
├── .gitignore
└── functions/
```

**Creating a New Function:**

When you run `thyme create my-function` inside a Thyme project, it creates:

```
functions/
  my-function/
    index.ts
    schema.ts
    args.json
```

**Examples:**

```bash
# Create a new project
thyme create my-thyme-project
cd my-thyme-project
npm install
cp .env.example .env
# Edit .env with your values

# Create your first function
thyme create transfer-tokens

# Create another function
thyme create swap-tokens
```

### `thyme auth <token>`

Stores an authentication token in your `.env` file. The token will be used
automatically when uploading functions, so you don't need to provide it with
every upload command.

**Usage:**

```bash
thyme auth your-auth-token
thyme auth your-auth-token --env .env.local
```

**Options:**

- `--env`: Environment file to use (default: `.env`)

**Example:**

```bash
thyme auth eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**What it does:**

1. Reads or creates the `.env` file in your project root
2. Adds or updates `THYME_AUTH_TOKEN` with the provided token
3. The token is automatically used by the `upload` command

**Note:** You can still override the token by providing `--authToken` when
uploading, but it's more convenient to set it once with this command.

### `thyme simulate <function>`

Simulates a function execution to validate transactions before deploying. This
command runs your function in a sandbox environment and validates that all
transactions would succeed on the blockchain.

**Usage:**

```bash
thyme simulate my-function --profile alice
thyme simulate my-function --profile alice --args custom-args.json
thyme simulate my-function --profile alice --env .env.local
```

**Options:**

- `--profile`: Run profile to use for the simulation (defined in `untl.toml`) -
  **required**
- `--args`: Path to the arguments file in `./functions/<function>/` (default:
  `args.json`)
- `--env`: Environment file to use (default: `.env`)

**Example:**

```bash
thyme simulate transfer-tokens --profile sepolia-test
```

**What it does:**

1. Validates function name and file paths
2. Loads and validates function arguments against the schema
3. Loads configuration from `untl.toml` for the specified profile
4. Runs the function in a sandbox environment
5. Displays chain information (chain ID, gas price)

**Requirements:**

- Function must exist in `./functions/<function>/`
- Must have `index.ts`, `schema.ts`, and `args.json` files
- Must have `untl.toml` in project root with the specified profile
- Environment variables referenced in `untl.toml` must be set

### `thyme upload <function>`

Uploads a function to the deployment server. This command compiles your
function, validates it, compresses it, and deploys it.

**Usage:**

```bash
# If you've set the token with "thyme auth <token>"
thyme upload my-function --organizationId <org-id>

# Or provide token directly
thyme upload my-function --authToken <token> --organizationId <org-id>
thyme upload my-function -a <token> -o <org-id>
thyme upload my-function -a <token> -o <org-id> --env .env.local
```

**Options:**

- `--authToken, -a`: Authentication token (optional if set via
  `thyme auth <token>`)
- `--organizationId, -o`: Organization ID - **required**
- `--env`: Environment file to use (default: `.env`)

**Environment Variables:**

- `DEPLOY_URL`: The deployment server URL (must be set in `.env` file)
- `THYME_AUTH_TOKEN`: Authentication token (can be set via `thyme auth <token>`)

**Example:**

```bash
# First, set your auth token (one time)
thyme auth your-auth-token

# Then upload functions without needing to provide the token
thyme upload transfer-tokens --organizationId "your-org-id"
```

**Note:** If you provide `--authToken`, it will override the token stored in
`.env`.

**What it does:**

1. Validates function name and file paths
2. Reads and compiles TypeScript source to JavaScript
3. Generates JSON schema from Zod schema
4. Compresses all files into a single archive
5. Calculates checksum for verification
6. Uploads to the deployment server
7. Returns deployment hash on success

## Project Structure

Your project should follow this structure:

```
project-root/
├── untl.toml          # Configuration file
├── .env               # Environment variables
├── functions/
│   ├── my-function/
│   │   ├── index.ts   # Function implementation
│   │   ├── schema.ts  # Zod schema definition
│   │   └── args.json  # Test arguments
│   └── another-function/
│       ├── index.ts
│       ├── schema.ts
│       └── args.json
```

## Configuration

### `untl.toml`

The `untl.toml` file defines profiles for different environments. Each profile
contains an RPC URL and a public key (Ethereum address).

**Example:**

```toml
[profiles]

[profiles.sepolia-test]
rpcUrl = "$SEPOLIA_RPC_URL"
publicKey = "$TEST_ACCOUNT_ADDRESS"

[profiles.mainnet]
rpcUrl = "$MAINNET_RPC_URL"
publicKey = "$MAINNET_ACCOUNT_ADDRESS"
```

**Environment Variable Substitution:**

The CLI supports environment variable substitution in `untl.toml`. Use
`$VARIABLE_NAME` syntax, and the CLI will replace it with the value from your
environment or `.env` file.

### `.env` File

Create a `.env` file in your project root to store environment variables:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-key
TEST_ACCOUNT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
MAINNET_RPC_URL=https://mainnet.infura.io/v3/your-key
MAINNET_ACCOUNT_ADDRESS=0x...
DEPLOY_URL=https://api.example.com/deploy
THYME_AUTH_TOKEN=your-auth-token-here
```

**Note:**

- The `DEPLOY_URL` is required for the `upload` command and should be set in
  your `.env` file.
- The `THYME_AUTH_TOKEN` can be set manually in `.env` or automatically via
  `thyme auth <token>` command.

## Function Development

### Getting Started

1. **Create a new Thyme project:**

```bash
thyme create my-project
cd my-project
npm install  # or bun install
cp .env.example .env
# Edit .env with your RPC URLs and addresses
```

2. **Create your first function:**

```bash
thyme create my-function
```

This automatically creates the function in the `functions/` directory with all
necessary files.

3. **Define the schema** (`functions/my-function/schema.ts`):

```typescript
import { z } from "zod";

export const schema = z.object({
	address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
	amount: z.string().transform((val) => BigInt(val)),
});

export type Args = z.infer<typeof schema>;
```

4. **Implement the function** (`functions/my-function/index.ts`):

```typescript
import { onFail, onRun, onSuccess } from "@bnhpio/thyme-sdk/runner";
import { isAddress } from "viem";
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
	console.log(`✅ Successfully sent ${ctx.userArgs.amount} wei`);
});

const fail = onFail<Args>(async (ctx, result, error) => {
	console.error(`❌ Transaction failed: ${error?.message}`);
});

export default {
	run,
	success,
	fail,
};
```

**Note:** The `create` command already creates `args.json` with default values.
You can edit it with your test arguments.

5. **Update test arguments** (`functions/my-function/args.json`):

```json
{
	"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
	"amount": "1000000000000000000"
}
```

### Testing a Function

Before deploying, always simulate your function:

```bash
thyme simulate my-function --profile sepolia-test
```

This will:

- Validate your arguments against the schema
- Run your function in a sandbox
- Check that all transactions would succeed
- Display chain information

### Deploying a Function

Once your function is tested and ready:

```bash
# Set your auth token (one time, if not already set)
thyme auth your-auth-token

# Upload your function
# Make sure DEPLOY_URL is set in your .env file
thyme upload my-function --organizationId "your-org-id"
```

## Examples

### Example 1: Simple Token Transfer

**Schema:**

```typescript
import { z } from "zod";

export const schema = z.object({
	recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
	amount: z.string().transform((val) => BigInt(val)),
});

export type Args = z.infer<typeof schema>;
```

**Function:**

```typescript
import { onRun } from "@bnhpio/thyme-sdk/runner";
import { encodeFunctionData, parseAbi } from "viem";
import type { Args } from "./schema";

const ERC20_ABI = parseAbi([
	"function transfer(address to, uint256 amount) returns (bool)",
]);

const run = onRun<Args>(async (ctx) => {
	const { recipient, amount } = ctx.userArgs;
	const tokenAddress = "0x..."; // Your token address

	const data = encodeFunctionData({
		abi: ERC20_ABI,
		functionName: "transfer",
		args: [recipient, amount],
	});

	return {
		canExec: true,
		calls: [
			{
				to: tokenAddress,
				data,
				value: 0n,
			},
		],
	};
});

export default {
	run,
	success: async () => {},
	fail: async () => {},
};
```

### Example 2: Multi-Call Function

**Function with multiple calls:**

```typescript
import { onRun } from "@bnhpio/thyme-sdk/runner";
import type { Args } from "./schema";

const run = onRun<Args>(async (ctx) => {
	const { recipients, amounts } = ctx.userArgs;

	const calls = recipients.map((recipient, index) => ({
		to: recipient,
		data: "0x" as const,
		value: amounts[index],
	}));

	return {
		canExec: true,
		calls,
	};
});

export default {
	run,
	success: async () => {},
	fail: async () => {},
};
```

## Error Handling

The CLI provides detailed error messages to help you debug issues:

- **Invalid function name**: Function names must contain only alphanumeric
  characters, hyphens, and underscores
- **Missing files**: All required files (`index.ts`, `schema.ts`, `args.json`)
  must exist
- **Schema validation errors**: Arguments must match the schema definition
- **Configuration errors**: `untl.toml` must exist and contain valid profiles
- **RPC errors**: RPC URL must be valid and accessible
- **Deployment errors**: Check your auth token and organization ID

## Best Practices

1. **Always simulate before deploying**: Use `thyme simulate` to test your
   functions locally
2. **Use environment variables**: Store sensitive data in `.env` files, not in
   code
3. **Validate inputs**: Use Zod schemas to validate all user inputs
4. **Handle errors gracefully**: Use `onFail` callbacks to handle execution
   failures
5. **Test with different profiles**: Test your functions against different
   networks
6. **Keep functions focused**: Each function should do one thing well
7. **Document your functions**: Add comments explaining complex logic

## Troubleshooting

### Function not found

Make sure your function exists in `./functions/<function-name>/` with all
required files.

### Schema validation fails

Check that your `args.json` matches the schema defined in `schema.ts`. Use
`z.toJSONSchema()` to see the expected format.

### RPC connection errors

Verify your RPC URL is correct and accessible. Check your network connection and
API keys.

### Deployment fails

- Verify `DEPLOY_URL` is set correctly in your `.env` file
- Check your auth token is valid
- Ensure your organization ID is correct
- Check network connectivity
- Verify the `.env` file path if using `--env` option

## License

MIT
