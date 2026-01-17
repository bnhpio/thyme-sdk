import type { z } from 'zod'
import type { TaskDefinition } from './types'

/**
 * Define a Web3 automation task
 *
 * @example
 * ```typescript
 * import { defineTask, z } from '@thyme-sh/sdk'
 * import { encodeFunctionData } from 'viem'
 *
 * const abi = [
 *   'function transfer(address to, uint256 amount) returns (bool)',
 * ] as const
 *
 * export default defineTask({
 *   schema: z.object({
 *     targetAddress: z.address(),
 *   }),
 *   async run(ctx) {
 *     return {
 *       canExec: true,
 *       calls: [{
 *         to: ctx.args.targetAddress,
 *         data: encodeFunctionData({
 *           abi,
 *           functionName: 'transfer',
 *           args: [recipientAddress, 1000n],
 *         }),
 *       }]
 *     }
 *   }
 * })
 * ```
 */
export function defineTask<TSchema extends z.ZodType>(
	definition: TaskDefinition<TSchema>,
): TaskDefinition<TSchema> {
	return definition
}
