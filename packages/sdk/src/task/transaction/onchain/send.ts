import {
  createWalletClient,
  type Hex,
  http,
  type WriteContractReturnType,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import Simple7702AccountABI from '../../../abis/Simple7702Account';
import type { SendCallsOptions } from './types';
import { getChain } from './utils';

// TODO: make this configurable
export const SIMPLE_7702_ACCOUNT_ADDRESS =
  '0xe6Cae83BdE06E4c305530e199D7217f42808555B';

/**
 * Sends a set of calls to the Simple7702Account contract
 * @param args - The options for the send
 * @param args.calls - The calls to send
 * @param args.options - The options for the send
 * @param args.options.privateKey - The private key of the account
 * @param args.options.rpcUrl - The RPC URL to use
 * @returns The hash of the transaction
 */
export async function sendCalls(
  args: SendCallsOptions,
): Promise<WriteContractReturnType> {
  const account = privateKeyToAccount(args.options.privateKey);
  const walletClient = createWalletClient({
    transport: http(args.options.rpcUrl),
    account: account,
  });
  const chainId = await walletClient.getChainId();
  const chain = getChain(chainId);

  const authorization = await walletClient.signAuthorization({
    chainId: chainId,
    contractAddress: SIMPLE_7702_ACCOUNT_ADDRESS,
    executor: 'self',
    account: account,
  });

  const result = await walletClient.writeContract({
    authorizationList: [authorization],
    address: account.address,
    abi: Simple7702AccountABI,
    chain: chain,
    functionName: 'executeBatch',
    args: [
      args.calls.map((call) => ({
        target: call.to,
        value: 0n,
        data: call.data as Hex,
      })),
    ],
  });

  return result;
}
