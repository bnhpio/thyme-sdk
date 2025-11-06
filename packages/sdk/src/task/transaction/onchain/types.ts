import type { Address, Call, Hex } from 'viem';

export interface SimulateCallsOptions {
  calls: Call[];
  options: {
    account?: Address;
    rpcUrl: string;
  };
}
export interface SendCallsOptions {
  calls: Call[];
  options: {
    privateKey: Hex;
    rpcUrl: string;
  };
}
