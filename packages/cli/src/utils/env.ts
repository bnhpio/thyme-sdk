import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { config } from 'dotenv'

/**
 * Load environment variables from .env file
 */
export function loadEnv(projectRoot: string): void {
	const envPath = join(projectRoot, '.env')
	if (existsSync(envPath)) {
		config({ path: envPath })
	}
}

/**
 * Get environment variable with fallback
 */
export function getEnv(key: string, fallback?: string): string | undefined {
	return process.env[key] ?? fallback
}

/**
 * Get required environment variable
 */
export function getRequiredEnv(key: string): string {
	const value = process.env[key]
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`)
	}
	return value
}
