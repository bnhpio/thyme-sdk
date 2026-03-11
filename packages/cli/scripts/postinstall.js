import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_API_URL =
	'https://convex-backend-production-f25e.up.railway.app/http'

function getConfigDir() {
	const dir = join(homedir(), '.thyme')
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true })
	}
	return dir
}

function getConfigPath() {
	return join(getConfigDir(), 'config.json')
}

function readConfig(configPath) {
	if (!existsSync(configPath)) {
		return {}
	}
	try {
		return JSON.parse(readFileSync(configPath, 'utf-8'))
	} catch {
		return {}
	}
}

function main() {
	const configPath = getConfigPath()
	const config = readConfig(configPath)

	// Do not override user-defined API URL.
	if (config.apiUrl) {
		return
	}

	config.apiUrl = DEFAULT_API_URL
	writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 })
	chmodSync(configPath, 0o600)
}

try {
	main()
} catch {
	// Ignore postinstall failures to avoid blocking npm install.
}
