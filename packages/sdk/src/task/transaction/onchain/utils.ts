import type { Chain } from 'viem/chains';
import * as chains from 'viem/chains';

/**
 * Gets a chain from the viem/chains library by its ID
 * @param chainId - The ID of the chain
 * @returns The chain or undefined if not found
 */
export function getChain(chainId: number): Chain | undefined {
  return Object.values(chains).find((chain: Chain) => chain.id === chainId);
}
