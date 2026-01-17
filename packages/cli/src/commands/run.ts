import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { Address } from 'viem'
import { http, createPublicClient, formatEther, isAddress } from 'viem'
import { type TaskConfig, checkDeno, runInDeno } from '../deno/runner'
import { getEnv, loadEnv } from '../utils/env'
import {
	discoverTasks,
	getTaskArgsPath,
	getTaskPath,
	isThymeProject,
} from '../utils/tasks'
import {
	clack,
	error,
	info,
	intro,
	log,
	outro,
	pc,
	step,
	warn,
} from '../utils/ui'

interface RunOptions {
	simulate?: boolean
}

export async function runCommand(taskName?: string, options: RunOptions = {}) {
	intro('Thyme CLI - Run Task')

	const projectRoot = process.cwd()

	// Load environment variables
	loadEnv(projectRoot)

	// Check if we're in a Thyme project
	if (!isThymeProject(projectRoot)) {
		error('Not in a Thyme project')
		process.exit(1)
	}

	// Check if Deno is installed
	const hasDeno = await checkDeno()
	if (!hasDeno) {
		error('Deno is not installed. Please install Deno: https://deno.land/')
		process.exit(1)
	}

	// Discover tasks if no task name provided
	let finalTaskName = taskName
	if (!finalTaskName) {
		const tasks = await discoverTasks(projectRoot)

		if (tasks.length === 0) {
			error('No tasks found. Create one with `thyme new`')
			process.exit(1)
		}

		const selected = await clack.select({
			message: 'Select a task to run:',
			options: tasks.map((task) => ({ value: task, label: task })),
		})

		if (clack.isCancel(selected)) {
			clack.cancel('Operation cancelled')
			process.exit(0)
		}

		finalTaskName = selected as string
	}

	const taskPath = getTaskPath(projectRoot, finalTaskName)
	const argsPath = getTaskArgsPath(projectRoot, finalTaskName)

	// Check if task exists
	if (!existsSync(taskPath)) {
		error(`Task "${finalTaskName}" not found`)
		process.exit(1)
	}

	// Use default config
	const config: TaskConfig = {
		memory: 128,
		timeout: 30,
		network: true,
		rpcUrl: getEnv('RPC_URL'),
	}

	// Load args
	let args: unknown = {}
	if (existsSync(argsPath)) {
		try {
			const argsData = await readFile(argsPath, 'utf-8')
			args = JSON.parse(argsData)
		} catch (err) {
			warn(
				`Failed to load args.json: ${err instanceof Error ? err.message : String(err)}`,
			)
		}
	}

	const spinner = clack.spinner()
	spinner.start('Executing task in Deno sandbox...')

	// Run task
	const result = await runInDeno(taskPath, args, config)

	if (!result.success) {
		spinner.stop('Task execution failed')
		error(result.error ?? 'Unknown error')
		if (result.logs.length > 0) {
			step('Task output:')
			for (const taskLog of result.logs) {
				log(`  ${taskLog}`)
			}
		}
		process.exit(1)
	}

	spinner.stop('Task executed successfully')

	// Show logs
	if (result.logs.length > 0) {
		log('')
		step('Task output:')
		for (const taskLog of result.logs) {
			log(`  ${taskLog}`)
		}
	}

	// Show result
	if (!result.result) {
		error('No result returned from task')
		process.exit(1)
	}

	log('')
	if (result.result.canExec) {
		info(
			`${pc.green('✓')} Result: canExec = true (${result.result.calls.length} call(s))`,
		)

		// Show calls
		log('')
		step('Calls to execute:')
		for (const call of result.result.calls) {
			log(`  ${pc.cyan('→')} to: ${call.to}`)
			log(`     data: ${call.data}`)
		}

		// Simulate if requested
		if (options.simulate) {
			log('')
			await simulateCalls(result.result.calls)
		}
	} else {
		warn('Result: canExec = false')
		info(`Message: ${result.result.message}`)
	}

	// Show execution stats
	log('')
	if (
		result.executionTime !== undefined ||
		result.memoryUsed !== undefined ||
		result.rpcRequestCount !== undefined
	) {
		step('Execution stats:')
		if (result.executionTime !== undefined) {
			log(`  Duration: ${result.executionTime.toFixed(2)}ms`)
		}
		if (result.memoryUsed !== undefined) {
			const memoryMB = (result.memoryUsed / 1024 / 1024).toFixed(2)
			log(`  Memory: ${memoryMB}MB`)
		}
		if (result.rpcRequestCount !== undefined) {
			log(`  RPC Requests: ${result.rpcRequestCount}`)
		}
	}

	// Show simulation tip if task can execute and simulation wasn't run
	if (result.result?.canExec && !options.simulate) {
		log('')
		info(
			`${pc.dim('💡 Tip: Test calls on-chain with:')} ${pc.cyan(`thyme run ${finalTaskName} --simulate`)}`,
		)
		outro('')
	} else {
		outro('')
	}
}

async function simulateCalls(
	calls: Array<{ to: Address; data: `0x${string}` }>,
) {
	const rpcUrl = getEnv('RPC_URL')
	const account = getEnv('SIMULATE_ACCOUNT')

	if (!rpcUrl || !account) {
		warn('Simulation requires RPC_URL and SIMULATE_ACCOUNT in .env file')
		return
	}

	const spinner = clack.spinner()
	spinner.start('Simulating on-chain...')

	try {
		const client = createPublicClient({
			transport: http(rpcUrl),
		})

		// Get chain info
		const chainId = await client.getChainId()
		const blockNumber = await client.getBlockNumber()

		spinner.stop('Simulating on-chain...')

		log('')
		info(`Chain ID: ${chainId}`)
		info(`Block: ${blockNumber}`)
		info(`Account: ${account}`)

		// Validate account address
		if (!isAddress(account)) {
			spinner.stop('Invalid account address')
			log('')
			error(`SIMULATE_ACCOUNT is not a valid Ethereum address: ${account}`)
			return
		}

		// Simulate all calls at once using viem's simulateCalls
		const simulationSpinner = clack.spinner()
		simulationSpinner.start('Running simulation...')

		const { results } = await client.simulateCalls({
			account: account as Address,
			calls: calls.map((call) => ({
				to: call.to,
				data: call.data,
			})),
		})

		simulationSpinner.stop('Simulation complete')

		// Check results for failures
		const failedCalls: Array<{ index: number; call: { to: Address; data: `0x${string}` }; error?: string }> = []
		for (let i = 0; i < results.length; i++) {
			const result = results[i]
			const call = calls[i]
			if (!result || !call) continue

			if (result.status === 'failure') {
				failedCalls.push({
					index: i,
					call,
					error: result.error?.message || 'Unknown error',
				})
			}
		}

		if (failedCalls.length > 0) {
			log('')
			error('Some calls would revert:')
			for (const failed of failedCalls) {
				error(`  Call ${failed.index + 1} to ${failed.call.to}: ${failed.error}`)
			}
			return
		}

		// Get gas price
		const gasPrice = await client.getGasPrice()

		clack.log.step('Simulation results:')
		clack.log.success('All calls would succeed')

		// Show gas usage if available
		const totalGas = results.reduce((sum, r) => sum + (r.gasUsed || 0n), 0n)
		if (totalGas > 0n) {
			clack.log.message(`  Total gas: ${totalGas.toString()}`)
		}

		clack.log.message(`  Gas price: ${formatEther(gasPrice)} ETH`)
	} catch (err) {
		spinner.stop('Simulation failed')
		log('')
		error(err instanceof Error ? err.message : String(err))
	}
}
