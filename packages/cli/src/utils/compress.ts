import { compressTask as sdkCompressTask } from '@thyme-sh/sdk'

export interface CompressResult {
	zipBuffer: Buffer
	checksum: string
}

/**
 * Compress source and bundle into a ZIP archive
 * Uses SDK's compression function with fflate
 */
export function compressTask(source: string, bundle: string): CompressResult {
	const { zipBuffer, checksum } = sdkCompressTask(source, bundle)

	// Convert Uint8Array to Buffer for Node.js
	return {
		zipBuffer: Buffer.from(zipBuffer),
		checksum,
	}
}
