import { exec } from 'node:child_process'
import { platform } from 'node:os'
import { z } from 'zod'
import { getApiUrl, getAuthToken, setAuthToken } from '../utils/config'
import { loadEnv } from '../utils/env'
import { clack, error, info, intro, outro, pc } from '../utils/ui'

const projectSchema = z.object({
	id: z.string(),
	name: z.string(),
})

const workspaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	role: z.string(),
	projects: z.array(projectSchema).optional().default([]),
})

const verifyResponseSchema = z.object({
	user: z.object({
		id: z.string(),
		name: z.string().optional().default(''),
		email: z.string(),
	}),
	workspaces: z.array(workspaceSchema).optional().default([]),
})

interface LoginOptions {
	browserless?: boolean
	token?: boolean
}

interface AuthStartBrowserResponse {
	sessionId: string
	sessionSecret: string
	loginUrl: string
}

interface AuthStartBrowserlessResponse {
	sessionId: string
	sessionSecret: string
	pairingCode: string
	verifyUrl: string
}

interface AuthPollPendingResponse {
	status: 'pending'
}

interface AuthPollCompleteResponse {
	status: 'complete'
	token: string
}

interface AuthPollExpiredResponse {
	status: 'expired'
}

type AuthPollResponse =
	| AuthPollPendingResponse
	| AuthPollCompleteResponse
	| AuthPollExpiredResponse

function openBrowser(url: string): void {
	const os = platform()
	const cmd =
		os === 'darwin'
			? `open "${url}"`
			: os === 'win32'
				? `start "${url}"`
				: `xdg-open "${url}"`
	exec(cmd)
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function resolveApiUrl(): string | undefined {
	// Load .env from current project if available
	loadEnv(process.cwd())
	return getApiUrl()
}

async function verifyAndDisplayUser(apiUrl: string, token: string) {
	const spinner = clack.spinner()
	spinner.start('Verifying token...')

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
	const parseResult = verifyResponseSchema.safeParse(rawData)
	if (!parseResult.success) {
		spinner.stop('Invalid API response')
		error(`API returned unexpected data format: ${parseResult.error.message}`)
		process.exit(1)
	}

	const verifyData = parseResult.data
	spinner.stop('Token verified!')

	clack.log.message('')
	clack.log.success('Authenticated as:')
	clack.log.message(
		`  ${pc.cyan('User:')} ${verifyData.user.name || verifyData.user.email}`,
	)
	clack.log.message(`  ${pc.cyan('Email:')} ${verifyData.user.email}`)

	if (verifyData.workspaces && verifyData.workspaces.length > 0) {
		clack.log.message('')
		clack.log.message(`${pc.cyan('Workspaces:')}`)
		for (const ws of verifyData.workspaces) {
			clack.log.message(`  • ${ws.name} ${pc.dim(`(${ws.role})`)}`)
			for (const proj of ws.projects) {
				clack.log.message(`    └ ${proj.name}`)
			}
		}
	}
}

async function browserLogin(apiUrl: string) {
	const spinner = clack.spinner()
	spinner.start('Starting authentication...')

	const startResponse = await fetch(`${apiUrl}/api/cli/auth/start`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ browserless: false }),
	})

	if (!startResponse.ok) {
		spinner.stop('Failed to start authentication')
		error(await startResponse.text())
		process.exit(1)
	}

	const { sessionId, sessionSecret, loginUrl } =
		(await startResponse.json()) as AuthStartBrowserResponse
	spinner.stop('Opening browser...')

	openBrowser(loginUrl)

	clack.log.message('')
	info(`If the browser didn't open, visit:\n  ${pc.cyan(loginUrl)}`)
	clack.log.message('')

	return pollForToken(apiUrl, sessionId, sessionSecret)
}

async function browserlessLogin(apiUrl: string) {
	const spinner = clack.spinner()
	spinner.start('Starting authentication...')

	const startResponse = await fetch(`${apiUrl}/api/cli/auth/start`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ browserless: true }),
	})

	if (!startResponse.ok) {
		spinner.stop('Failed to start authentication')
		error(await startResponse.text())
		process.exit(1)
	}

	const { sessionId, sessionSecret, pairingCode, verifyUrl } =
		(await startResponse.json()) as AuthStartBrowserlessResponse
	spinner.stop('Ready')

	clack.log.message('')
	clack.log.message(`  Go to:     ${pc.cyan(verifyUrl)}`)
	clack.log.message(`  Enter code: ${pc.bold(pc.cyan(pairingCode))}`)
	clack.log.message('')

	return pollForToken(apiUrl, sessionId, sessionSecret)
}

async function pollForToken(
	apiUrl: string,
	sessionId: string,
	sessionSecret: string,
): Promise<string> {
	const spinner = clack.spinner()
	spinner.start('Waiting for approval...')

	const timeout = 5 * 60 * 1000 // 5 minutes
	const start = Date.now()

	while (Date.now() - start < timeout) {
		await sleep(2000)

		const pollResponse = await fetch(
			`${apiUrl}/api/cli/auth/poll?sessionId=${encodeURIComponent(sessionId)}&secret=${encodeURIComponent(sessionSecret)}`,
		)

		if (!pollResponse.ok) {
			const errorText = await pollResponse.text()
			spinner.stop('Authentication failed')
			error(errorText)
			process.exit(1)
		}

		const data = (await pollResponse.json()) as AuthPollResponse

		if (data.status === 'complete') {
			spinner.stop('Approved!')
			return data.token
		}

		if (data.status === 'expired') {
			spinner.stop('Session expired')
			error('Authentication session expired. Please try again.')
			process.exit(1)
		}
	}

	spinner.stop('Timed out')
	error('Authentication timed out after 5 minutes. Please try again.')
	process.exit(1)
}

async function tokenLogin(_apiUrl: string) {
	info('To authenticate with Thyme Cloud:')
	clack.log.message(
		`  1. Visit ${pc.cyan('https://thyme.sh/dashboard/api-keys')}`,
	)
	clack.log.message('  2. Generate a new API token')
	clack.log.message('  3. Copy the token and paste it below')
	clack.log.message('')

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

	return token as string
}

export async function loginCommand(options: LoginOptions = {}) {
	intro('Thyme CLI - Login')

	// Check if already authenticated
	const existingToken = getAuthToken()
	if (existingToken && !options.token) {
		const shouldContinue = await clack.confirm({
			message: 'You are already logged in. Do you want to re-authenticate?',
		})
		if (clack.isCancel(shouldContinue) || !shouldContinue) {
			clack.cancel('Operation cancelled')
			process.exit(0)
		}
	}

	const apiUrl = resolveApiUrl()
	if (!apiUrl) {
		error(
			'THYME_API_URL is not set. Please set it to your Convex deployment URL (e.g., https://your-deployment.convex.cloud)',
		)
		process.exit(1)
	}

	try {
		let token: string

		if (options.token) {
			token = await tokenLogin(apiUrl)
		} else if (options.browserless) {
			token = await browserlessLogin(apiUrl)
		} else {
			token = await browserLogin(apiUrl)
		}

		// Save token
		setAuthToken(token)
		clack.log.step('Token saved to ~/.thyme/config.json')

		// Verify and display user info
		await verifyAndDisplayUser(apiUrl, token)

		outro(`\nYou can now upload tasks with ${pc.cyan('thyme upload')}`)
	} catch (err) {
		error(err instanceof Error ? err.message : String(err))
		process.exit(1)
	}
}
