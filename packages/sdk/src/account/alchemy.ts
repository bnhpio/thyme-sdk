import { LocalAccountSigner } from '@aa-sdk/core';
import { alchemy, defineAlchemyChain } from '@account-kit/infra';
import {
  createSmartWalletClient,
  type SmartWalletClient,
} from '@account-kit/wallet-client';
import type { Address, Hex } from 'viem';
import { type AlchemyOptions, getChain } from '../task/transaction';

export const createAlchemyClient = async (
  privateKey: Hex,
  options: AlchemyOptions,
  chainId: number,
): Promise<{ client: SmartWalletClient; account: Address }> => {
  const signer = LocalAccountSigner.privateKeyToAccountSigner(privateKey);
  const transport = alchemy({
    apiKey: options.apiKey,
  });
  const realChain = getChain(chainId);
  if (!realChain) {
    throw new Error('Chain not found');
  }
  const alchemyChain = defineAlchemyChain({
    chain: realChain,
    rpcBaseUrl: options.baseUrl,
  });
  const client = createSmartWalletClient({
    transport,
    chain: alchemyChain,
    signer,
  });

  console.log('requesting account', options.salt);
  const account = await client.requestAccount({
    id: options.salt,
    creationHint: {
      createAdditional: true,
      salt: options.salt,
    },
  });
  return { client, account: account.address };
};
