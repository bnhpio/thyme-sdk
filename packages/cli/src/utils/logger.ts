/** biome-ignore-all lint/suspicious/noExplicitAny: any is used to allow for any type of argument */
import type { Utils } from '@bnhpio/thyme-sdk/task/transaction';

export function logger(): Utils {
  return {
    log: async (...args: any[]): Promise<void> => console.log(...args),
    warn: async (...args: any[]): Promise<void> => console.warn(...args),
    error: async (...args: any[]): Promise<void> => console.error(...args),
  };
}
