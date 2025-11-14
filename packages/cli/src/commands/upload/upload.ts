import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { compressFiles } from '@bnhpio/thyme-sdk/archive';
import * as esbuild from 'esbuild';
import z from 'zod';
import type {
  BuildArtifacts,
  CompressionResult,
  DeploymentResponse,
  UploadFunctionPaths,
  UploadOptions,
} from './types';

const DEPLOY_URL: string = process.env.DEPLOY_URL || '';

/**
 * Main upload function that orchestrates the upload of a function
 *
 * This function:
 * 1. Validates function name and file paths
 * 2. Validates file existence and accessibility
 * 3. Reads and builds the source file
 * 4. Generates JSON schema from Zod schema
 * 5. Compresses all files
 * 6. Deploys to the server
 *
 * @param functionName - Name of the function to upload
 * @param options - Upload options including auth token and organization ID
 * @throws Error if validation fails or upload encounters an error
 */
export async function upload(
  functionName: string,
  options: UploadOptions,
): Promise<void> {
  // Validate function name to prevent path traversal
  if (!isValidFunctionName(functionName)) {
    throw new Error(
      `Invalid function name: "${functionName}". Function names must contain only alphanumeric characters, hyphens, and underscores.`,
    );
  }

  // Validate deploy URL
  if (!DEPLOY_URL) {
    throw new Error(
      'DEPLOY_URL environment variable is not set. Please set it before uploading.',
    );
  }

  // Build and validate file paths
  const paths = buildUploadFunctionPaths(functionName);
  await validateUploadPaths(paths);

  // Display initial information
  displayUploadInfo(functionName, paths);

  // Build artifacts (source, compiled JS, schema)
  const artifacts = await buildArtifacts(paths);

  // Compress files
  const compressionResult = await compressArtifacts(functionName, artifacts);

  // Display compression info
  displayCompressionInfo(compressionResult);

  // Deploy to server
  const deploymentResponse = await deployToServer(compressionResult, options);

  console.log(`✅ Function deployed successfully: ${deploymentResponse.hash}`);
}

/**
 * Validates that a function name is safe and doesn't contain path traversal characters
 *
 * @param functionName - The function name to validate
 * @returns True if the function name is valid, false otherwise
 */
function isValidFunctionName(functionName: string): boolean {
  // Allow alphanumeric, hyphens, and underscores only
  // Prevent path traversal attempts (../, ./, etc.)
  return /^[a-zA-Z0-9_-]+$/.test(functionName);
}

/**
 * Builds file paths for a function's source and schema files
 *
 * @param functionName - Name of the function
 * @returns Object containing all relevant file paths
 */
export function buildUploadFunctionPaths(
  functionName: string,
): UploadFunctionPaths {
  const cwd = process.cwd();
  const functionDir = path.join(cwd, 'functions', functionName);

  return {
    sourcePath: path.join(functionDir, 'index.ts'),
    schemaPath: path.join(functionDir, 'schema.ts'),
    functionDir,
  };
}

/**
 * Validates that all required files exist and are accessible
 *
 * Checks:
 * - Function directory exists
 * - Source file (index.ts) exists and is readable
 * - Schema file (schema.ts) exists and is readable
 *
 * @param paths - Object containing file paths to validate
 * @throws Error if any required file is missing or inaccessible
 */
async function validateUploadPaths(paths: UploadFunctionPaths): Promise<void> {
  const errors: string[] = [];

  // Check function directory
  try {
    await access(paths.functionDir, constants.F_OK);
  } catch {
    errors.push(
      `Function directory not found: ${paths.functionDir}. Make sure the function exists in ./functions/${path.basename(paths.functionDir)}/`,
    );
  }

  // Check source file
  try {
    await access(paths.sourcePath, constants.F_OK | constants.R_OK);
  } catch {
    errors.push(
      `Source file not found or not readable: ${paths.sourcePath}. Expected index.ts in function directory.`,
    );
  }

  // Check schema file
  try {
    await access(paths.schemaPath, constants.F_OK | constants.R_OK);
  } catch {
    errors.push(
      `Schema file not found or not readable: ${paths.schemaPath}. Expected schema.ts in function directory.`,
    );
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Displays initial upload information
 *
 * @param functionName - Name of the function being uploaded
 * @param paths - File paths being used
 */
function displayUploadInfo(
  functionName: string,
  paths: UploadFunctionPaths,
): void {
  console.log(`🚀 Deploying function: ${functionName}`);
  console.log(`📁 Source: ${paths.sourcePath}`);
  console.log(`📋 Schema: ${paths.schemaPath}`);
  console.log(`🌐 Deploy URL: ${DEPLOY_URL}`);
}

/**
 * Builds all artifacts needed for deployment
 *
 * This includes:
 * - Reading the source file
 * - Compiling TypeScript to JavaScript
 * - Generating JSON schema from Zod schema
 *
 * @param paths - File paths for source and schema
 * @returns Build artifacts containing source, compiled JS, and schema
 * @throws Error if build process fails
 */
export async function buildArtifacts(
  paths: UploadFunctionPaths,
): Promise<BuildArtifacts> {
  // Step 1: Read source file
  console.log('📖 Reading source file...');
  const sourceContent = await readFile(paths.sourcePath, 'utf-8');
  console.log('✅ Source file read');

  // Step 2: Build TypeScript to JavaScript
  console.log('📦 Building TypeScript...');
  const jsContent = await buildTypeScript(paths.sourcePath);
  console.log('✅ TypeScript build completed');

  // Step 3: Generate JSON schema
  console.log('📋 Generating JSON schema...');
  const schemaContent = await generateJsonSchema(paths.schemaPath);
  console.log('✅ JSON schema generated');

  return {
    sourceContent,
    jsContent,
    schemaContent,
  };
}

/**
 * Compiles TypeScript source to JavaScript using esbuild
 *
 * @param sourcePath - Path to the TypeScript source file
 * @returns Compiled JavaScript content
 * @throws Error if build fails
 */
async function buildTypeScript(sourcePath: string): Promise<string> {
  const buildResult = await esbuild.build({
    entryPoints: [sourcePath],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    minify: true,
    sourcemap: false,
    write: false,
  });

  if (buildResult.errors.length > 0) {
    throw new Error(
      `Build failed: ${buildResult.errors.map((e: esbuild.Message) => e.text).join('\n')}`,
    );
  }

  const jsContent = buildResult.outputFiles[0]?.text;
  if (!jsContent) {
    throw new Error('Failed to get compiled JavaScript content');
  }

  return jsContent;
}

/**
 * Generates JSON schema from Zod schema file
 *
 * @param schemaPath - Path to the schema.ts file
 * @returns JSON schema as string
 * @throws Error if schema loading or generation fails
 */
async function generateJsonSchema(schemaPath: string): Promise<string> {
  try {
    const schemaModule: { schema: z.ZodSchema<unknown> } = await import(
      path.resolve(schemaPath)
    );
    const jsonSchema = z.toJSONSchema(schemaModule.schema, {
      target: 'openapi-3.0',
    });
    return JSON.stringify(jsonSchema, null, 2);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to generate JSON schema from ${schemaPath}: ${errorMessage}`,
    );
  }
}

/**
 * Compresses build artifacts into a single compressed file
 *
 * @param functionName - Name of the function
 * @param artifacts - Build artifacts to compress
 * @returns Compression result with checksum and statistics
 * @throws Error if compression fails
 */
async function compressArtifacts(
  functionName: string,
  artifacts: BuildArtifacts,
): Promise<CompressionResult> {
  const filesToCompress = [
    {
      id: 'source.ts',
      path: `${functionName}/source.ts`,
      content: artifacts.sourceContent,
    },
    {
      id: 'index.js',
      path: `${functionName}/index.js`,
      content: artifacts.jsContent,
    },
    {
      id: 'schema.json',
      path: `${functionName}/schema.json`,
      content: artifacts.schemaContent,
    },
  ];

  console.log('✅ Files to compress(count):', filesToCompress.length);

  const compressedData = await compressFiles(filesToCompress);
  console.log('✅ Compressed data length:', compressedData.length, 'bytes');

  // Calculate sizes
  const originalSize =
    artifacts.sourceContent.length +
    artifacts.jsContent.length +
    artifacts.schemaContent.length;
  const compressedSize = compressedData.length;
  const compressionRatio = (
    ((originalSize - compressedSize) / originalSize) *
    100
  ).toFixed(1);

  // Calculate checksum
  const checksum = createHash('sha256').update(compressedData).digest('base64');

  return {
    compressedData,
    checksum,
    originalSize,
    compressedSize,
    compressionRatio,
  };
}

/**
 * Displays compression statistics
 *
 * @param result - Compression result containing statistics
 */
function displayCompressionInfo(result: CompressionResult): void {
  console.log(`✅ Compression completed`);
  console.log(`   Original size: ${result.originalSize} bytes`);
  console.log(`   Compressed size: ${result.compressedSize} bytes`);
  console.log(`   Compression ratio: ${result.compressionRatio}%`);
  console.log(`✅ CheckSum256: ${result.checksum}`);
}

/**
 * Deploys compressed artifacts to the server
 *
 * @param compressionResult - Compression result containing data and checksum
 * @param options - Upload options including auth token and organization ID
 * @returns Deployment response with hash
 * @throws Error if deployment fails
 */
async function deployToServer(
  compressionResult: CompressionResult,
  options: UploadOptions,
): Promise<DeploymentResponse> {
  console.log('🚀 Deploying to server...');

  try {
    const formData = new FormData();
    formData.append(
      'data',
      JSON.stringify({
        organizationId: options.organizationId,
        checkSum: compressionResult.checksum,
      }),
    );
    formData.append(
      'blob',
      new Blob([compressionResult.compressedData]),
      'compressed.gz',
    );

    const response = await fetch(DEPLOY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.authToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to deploy function: ${errorText}`);
    }

    const responseData = (await response.json()) as DeploymentResponse;
    return responseData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Deployment failed: ${errorMessage}`);
  }
}
