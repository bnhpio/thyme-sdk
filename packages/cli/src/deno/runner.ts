import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import type { TaskResult } from '@thyme-sh/sdk'

export interface TaskConfig {
	memory: number // MB
	timeout: number // seconds
	network: boolean
	rpcUrl?: string // RPC URL for public client
}

export interface RunResult {
	success: boolean
	result?: TaskResult
	logs: string[]
	error?: string
	executionTime?: number // milliseconds
	memoryUsed?: number // bytes
	rpcRequestCount?: number // number of RPC requests made
}

/**
 * Run a task in Deno sandbox - similar to Gelato's w3f test and @deno/sandbox
 * Creates an isolated Deno process with controlled permissions
 */
export async function runInDeno(
	taskPath: string,
	args: unknown,
	config: TaskConfig,
): Promise<RunResult> {
	const taskDir = dirname(resolve(taskPath))
	const absoluteTaskPath = resolve(taskPath)

	const denoFlags = ['run', '--no-prompt']

	// Sandbox permissions - minimal by default, similar to @deno/sandbox
	denoFlags.push(`--allow-read=${taskDir}`) // Only allow reading task directory

	// Add memory limit if specified
	if (config.memory) {
		denoFlags.push(`--v8-flags=--max-old-space-size=${config.memory}`)
	}

	// Conditionally allow network (similar to allowNet in @deno/sandbox)
	if (config.network) {
		denoFlags.push('--allow-net')
	}

	// Execute inline wrapper via stdin (similar to Gelato's approach)
	denoFlags.push('-')

	// Execution wrapper that loads and runs the task
	// Similar to how Gelato's w3f test executes functions
	const execScript = `
import task from '${absoluteTaskPath}';
import { createPublicClient, http } from 'npm:viem@2.21.54';

// Logger for local development - prints directly to console
// (In production, the logger outputs with __THYME_LOG__ prefix for capture)
class Logger {
	info(message) {
		console.log('[INFO]', message);
	}
	
	warn(message) {
		console.log('[WARN]', message);
	}
	
	error(message) {
		console.log('[ERROR]', message);
	}
}

// Create RPC request counter
let rpcRequestCount = 0;

// Wrap the http transport to count requests
const countingHttp = (url) => {
	const baseTransport = http(url);
	return (config) => {
		const transport = baseTransport(config);
		return {
			...transport,
			request: async (params) => {
				rpcRequestCount++;
				return transport.request(params);
			},
		};
	};
};

// Create public client for blockchain reads
const client = createPublicClient({
	transport: countingHttp(${config.rpcUrl ? `'${config.rpcUrl}'` : 'undefined'}),
});

const context = {
	args: ${JSON.stringify(args)},
	client,
	logger: new Logger(),
};

try {
	// Track execution time and memory
	const startTime = performance.now();
	const startMemory = Deno.memoryUsage().heapUsed;
	
	const result = await task.run(context);
	
	const endTime = performance.now();
	const endMemory = Deno.memoryUsage().heapUsed;
	
	const executionTime = endTime - startTime;
	const memoryUsed = endMemory - startMemory;
	
	console.log('__THYME_RESULT__' + JSON.stringify(result));
	console.log('__THYME_STATS__' + JSON.stringify({ executionTime, memoryUsed, rpcRequestCount }));
} catch (error) {
	console.error('Task execution error:', error instanceof Error ? error.message : String(error));
	Deno.exit(1);
}
`

	return new Promise((resolve) => {
		const proc = spawn('deno', denoFlags, {
			stdio: ['pipe', 'pipe', 'pipe'],
			timeout: config.timeout * 1000,
			cwd: taskDir,
		})

		let stdout = ''
		let stderr = ''
		const logs: string[] = []

		// Write the execution script to stdin
		proc.stdin?.write(execScript)
		proc.stdin?.end()

		proc.stdout?.on('data', (data) => {
			stdout += data.toString()
		})

		proc.stderr?.on('data', (data) => {
			stderr += data.toString()
		})

		proc.on('close', (code) => {
			if (code !== 0) {
				resolve({
					success: false,
					logs,
					error: stderr || `Process exited with code ${code}`,
				})
				return
			}

			try {
				// Extract logs, result, and stats from stdout
				const lines = stdout.trim().split('\n')
				let resultLine: string | undefined
				let statsLine: string | undefined

				for (const line of lines) {
					if (line.startsWith('__THYME_RESULT__')) {
						resultLine = line.substring('__THYME_RESULT__'.length)
					} else if (line.startsWith('__THYME_STATS__')) {
						statsLine = line.substring('__THYME_STATS__'.length)
					} else if (line.trim()) {
						logs.push(line.trim())
					}
				}

				if (!resultLine) {
					throw new Error('No result found in output')
				}

				const result = JSON.parse(resultLine) as TaskResult
				const stats = statsLine
					? JSON.parse(statsLine)
					: {
							executionTime: undefined,
							memoryUsed: undefined,
							rpcRequestCount: undefined,
						}

				resolve({
					success: true,
					result,
					logs,
					executionTime: stats.executionTime,
					memoryUsed: stats.memoryUsed,
					rpcRequestCount: stats.rpcRequestCount,
				})
			} catch (error) {
				resolve({
					success: false,
					logs,
					error: `Failed to parse result: ${error instanceof Error ? error.message : String(error)}`,
				})
			}
		})

		proc.on('error', (error) => {
			resolve({
				success: false,
				logs,
				error: `Failed to spawn Deno: ${error.message}`,
			})
		})
	})
}

/**
 * Check if Deno is installed
 */
export async function checkDeno(): Promise<boolean> {
	return new Promise((resolve) => {
		const proc = spawn('deno', ['--version'], { stdio: 'ignore' })
		proc.on('close', (code) => resolve(code === 0))
		proc.on('error', () => resolve(false))
	})
}
