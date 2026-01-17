import { readFile } from 'node:fs/promises'
import { build } from 'esbuild'

export interface BundleResult {
	source: string
	bundle: string
}

/**
 * Bundle task code with all dependencies using esbuild
 * Target: ESM format for Deno compatibility
 */
export async function bundleTask(taskPath: string): Promise<BundleResult> {
	// Read original source
	const source = await readFile(taskPath, 'utf-8')

	// Node.js built-in modules (bare names without node: prefix)
	const nodeBuiltinNames = [
		'assert',
		'buffer',
		'child_process',
		'cluster',
		'crypto',
		'dgram',
		'dns',
		'events',
		'fs',
		'http',
		'http2',
		'https',
		'net',
		'os',
		'path',
		'perf_hooks',
		'process',
		'querystring',
		'readline',
		'stream',
		'string_decoder',
		'timers',
		'tls',
		'tty',
		'url',
		'util',
		'v8',
		'vm',
		'zlib',
	]

	// Create alias map to rewrite bare Node.js imports to node: prefix
	// This is required for Deno compatibility (Deno requires node: prefix)
	const nodeBuiltinAlias: Record<string, string> = {}
	for (const name of nodeBuiltinNames) {
		nodeBuiltinAlias[name] = `node:${name}`
	}

	// Only mark node: prefixed versions as external (after alias rewrites them)
	const nodeBuiltinsExternal = nodeBuiltinNames.map((name) => `node:${name}`)

	// Bundle with esbuild
	const result = await build({
		entryPoints: [taskPath],
		bundle: true,
		format: 'esm',
		platform: 'neutral',
		target: 'esnext',
		write: false,
		treeShaking: true,
		minify: false, // Keep readable for debugging
		sourcemap: false,
		alias: nodeBuiltinAlias, // Rewrite bare imports to node: prefix for Deno
		external: nodeBuiltinsExternal, // Don't bundle Node.js built-ins
		logLevel: 'silent',
	})

	if (result.outputFiles.length === 0) {
		throw new Error('No output from bundler')
	}

	const outputFile = result.outputFiles[0]
	if (!outputFile) {
		throw new Error('No output from bundler')
	}

	const bundle = outputFile.text

	return {
		source,
		bundle,
	}
}
