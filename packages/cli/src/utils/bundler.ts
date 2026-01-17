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

	// Node.js built-in modules that should not be bundled
	const nodeBuiltins = [
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
		// Node: prefix versions
		'node:assert',
		'node:buffer',
		'node:child_process',
		'node:cluster',
		'node:crypto',
		'node:dgram',
		'node:dns',
		'node:events',
		'node:fs',
		'node:http',
		'node:http2',
		'node:https',
		'node:net',
		'node:os',
		'node:path',
		'node:perf_hooks',
		'node:process',
		'node:querystring',
		'node:readline',
		'node:stream',
		'node:string_decoder',
		'node:timers',
		'node:tls',
		'node:tty',
		'node:url',
		'node:util',
		'node:v8',
		'node:vm',
		'node:zlib',
	]

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
		external: nodeBuiltins, // Don't bundle Node.js built-ins
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
