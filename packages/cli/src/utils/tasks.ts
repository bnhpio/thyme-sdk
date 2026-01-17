import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Discover all tasks in the functions directory
 */
export async function discoverTasks(projectRoot: string): Promise<string[]> {
	const functionsDir = join(projectRoot, 'functions')

	if (!existsSync(functionsDir)) {
		return []
	}

	try {
		const entries = await readdir(functionsDir, { withFileTypes: true })

		return entries
			.filter((e) => e.isDirectory())
			.filter((e) => existsSync(join(functionsDir, e.name, 'index.ts')))
			.map((e) => e.name)
	} catch {
		return []
	}
}

/**
 * Get the path to a task's index file
 */
export function getTaskPath(projectRoot: string, taskName: string): string {
	return join(projectRoot, 'functions', taskName, 'index.ts')
}

/**
 * Get the path to a task's args file
 */
export function getTaskArgsPath(projectRoot: string, taskName: string): string {
	return join(projectRoot, 'functions', taskName, 'args.json')
}

/**
 * Check if we're in a Thyme project
 */
export function isThymeProject(projectRoot: string): boolean {
	const functionsDir = join(projectRoot, 'functions')
	return existsSync(functionsDir)
}
