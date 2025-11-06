import type { Address, Hex, WriteContractReturnType } from 'viem';

export interface Context<T> {
  userArgs: T;
  secrets: Secrets;
}

export interface Secrets {
  [key: string]: string;
}

export type FailResult = {
  canExec: false;
  message: string;
};
export type SuccessResult = {
  canExec: true;
  calls: Call[];
};
export type Call = {
  to: Address;
  data: Hex;
  value?: bigint;
  alias?: string;
};

export type RunCallback<T> = (
  context: Context<T>,
  secrets?: Secrets,
) => Promise<Result>;
export type FailCallback = (error: Error) => Promise<void>;
export type SuccessCallback = (
  result: WriteContractReturnType,
) => Promise<void>;

export interface Runner<T> {
  run: RunCallback<T>;
  fail: FailCallback;
  success: SuccessCallback;
}

export type Result = FailResult | SuccessResult;

export interface SimulateTaskArgs<T> {
  runner: Runner<T>;
  options: {
    account: Address;
    rpcUrl: string;
  };
  context: {
    userArgs: T;
    secrets?: Secrets;
  };
}
export interface RunTaskArgs<T> {
  runner: Runner<T>;
  options: {
    privateKey: Hex;
    rpcUrl: string;
    skipSuccessCallback?: boolean;
    skipFailCallback?: boolean;
    skipSimulation?: boolean;
  };
  context: {
    userArgs: T;
    secrets?: Secrets;
  };
}

export function onRun<T>(callback: RunCallback<T>): RunCallback<T> {
  return async (context: Context<T>, secrets?: Secrets) => {
    context.secrets = secrets || {};
    return callback(context);
  };
}

export function onFail(callback: FailCallback): FailCallback {
  return async (error) => {
    return callback(error);
  };
}

export function onSuccess(callback: SuccessCallback): SuccessCallback {
  return async (receipts) => {
    return callback(receipts);
  };
}
