import type { Address, Call, Hex } from 'viem';
import type { AlchemyOptions } from './runner/types';

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

export interface SendCallsAlchemyOptions {
  calls: Call[];
  options: {
    privateKey: Hex;
    rpcUrl: string;
    alchemyOptions: AlchemyOptions;
  };
}
