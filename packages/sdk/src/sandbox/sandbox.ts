import { randomUUID } from 'node:crypto';
import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Runner } from '../runner/types';
import type { SandboxArguments, SandboxResult } from './types';

function serializeValue(value: unknown, depth = 0): string {
  if (depth > 10) return '[Max Depth Reached]';

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (value instanceof Error) {
    return `Error: ${value.name} - ${value.message}${value.stack ? `\n${value.stack}` : ''}`;
  }

  const type = typeof value;

  if (type === 'string') return value as string;
  if (type === 'number' || type === 'boolean') return String(value);
  if (type === 'bigint') return `${value}n`;
  if (type === 'symbol') return String(value);
  if (type === 'function') {
    const func = value as { name?: string };
    return `[Function: ${func.name || 'anonymous'}]`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item) => serializeValue(item, depth + 1));
    return `[${items.join(', ')}]`;
  }

  if (type === 'object') {
    try {
      const seen = new WeakSet();
      const replacer = (_key: string, val: unknown) => {
        if (val === null || val === undefined) return val;
        if (typeof val === 'object') {
          if (seen.has(val as object)) return '[Circular]';
          seen.add(val as object);
        }
        if (val instanceof Error) {
          return {
            name: val.name,
            message: val.message,
            stack: val.stack,
          };
        }
        return val;
      };
      return JSON.stringify(value, replacer, 2);
    } catch (error) {
      return `[Object: ${String(error)}]`;
    }
  }

  return String(value);
}

export async function sandbox<T>(
  args: SandboxArguments<T>,
): Promise<SandboxResult> {
  const logs: string[] = [];
  const originalConsole = { ...console };

  // Capture console logs
  const captureConsole = () => {
    console.log = (...args: unknown[]) => {
      const serialized = args.map((arg) => serializeValue(arg)).join(' ');
      logs.push(`[LOG] ${serialized}`);
      originalConsole.log(...args);
    };
    console.warn = (...args: unknown[]) => {
      const serialized = args.map((arg) => serializeValue(arg)).join(' ');
      logs.push(`[WARN] ${serialized}`);
      originalConsole.warn(...args);
    };
    console.error = (...args: unknown[]) => {
      const serialized = args.map((arg) => serializeValue(arg)).join(' ');
      logs.push(`[ERROR] ${serialized}`);
      originalConsole.error(...args);
    };
    console.info = (...args: unknown[]) => {
      const serialized = args.map((arg) => serializeValue(arg)).join(' ');
      logs.push(`[INFO] ${serialized}`);
      originalConsole.info(...args);
    };
  };

  // Restore original console
  const restoreConsole = () => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
  };

  // Hide process.env from the function
  const hideProcessEnv = () => {
    process.env = {} as NodeJS.ProcessEnv;
  };

  let tempFile: string | null = null;

  try {
    // Create a temporary file with the code
    tempFile = join(tmpdir(), `thyme-sandbox-${randomUUID()}.mjs`);
    writeFileSync(tempFile, args.file, 'utf-8');

    // Capture console and hide process.env before importing
    captureConsole();
    hideProcessEnv();

    // Dynamically import the module
    const module = await import(`file://${tempFile}`);

    // Get the default export which should be a Runner object
    const runner = module.default as Runner<T> | undefined;

    if (!runner) {
      throw new Error(
        'Default export is not available. Make sure your template exports default: export default { run, fail, success }',
      );
    }

    if (!runner.run || typeof runner.run !== 'function') {
      throw new Error(
        'run function is not available. Make sure your template exports default with a run function: export default { run: onRun<Args>(async (ctx) => { ... }) }',
      );
    }

    // Prepare the context object for the run function
    const contextObj = {
      userArgs: args.context.userArgs,
      secrets: args.context.secrets,
    };

    // Call the run function (process.env is still hidden during execution)
    const result = await runner.run(contextObj);

    restoreConsole();

    console.log('result', result);
    console.log('logs', logs);

    return { logs, result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Sandbox execution failed: ${errorMessage}`);
  } finally {
    // Restore console and process.env
    restoreConsole();

    // Clean up temporary file
    if (tempFile) {
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
