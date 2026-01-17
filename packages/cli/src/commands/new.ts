import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isThymeProject } from '../utils/tasks'
import { clack, error, intro, outro, pc } from '../utils/ui'

export async function newCommand(taskName?: string) {
	intro('Thyme CLI - Create New Task')

	const projectRoot = process.cwd()

	// Check if we're in a Thyme project
	if (!isThymeProject(projectRoot)) {
		error('Not in a Thyme project. Run `thyme init` first.')
		process.exit(1)
	}

	// Prompt for task name if not provided
	let finalTaskName = taskName
	if (!finalTaskName) {
		const name = await clack.text({
			message: 'What is your task name?',
			placeholder: 'my-task',
			validate: (value) => {
				if (!value) return 'Task name is required'
				if (!/^[a-z0-9-]+$/.test(value))
					return 'Task name must be lowercase alphanumeric with hyphens'
			},
		})

		if (clack.isCancel(name)) {
			clack.cancel('Operation cancelled')
			process.exit(0)
		}

		finalTaskName = name as string
	}

	const taskPath = join(projectRoot, 'functions', finalTaskName)

	// Check if task already exists
	if (existsSync(taskPath)) {
		error(`Task "${finalTaskName}" already exists`)
		process.exit(1)
	}

	const spinner = clack.spinner()
	spinner.start('Creating task...')

	try {
		// Create task directory
		await mkdir(taskPath, { recursive: true })

		// Create index.ts
		const indexTs = `import { defineTask, z } from '@thyme-sh/sdk'
import { encodeFunctionData } from 'viem'

export default defineTask({
	schema: z.object({
		targetAddress: z.address(),
	}),

	async run(ctx) {
		const { targetAddress } = ctx.args

		// Your task logic here
		console.log('Running task with address:', targetAddress)

		// Example: Read from blockchain using the public client
		// const balance = await ctx.client.getBalance({ address: targetAddress })
		// const blockNumber = await ctx.client.getBlockNumber()
		// const value = await ctx.client.readContract({
		//   address: targetAddress,
		//   abi: [...],
		//   functionName: 'balanceOf',
		//   args: [someAddress],
		// })

		// Example: Return calls to execute
		return {
			canExec: true,
			calls: [
				{
					to: targetAddress,
					data: '0x' as const,
				},
			],
		}

		// Example with encodeFunctionData:
		// const abi = [...] as const
		// return {
		//   canExec: true,
		//   calls: [
		//     {
		//       to: targetAddress,
		//       data: encodeFunctionData({
		//         abi,
		//         functionName: 'transfer',
		//         args: [recipientAddress, 1000n],
		//       }),
		//     },
		//   ],
		// }

		// Or return false if conditions not met
		// return {
		//   canExec: false,
		//   message: 'Conditions not met'
		// }
	},
})
`

		await writeFile(join(taskPath, 'index.ts'), indexTs)

		// Create args.json
		const args = {
			targetAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
		}

		await writeFile(join(taskPath, 'args.json'), JSON.stringify(args, null, 2))

		spinner.stop('Task created successfully!')

		outro(
			`${pc.green('✓')} Task "${finalTaskName}" created!\n\nNext steps:\n  ${pc.cyan('Edit')} functions/${finalTaskName}/index.ts\n  ${pc.cyan('Update')} functions/${finalTaskName}/args.json\n  ${pc.cyan('thyme run')} ${finalTaskName}`,
		)
	} catch (err) {
		spinner.stop('Failed to create task')
		error(err instanceof Error ? err.message : String(err))
		process.exit(1)
	}
}
