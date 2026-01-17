import { existsSync } from 'node:fs'
import { bundleTask } from '../utils/bundler'
import { compressTask } from '../utils/compress'
import { getEnv, loadEnv } from '../utils/env'
import { extractSchemaFromTask } from '../utils/schema-extractor'
import { discoverTasks, getTaskPath, isThymeProject } from '../utils/tasks'
import { clack, error, info, intro, outro, pc, step, warn } from '../utils/ui'

export async function uploadCommand(
	taskName?: string,
	organizationId?: string,
) {
	intro('Thyme CLI - Upload Task')

	const projectRoot = process.cwd()

	// Load environment variables
	loadEnv(projectRoot)

	// Check if we're in a Thyme project
	if (!isThymeProject(projectRoot)) {
		error('Not in a Thyme project')
		process.exit(1)
	}

	// Check for auth token
	const authToken = getEnv('THYME_AUTH_TOKEN')
	if (!authToken) {
		error('Not authenticated. Run `thyme login` first.')
		process.exit(1)
	}

	// Get API URL (Convex deployment URL)
	const apiUrl = getEnv('THYME_API_URL')
	if (!apiUrl) {
		error(
			'THYME_API_URL is not set. Please set it to your Convex deployment URL in .env',
		)
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
			message: 'Select a task to upload:',
			options: tasks.map((task) => ({ value: task, label: task })),
		})

		if (clack.isCancel(selected)) {
			clack.cancel('Operation cancelled')
			process.exit(0)
		}

		finalTaskName = selected as string
	}

	// Fetch user's organizations
	const orgSpinner = clack.spinner()
	orgSpinner.start('Fetching organizations...')

	let organizations: { id: string; name: string; role: string }[] = []
	try {
		const verifyResponse = await fetch(`${apiUrl}/api/auth/verify`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		})

		if (!verifyResponse.ok) {
			orgSpinner.stop('Failed to fetch organizations')
			error('Failed to authenticate. Please run `thyme login` again.')
			process.exit(1)
		}

		const verifyData = (await verifyResponse.json()) as {
			user: {
				id: string
				name: string
				email: string
			}
			organizations: {
				id: string
				name: string
				role: string
			}[]
		}

		organizations = verifyData.organizations || []
		orgSpinner.stop('Organizations loaded')
	} catch (err) {
		orgSpinner.stop('Failed to fetch organizations')
		error(err instanceof Error ? err.message : String(err))
		process.exit(1)
	}

	// Check if user has any organizations
	if (organizations.length === 0) {
		error(
			'You are not a member of any organizations. Please create or join an organization first.',
		)
		process.exit(1)
	}

	// Determine organization to upload to
	let selectedOrgId = organizationId

	// If organization ID was provided, validate it
	if (selectedOrgId) {
		const orgExists = organizations.find((org) => org.id === selectedOrgId)
		if (!orgExists) {
			error(
				`Organization with ID "${selectedOrgId}" not found or you don't have access to it.`,
			)
			process.exit(1)
		}
	} else {
		// Prompt user to select an organization
		const selected = await clack.select({
			message: 'Select an organization to upload to:',
			options: organizations.map((org) => ({
				value: org.id,
				label: `${org.name} ${pc.dim(`(${org.role})`)}`,
			})),
		})

		if (clack.isCancel(selected)) {
			clack.cancel('Operation cancelled')
			process.exit(0)
		}

		selectedOrgId = selected as string
	}

	const taskPath = getTaskPath(projectRoot, finalTaskName)

	// Check if task exists
	if (!existsSync(taskPath)) {
		error(`Task "${finalTaskName}" not found`)
		process.exit(1)
	}

	const spinner = clack.spinner()
	spinner.start('Bundling task...')

	try {
		// Bundle task code with all dependencies
		const { source, bundle } = await bundleTask(taskPath)

		spinner.message('Extracting schema...')

		// Extract schema from source code
		const schema = extractSchemaFromTask(source)

		spinner.message('Compressing files...')

		// Compress source and bundle into ZIP
		const { zipBuffer, checksum } = compressTask(source, bundle)

		spinner.message('Uploading to cloud...')

		// Create form data
		const formData = new FormData()

		// Add metadata
		formData.append(
			'data',
			JSON.stringify({
				organizationId: selectedOrgId as string,
				checkSum: checksum,
				schema: schema || undefined,
			}),
		)

		// Add ZIP blob
		formData.append('blob', new Blob([zipBuffer]), 'task.zip')

		// Upload to API
		const response = await fetch(`${apiUrl}/api/task/upload`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
			body: formData,
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`Upload failed: ${errorText}`)
		}

		const result = (await response.json()) as { taskId?: string }

		spinner.stop('Task uploaded successfully!')

		const selectedOrg = organizations.find((org) => org.id === selectedOrgId)

		clack.log.message('')
		clack.log.success('Upload details:')
		clack.log.message(`  ${pc.dim('Task:')} ${pc.cyan(finalTaskName)}`)
		clack.log.message(
			`  ${pc.dim('Organization:')} ${pc.cyan(selectedOrg?.name || 'Unknown')}`,
		)
		clack.log.message(
			`  ${pc.dim('Size:')} ${(zipBuffer.length / 1024).toFixed(2)} KB`,
		)
		clack.log.message(`  ${pc.dim('Checksum:')} ${checksum.slice(0, 16)}...`)
		if (result.taskId) {
			clack.log.message(`  ${pc.dim('Task ID:')} ${pc.green(result.taskId)}`)
		}

		outro(
			`${pc.green('✓')} Task uploaded!\n\n` +
				`Configure triggers in the dashboard: ${pc.cyan('https://thyme.sh/dashboard')}`,
		)
	} catch (err) {
		spinner.stop('Upload failed')
		error(err instanceof Error ? err.message : String(err))
		process.exit(1)
	}
}
