/**
 * Organization interface from API response
 */
export interface Organization {
  /** Organization ID */
  id: string;
  /** Organization name */
  name: string;
  /** Organization slug */
  slug: string;
  /** User's role in the organization */
  role: string;
}

/**
 * Organizations API response interface
 */
export interface OrganizationsResponse {
  /** List of organizations */
  organizations: Organization[];
}

/**
 * Command options interface for the upload command
 */
export interface UploadOptions {
  /** Authentication token for deployment (optional if set via env vars) */
  authToken?: string;
  /** Organization ID for deployment (optional - will prompt if not provided) */
  organizationId?: string;
  /** Environment file to use (default: .env) */
  envFile?: string;
}

/**
 * Paths interface for function-related file paths (upload-specific)
 */
export interface UploadFunctionPaths {
  /** Path to the function's index.ts file */
  sourcePath: string;
  /** Path to the function's schema.ts file */
  schemaPath: string;
  /** Base directory for the function */
  functionDir: string;
}

/**
 * Build artifacts interface
 */
export interface BuildArtifacts {
  /** Original source TypeScript content */
  sourceContent: string;
  /** Compiled JavaScript content */
  jsContent: string;
  /** JSON schema content */
  schemaContent: string;
}

/**
 * Compression result interface
 */
export interface CompressionResult {
  /** Compressed data as Uint8Array */
  compressedData: Uint8Array;
  /** SHA256 checksum of compressed data */
  checksum: string;
  /** Original size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Compression ratio as percentage */
  compressionRatio: string;
}

/**
 * Deployment response interface
 */
export interface DeploymentResponse {
  /** Deployment hash/identifier */
  hash: string;
}
