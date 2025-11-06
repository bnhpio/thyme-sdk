import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { compressFiles } from '@bnhpio/thyme-sdk/task/archive';
import * as esbuild from 'esbuild';
import type { CommandModule } from 'yargs';
import z from 'zod';

const DEPLOY_URL: string = process.env.DEPLOY_URL || '';

export const uploadCommand: CommandModule = {
  command: 'upload <function>',
  describe: 'Upload a function',
  builder: (yargs) =>
    yargs
      .positional('function', {
        description: 'Function to upload',
        type: 'string',
        demandOption: true,
      })
      .option('authToken', {
        description: 'Authentication token',
        type: 'string',
        demandOption: true,
      })
      .option('organizationId', {
        description: 'Organization ID',
        type: 'string',
        demandOption: true,
      }),
  handler: async (argv) => {
    const functionName = argv.function as string;

    const sourcePath = path.join(
      process.cwd(),
      'functions',
      functionName,
      'index.ts',
    );
    const schemaPath = path.join(
      process.cwd(),
      'functions',
      functionName,
      'schema.ts',
    );
    console.log(`🚀 Deploying function: ${functionName}`);
    console.log(`📁 Source: ${sourcePath}`);
    console.log(`📋 Schema: ${schemaPath}`);
    console.log(`🌐 Deploy URL: ${DEPLOY_URL}`);

    try {
      // Step 1: Read source file
      console.log('📖 Reading source file...');
      const sourceContent = await readFile(sourcePath, 'utf-8');
      console.log('✅ Source file read');

      // Step 2: Build TypeScript to JavaScript
      console.log('📦 Building TypeScript...');
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

      // Get the compiled JavaScript content
      const jsContent = buildResult.outputFiles[0]?.text;
      if (!jsContent) {
        throw new Error('Failed to get compiled JavaScript content');
      }
      console.log('✅ TypeScript build completed');

      // Step 3: Generate JSON schema
      console.log('📋 Generating JSON schema...');
      const schemaModule = await import(schemaPath);
      const jsonSchema = z.toJSONSchema(schemaModule.schema, {
        target: 'openapi-3.0',
      });
      const schemaContent = JSON.stringify(jsonSchema, null, 2);
      console.log('✅ JSON schema generated');

      const filesToCompress = [
        {
          id: `source.ts`,
          path: `${functionName}/source.ts`,
          content: sourceContent,
        },
        {
          id: `index.js`,
          path: `${functionName}/index.js`,
          content: jsContent,
        },
        {
          id: `schema.json`,
          path: `${functionName}/schema.json`,
          content: schemaContent,
        },
      ];
      console.log('✅ Files to compress(count):', filesToCompress.length);

      const compressedData = await compressFiles(filesToCompress);
      console.log('✅ Compressed data length:', compressedData.length, 'bytes');

      // Calculate sizes
      const originalSize =
        sourceContent.length + jsContent.length + schemaContent.length;
      const compressedSize = compressedData.length;
      const compressionRatio = (
        ((originalSize - compressedSize) / originalSize) *
        100
      ).toFixed(1);

      console.log(`✅ Compression completed`);
      console.log(`   Original size: ${originalSize} bytes`);
      console.log(`   Compressed size: ${compressedSize} bytes`);
      console.log(`   Compression ratio: ${compressionRatio}%`);
      const checkSum256 = createHash('sha256')
        .update(compressedData)
        .digest('base64');
      console.log(`✅ CheckSum256: ${checkSum256}`);

      // Step 5: Deploy via API
      console.log('🚀 Deploying to server...');
      try {
        const formData = new FormData();
        formData.append(
          'data',
          JSON.stringify({
            organizationId: argv.organizationId,
            checkSum: checkSum256,
          }),
        );
        formData.append('blob', new Blob([compressedData]), 'compressed.gz');

        const response = await fetch(DEPLOY_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${argv.authToken}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to deploy function: ${response.statusText}`);
        }

        const responseData = (await response.json()) as { hash: string };

        console.log(`✅ Function deployed successfully: ${responseData.hash}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('❌ Error during deployment:', errMsg);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error during deployment:', error);
      process.exit(1);
    }
  },
};
