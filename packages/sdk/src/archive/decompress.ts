import { gunzipSync } from 'zlib';
import type { ArchiveManifest, DecompressResult, FileEntry } from './';

/**
 * Decompresses a gzipped archive containing multiple files
 * Returns both the extracted files and the archive manifest
 */
export async function decompressFiles(
  compressedData: Uint8Array,
): Promise<DecompressResult> {
  try {
    // Decompress using Node.js zlib gunzip
    const decompressed = gunzipSync(Buffer.from(compressedData));

    // Convert back to string
    const jsonString = decompressed.toString('utf8');

    // Parse JSON archive data
    const archiveData = JSON.parse(jsonString) as {
      manifest: ArchiveManifest;
      files: Array<{
        id: string;
        path: string;
        content: string;
        metadata?: Record<string, unknown>;
      }>;
    };

    // Validate manifest
    if (!archiveData.manifest || !archiveData.files) {
      throw new Error('Invalid archive format: missing manifest or files');
    }

    // Convert to FileEntry format
    const files: FileEntry[] = archiveData.files.map((file) => ({
      id: file.id,
      path: file.path,
      content: file.content,
      metadata: file.metadata,
    }));

    return {
      files,
      manifest: archiveData.manifest,
    };
  } catch (error) {
    throw new Error(`Failed to decompress files: ${error}`);
  }
}
