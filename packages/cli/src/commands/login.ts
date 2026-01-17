import { existsSync } from 'node:fs'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { getEnv, loadEnv } from '../utils/env'
import { clack, error, info, intro, outro, pc } from '../utils/ui'

// Zod schema for API response validation
const verifyResponseSchema = z.object({
	user: z.object({
		id: z.string(),
		name: z.string().optional().default(''),
		email: z.string(),
	}),
	organizations: z
		.array(
			z.object({
				id: z.string(),
				name: z.string(),
				role: z.string(),
			}),
		)
		.optional()
		.default([]),
})

export async function loginCommand() {
	intro('Thyme CLI - Login')

	const projectRoot = process.cwd()
	const envPath = join(projectRoot, '.env')

	// Load environment variables
	loadEnv(projectRoot)

	// Show instructions
	info('To authenticate with Thyme Cloud:')
	clack.log.message(
		`  1. Visit ${pc.cyan('https://thyme.sh/settings/api-keys')}`,
	)
	clack.log.message('  2. Generate a new API token')
	clack.log.message('  3. Copy the token and paste it below')
	clack.log.message('')

	// Prompt for token
	const token = await clack.password({
		message: 'Paste your API token:',
		validate: (value) => {
			if (!value) return 'Token is required'
			if (value.length < 10) return 'Token seems too short'
		},
	})

	if (clack.isCancel(token)) {
		clack.cancel('Operation cancelled')
		process.exit(0)
	}

	const spinner = clack.spinner()
	spinner.start('Verifying token...')

	try {
		// Get API URL (Convex deployment URL)
		const apiUrl = getEnv('THYME_API_URL')

		if (!apiUrl) {
			spinner.stop('Configuration error')
			error(
				'THYME_API_URL is not set. Please set it to your Convex deployment URL (e.g., https://your-deployment.convex.cloud)',
			)
			process.exit(1)
		}

		// Verify token with API
		const verifyResponse = await fetch(`${apiUrl}/api/auth/verify`, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		if (!verifyResponse.ok) {
			spinner.stop('Token verification failed')
			const errorText = await verifyResponse.text()
			error(`Invalid token: ${errorText}`)
			process.exit(1)
		}

		const rawData = await verifyResponse.json()

		// Validate response with Zod
		const parseResult = verifyResponseSchema.safeParse(rawData)
		if (!parseResult.success) {
			spinner.stop('Invalid API response')
			error(`API returned unexpected data format: ${parseResult.error.message}`)
			process.exit(1)
		}

		const verifyData = parseResult.data

		spinner.stop('Token verified!')

		// Save token
		const saveSpinner = clack.spinner()
		saveSpinner.start('Saving token...')

		// Read existing .env or create new
		let envContent = ''
		if (existsSync(envPath)) {
			envContent = await readFile(envPath, 'utf-8')
		}

		// Check if THYME_AUTH_TOKEN already exists
		const tokenRegex = /^THYME_AUTH_TOKEN=.*$/m
		if (tokenRegex.test(envContent)) {
			// Replace existing token
			envContent = envContent.replace(tokenRegex, `THYME_AUTH_TOKEN=${token}`)
			await writeFile(envPath, envContent)
		} else {
			// Append new token
			const newLine = envContent && !envContent.endsWith('\n') ? '\n' : ''
			await appendFile(envPath, `${newLine}THYME_AUTH_TOKEN=${token}\n`)
		}

		saveSpinner.stop('Token saved successfully!')

		// Display user info
		clack.log.message('')
		clack.log.success('Authenticated as:')
		clack.log.message(
			`  ${pc.cyan('User:')} ${verifyData.user.name || verifyData.user.email}`,
		)
		clack.log.message(`  ${pc.cyan('Email:')} ${verifyData.user.email}`)

		if (verifyData.organizations && verifyData.organizations.length > 0) {
			clack.log.message('')
			clack.log.message(`${pc.cyan('Organizations:')}`)
			for (const org of verifyData.organizations) {
				clack.log.message(`  • ${org.name} ${pc.dim(`(${org.role})`)}`)
			}
		}

		outro(`\nYou can now upload tasks with ${pc.cyan('thyme upload')}`)
	} catch (err) {
		spinner.stop('Failed to verify token')
		error(err instanceof Error ? err.message : String(err))
		process.exit(1)
	}
}
