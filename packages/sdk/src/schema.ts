import { type Address, getAddress, isAddress } from 'viem'
import { z } from 'zod'

/**
 * Extended Zod with Ethereum address validation
 */
export const zodExtended = {
	...z,
	/**
	 * Validates an Ethereum address and returns viem's Address type
	 * Accepts both checksummed and non-checksummed addresses
	 *
	 * @example
	 * ```typescript
	 * import { zodExtended as z } from '@thyme-sh/sdk'
	 *
	 * const schema = z.object({
	 *   targetAddress: z.address(),
	 * })
	 * ```
	 */
	address: () =>
		z
			.string()
			.refine((val): val is Address => isAddress(val), {
				message: 'Invalid Ethereum address',
			})
			.transform((val) => getAddress(val)),
}

/**
 * Type helper to infer the schema type
 */
export type InferSchema<T extends z.ZodType> = z.infer<T>
