import { createPublicClient, type Hex, http } from 'viem';
import { createAlchemyClient } from '../../../account/alchemy';
import type { SendCallsAlchemyOptions } from '../types';

export async function sendAlchemyCalls(
  args: SendCallsAlchemyOptions,
): Promise<Hex[]> {
  const publicClient = createPublicClient({
    transport: http(args.options.rpcUrl),
  });
  const chainId = await publicClient.getChainId();
  const { client, account } = await createAlchemyClient(
    args.options.privateKey,
    args.options.alchemyOptions,
    chainId,
  );

  const preparedCalls = await client.prepareCalls({
    calls: args.calls.map((call) => ({
      to: call.to,
      data: call.data,
    })),

    from: account,
    capabilities: {
      paymasterService: {
        policyId: args.options.alchemyOptions.policyId,
      },
    },
  });
  try {
    const signedCalls = await client.signPreparedCalls(preparedCalls);
    const result = await client.sendPreparedCalls(signedCalls);
    const callsStatus = await client.waitForCallsStatus({
      id: result.preparedCallIds[0],
    });
    const tsx =
      callsStatus.receipts?.map((receipt) => receipt.transactionHash) || [];
    if (callsStatus.status !== 'success') {
      throw new Error('Failed to send alchemy calls', { cause: callsStatus });
    }
    return tsx;
  } catch (error) {
    console.error('Error sending alchemy calls:', error);
    throw error;
  }
}
