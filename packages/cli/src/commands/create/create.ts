import { constants } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CreateOptions } from './types';

/**
 * Validates that a function name is safe and doesn't contain path traversal characters
 */
function isValidFunctionName(functionName: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(functionName);
}

/**
 * Checks if we're in an existing thyme project
 */
async function isThymeProject(projectPath: string): Promise<boolean> {
  const untlPath = path.join(projectPath, 'untl.toml');
  const functionsPath = path.join(projectPath, 'functions');

  try {
    await access(untlPath, constants.F_OK);
    return true;
  } catch {
    // Check if functions directory exists
    try {
      await access(functionsPath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Creates a new thyme project structure
 */
async function createProject(
  projectPath: string,
  projectName: string,
): Promise<void> {
  console.log(`🚀 Creating new Thyme project: ${projectName}`);

  // Create project directory
  await mkdir(projectPath, { recursive: true });

  // Create functions directory
  const functionsPath = path.join(projectPath, 'functions');
  await mkdir(functionsPath, { recursive: true });

  // Create package.json
  const packageJson = {
    name: projectName,
    version: '0.0.1',
    type: 'module',
    private: true,
    scripts: {
      build: 'tsc',
      dev: 'tsc --watch',
    },
    devDependencies: {
      '@types/bun': 'latest',
      typescript: '^5.9.3',
    },
    dependencies: {
      viem: '^2.38.0',
      zod: '^4.1.12',
      '@bnhpio/thyme-sdk': '0.0.4',
      '@bnhpio/thyme-cli': '0.0.1',
    },
  };

  await writeFile(
    path.join(projectPath, 'package.json'),
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf-8',
  );

  // Create tsconfig.json
  const tsconfig = {
    compilerOptions: {
      lib: ['ESNext'],
      target: 'ESNext',
      module: 'Preserve',
      moduleDetection: 'force',
      jsx: 'react-jsx',
      allowJs: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      noFallthroughCasesInSwitch: true,
      noUncheckedIndexedAccess: true,
      noImplicitOverride: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      noPropertyAccessFromIndexSignature: false,
    },
  };

  await writeFile(
    path.join(projectPath, 'tsconfig.json'),
    JSON.stringify(tsconfig, null, 2) + '\n',
    'utf-8',
  );

  // Create untl.toml
  const untlToml = `# Thyme project configuration
# Define profiles for different environments

[profiles]

[profiles.local]
rpcUrl = "$RPC_URL"
publicKey = "$PUBLIC_KEY"

[profiles.sepolia]
rpcUrl = "$SEPOLIA_RPC_URL"
publicKey = "$SEPOLIA_PUBLIC_KEY"
`;

  await writeFile(path.join(projectPath, 'untl.toml'), untlToml, 'utf-8');

  // Create .env.example
  const envExample = `# Environment variables for Thyme project
# Copy this file to .env and fill in your values

RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
PUBLIC_KEY=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
SEPOLIA_PUBLIC_KEY=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

DEPLOY_URL=https://api.example.com/deploy
THYME_AUTH_TOKEN=
`;

  await writeFile(path.join(projectPath, '.env.example'), envExample, 'utf-8');

  // Create .gitignore
  const gitignore = `# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables
.env
.env.local
.env.*.local

# Build outputs
dist/
build/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
`;

  await writeFile(path.join(projectPath, '.gitignore'), gitignore, 'utf-8');

  console.log('✅ Project structure created');
}

/**
 * Creates a new function template
 */
async function createFunction(
  functionName: string,
  projectPath: string,
  _template: string,
): Promise<void> {
  if (!isValidFunctionName(functionName)) {
    throw new Error(
      `Invalid function name: "${functionName}". Function names must contain only alphanumeric characters, hyphens, and underscores.`,
    );
  }

  const functionDir = path.join(projectPath, 'functions', functionName);

  // Check if function already exists
  try {
    await access(functionDir, constants.F_OK);
    throw new Error(
      `Function "${functionName}" already exists at ${functionDir}`,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    // Directory doesn't exist, continue
  }

  // Create function directory
  await mkdir(functionDir, { recursive: true });

  // Create index.ts
  const indexTs = `import { onFail, onRun, onSuccess } from '@bnhpio/thyme-sdk/runner';
import { isAddress, zeroAddress } from 'viem';
import type { Args } from './schema';

const run = onRun<Args>(async (ctx) => {
	const { address } = ctx.userArgs;

	if (isAddress(address)) {
		return {
			canExec: true,
			calls: [
				{
					to: zeroAddress,
					data: '0x',
					value: 0n,
				},
			],
		};
	}

	return {
		canExec: false,
		message: 'Invalid address provided',
	};
});

const fail = onFail<Args>(async (ctx, result, error) => {
	console.log('Function failed with args:', ctx.userArgs);
	console.warn('Failed result:', result);
	if (error) {
		console.error('Error:', error.message);
	}
});

const success = onSuccess<Args>(async (ctx, result) => {
	console.log('Function succeeded with args:', ctx.userArgs);
	console.log('Result:', result);
});

export default {
	run,
	fail,
	success,
};
`;

  await writeFile(path.join(functionDir, 'index.ts'), indexTs, 'utf-8');

  // Create schema.ts
  const schemaTs = `import { z } from 'zod';

export const schema = z.object({
	address: z.string().min(1),
});

export type Args = z.infer<typeof schema>;
`;

  await writeFile(path.join(functionDir, 'schema.ts'), schemaTs, 'utf-8');

  // Create args.json
  const argsJson = {
    address: '0x0000000000000000000000000000000000000000',
  };

  await writeFile(
    path.join(functionDir, 'args.json'),
    JSON.stringify(argsJson, null, 2) + '\n',
    'utf-8',
  );

  console.log(`✅ Function "${functionName}" created at ${functionDir}`);
}

/**
 * Main create function
 */
export async function create(options: CreateOptions): Promise<void> {
  const { name, path: projectPath, template } = options;

  // Resolve base path
  const basePath = path.isAbsolute(projectPath)
    ? projectPath
    : path.resolve(process.cwd(), projectPath);

  // Check if current directory is a thyme project
  const isProject = await isThymeProject(basePath);

  if (!isProject) {
    // Create new project - create directory with project name
    const projectDir = path.join(basePath, name);

    // Check if project directory already exists
    try {
      await access(projectDir, constants.F_OK);
      throw new Error(
        `Directory "${projectDir}" already exists. Please choose a different name or remove the existing directory.`,
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw error;
      }
      // Directory doesn't exist, continue
    }

    await createProject(projectDir, name);
    console.log('\n📝 Next steps:');
    console.log(`  1. cd ${name}`);
    console.log('  2. Install dependencies: npm install (or bun install)');
    console.log('  3. Copy .env.example to .env and fill in your values');
    console.log('  4. Create your first function: thyme create my-function');
  } else {
    // Create new function in existing project
    console.log(`📦 Creating function "${name}" in existing project...`);

    // Ensure functions directory exists
    const functionsPath = path.join(basePath, 'functions');
    try {
      await access(functionsPath, constants.F_OK);
    } catch {
      await mkdir(functionsPath, { recursive: true });
    }

    await createFunction(name, basePath, template);
    console.log('\n📝 Next steps:');
    console.log(`  1. Edit functions/${name}/index.ts to implement your logic`);
    console.log(`  2. Update functions/${name}/schema.ts with your schema`);
    console.log(`  3. Update functions/${name}/args.json with test arguments`);
    console.log(
      `  4. Test your function: thyme simulate ${name} --profile local`,
    );
  }
}
