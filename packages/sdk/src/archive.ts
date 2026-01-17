import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

export interface CompressResult {
	zipBuffer: Uint8Array
	checksum: string
}

export interface DecompressResult {
	source: string
	bundle: string
}

/**
 * Compress source and bundle into a ZIP archive
 * Uses fflate for fast, modern compression
 */
export function compressTask(source: string, bundle: string): CompressResult {
	// Create ZIP archive with both files
	const files = {
		'source.ts': strToU8(source),
		'bundle.js': strToU8(bundle),
	}

	const compressed = zipSync(files, {
		level: 6, // Balanced compression
	})

	// Calculate checksum (simple hash for now)
	let hash = 0
	for (let i = 0; i < compressed.length; i++) {
		const byte = compressed[i]
		if (byte !== undefined) {
			hash = (hash << 5) - hash + byte
			hash = hash & hash // Convert to 32bit integer
		}
	}
	const checksum = Math.abs(hash).toString(16)

	return {
		zipBuffer: compressed,
		checksum,
	}
}

/**
 * Decompress ZIP archive and extract source and bundle files
 * Uses fflate for fast decompression
 */
export function decompressTask(
	zipBuffer: Uint8Array | ArrayBuffer,
): DecompressResult {
	// Convert ArrayBuffer to Uint8Array if needed
	const uint8Array =
		zipBuffer instanceof ArrayBuffer ? new Uint8Array(zipBuffer) : zipBuffer

	// Decompress ZIP
	const decompressed = unzipSync(uint8Array)

	// Extract files
	const sourceBytes = decompressed['source.ts']
	const bundleBytes = decompressed['bundle.js']

	if (!sourceBytes) {
		throw new Error('source.ts not found in ZIP archive')
	}

	if (!bundleBytes) {
		throw new Error('bundle.js not found in ZIP archive')
	}

	// Convert bytes to strings
	const source = strFromU8(sourceBytes)
	const bundle = strFromU8(bundleBytes)

	return {
		source,
		bundle,
	}
}
