# @thyme-sh/sdk

SDK for authoring Web3 automation tasks with Thyme.

## Installation

```bash
npm install @thyme-sh/sdk zod viem
```

## Usage

Create a task with embedded schema:

```typescript
import { defineTask, z } from '@thyme-sh/sdk'
import { encodeFunctionData } from 'viem'

const abi = [
  {
    name: 'updatePrice',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'price', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

export default defineTask({
  // Define your arguments schema with type-safe Ethereum addresses
  schema: z.object({
    oracleAddress: z.address(), // Validates and returns viem's Address type
    threshold: z.number().min(0),
  }),

  // Main execution logic
  async run(ctx) {
    const { oracleAddress, threshold } = ctx.args
    
    // Read from blockchain using the public client
    const lastPrice = await ctx.client.readContract({
      address: oracleAddress,
      abi,
      functionName: 'getPrice',
    })
    
    // Your logic here
    const price = await fetchPrice()
    
    if (price > threshold && price !== lastPrice) {
      return {
        canExec: true,
        calls: [{
          to: oracleAddress,
          data: encodeFunctionData({
            abi,
            functionName: 'updatePrice',
            args: [price],
          }),
        }]
      }
    }
    
    return {
      canExec: false,
      message: 'Price below threshold or unchanged'
    }
  },

  // Optional: Handle successful execution
  async onSuccess(ctx, txHashes) {
    console.log('Executed:', txHashes)
  },

  // Optional: Handle failed execution
  async onFail(ctx, error) {
    console.error('Failed:', error.message)
  },
})
```

## Schema Validation

The SDK provides an extended Zod instance with Ethereum-specific validators:

### `z.address()`

Validates an Ethereum address and returns viem's `Address` type:

```typescript
import { defineTask, z } from '@thyme-sh/sdk'

export default defineTask({
  schema: z.object({
    targetAddress: z.address(), // Validates checksum and format
  }),
  async run(ctx) {
    // ctx.args.targetAddress is typed as Address from viem
    return {
      canExec: true,
      calls: [{
        to: ctx.args.targetAddress,
        data: '0x',
      }]
    }
  }
})
```

You can also use standard Zod validators:

```typescript
schema: z.object({
  address: z.address(),
  amount: z.bigint().positive(),
  enabled: z.boolean(),
  metadata: z.string().optional(),
})
```

## Public Client

The context includes a viem `PublicClient` for reading blockchain data:

```typescript
import { defineTask, z } from '@thyme-sh/sdk'

export default defineTask({
  schema: z.object({
    tokenAddress: z.address(),
    threshold: z.bigint(),
  }),
  
  async run(ctx) {
    // Read contract state
    const totalSupply = await ctx.client.readContract({
      address: ctx.args.tokenAddress,
      abi: [{
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
      }],
      functionName: 'totalSupply',
    })
    
    // Get block data
    const blockNumber = await ctx.client.getBlockNumber()
    const block = await ctx.client.getBlock({ blockNumber })
    
    // Get balance
    const balance = await ctx.client.getBalance({
      address: ctx.args.tokenAddress,
    })
    
    if (totalSupply > ctx.args.threshold) {
      return {
        canExec: true,
        calls: [...]
      }
    }
    
    return {
      canExec: false,
      message: 'Threshold not met'
    }
  }
})
```

The client is configured using the `RPC_URL` environment variable in your `.env` file.

## Encoding Function Calls

Use viem's `encodeFunctionData` to encode function calls:

```typescript
import { defineTask, z } from '@thyme-sh/sdk'
import { encodeFunctionData } from 'viem'

const abi = [
  'function transfer(address to, uint256 amount) returns (bool)',
] as const

export default defineTask({
  schema: z.object({
    token: z.address(),
    recipient: z.address(),
  }),
  
  async run(ctx) {
    return {
      canExec: true,
      calls: [{
        to: ctx.args.token,
        data: encodeFunctionData({
          abi,
          functionName: 'transfer',
          args: [ctx.args.recipient, 1000n],
        }),
      }]
    }
  }
})
```

Viem's `encodeFunctionData` provides full type safety and validation.

## API

### `defineTask(definition)`

Define a Web3 automation task.

#### Parameters

- `definition.schema` - Zod schema for validating task arguments
- `definition.run` - Main execution function that returns whether to execute and what calls to make
- `definition.onSuccess` - Optional callback on successful execution
- `definition.onFail` - Optional callback on failed execution

#### Returns

The task definition (for type inference).

## Types

### `ThymeContext<TArgs>`

Context provided to task execution:
- `args` - User-provided arguments validated against schema
- `client` - Viem public client for reading blockchain data

### `TaskResult`

Result from task execution:
- `{ canExec: true, calls: Call[] }` - Execute these calls
- `{ canExec: false, message: string }` - Don't execute, with reason

### `Call`

A call to execute on-chain:
- `to` - Target contract address
- `data` - Encoded function call data

## License

MIT
