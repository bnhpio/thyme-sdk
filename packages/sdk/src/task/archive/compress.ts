import { gzipSync } from 'zlib';
import type { ArchiveManifest, CompressOptions, FileEntry } from './types';

/**
 * Compresses multiple files into a single gzipped archive
 * Uses a more robust format with JSON manifest and base64-encoded content
 */
export async function compressFiles(
  files: FileEntry[],
  options: CompressOptions = {},
): Promise<Uint8Array> {
  try {
    const { level = 6, includeMetadata = true, version = '1.0.0' } = options;

    // Create manifest
    const manifest: ArchiveManifest = {
      version,
      createdAt: new Date().toISOString(),
      fileCount: files.length,
      files: files.map((file) => ({
        id: file.id,
        path: file.path,
        contentLength: file.content.length,
        metadata: includeMetadata ? file.metadata : undefined,
      })),
    };

    // Create archive structure
    const archiveData = {
      manifest,
      files: files.map((file) => ({
        id: file.id,
        path: file.path,
        content: file.content,
        metadata: includeMetadata ? file.metadata : undefined,
      })),
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(archiveData, null, 0);

    // Convert to Buffer and compress with Node.js zlib
    const data = Buffer.from(jsonString, 'utf8');
    const compressed = gzipSync(data, {
      level: Math.max(1, Math.min(9, level)),
    });

    return new Uint8Array(compressed);
  } catch (error) {
    throw new Error(`Failed to compress files: ${error}`);
  }
}
