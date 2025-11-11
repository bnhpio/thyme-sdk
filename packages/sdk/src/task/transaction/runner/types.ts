/** biome-ignore-all lint/suspicious/noExplicitAny: any is used to allow for any type of argument */
import type { Address, Hex } from 'viem';

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
  utils: Utils,
) => Promise<Result>;
export type FailCallback = (result: Hex[], error?: Error) => Promise<void>;
export type SuccessCallback = (result: Hex[]) => Promise<void>;

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
  utils: Utils;
}
export interface RunTaskArgs<T> {
  runner: Runner<T>;
  options: {
    privateKey: Hex;
    rpcUrl: string;
    skipSuccessCallback?: boolean;
    skipFailCallback?: boolean;
    skipSimulation?: boolean;
    alchemyOptions?: AlchemyOptions;
  };
  context: {
    userArgs: T;
    secrets?: Secrets;
  };
  utils: Utils;
}

export interface Utils {
  log: (...args: any[]) => Promise<void>;
  warn: (...args: any[]) => Promise<void>;
  error: (...args: any[]) => Promise<void>;
}

export interface AlchemyOptions {
  apiKey: string;
  salt: Hex;
  policyId: string;
  baseUrl: string;
}

export function onRun<T>(callback: RunCallback<T>): RunCallback<T> {
  return async (context: Context<T>, utils: Utils) => {
    return callback(context, utils);
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
