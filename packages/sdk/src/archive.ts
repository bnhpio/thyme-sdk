import { createHash } from 'node:crypto'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

export interface CompressResult {
	zipBuffer: Uint8Array
	checksum: string
}

export interface DecompressResult {
	source: string
	bundle: string
}

// Maximum sizes for ZIP bomb protection
const MAX_ZIP_SIZE = 10 * 1024 * 1024 // 10MB compressed
const MAX_DECOMPRESSED_SIZE = 50 * 1024 * 1024 // 50MB decompressed

/**
 * Calculate SHA-256 checksum of data
 */
function calculateSha256(data: Uint8Array): string {
	return createHash('sha256').update(data).digest('hex')
}

/**
 * Compress source and bundle into a ZIP archive
 * Uses fflate for fast, modern compression
 * Uses SHA-256 for cryptographically secure checksum
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

	// Calculate SHA-256 checksum
	const checksum = calculateSha256(compressed)

	return {
		zipBuffer: compressed,
		checksum,
	}
}

/**
 * Decompress ZIP archive and extract source and bundle files
 * Uses fflate for fast decompression
 * Includes ZIP bomb protection
 */
export function decompressTask(
	zipBuffer: Uint8Array | ArrayBuffer,
): DecompressResult {
	// Convert ArrayBuffer to Uint8Array if needed
	const uint8Array =
		zipBuffer instanceof ArrayBuffer ? new Uint8Array(zipBuffer) : zipBuffer

	// ZIP bomb protection: check compressed size
	if (uint8Array.length > MAX_ZIP_SIZE) {
		throw new Error(
			`ZIP file too large: ${uint8Array.length} bytes (max: ${MAX_ZIP_SIZE})`,
		)
	}

	// Decompress ZIP
	const decompressed = unzipSync(uint8Array)

	// ZIP bomb protection: check total decompressed size
	let totalDecompressedSize = 0
	for (const key of Object.keys(decompressed)) {
		const file = decompressed[key]
		if (file) {
			totalDecompressedSize += file.length
		}
	}

	if (totalDecompressedSize > MAX_DECOMPRESSED_SIZE) {
		throw new Error(
			`Decompressed content too large: ${totalDecompressedSize} bytes (max: ${MAX_DECOMPRESSED_SIZE})`,
		)
	}

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
