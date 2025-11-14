import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Reads the .env file and returns its contents as a string
 */
function readEnvFile(envPath: string): string {
  if (!existsSync(envPath)) {
    return '';
  }
  return readFileSync(envPath, 'utf-8');
}

/**
 * Writes content to the .env file
 */
function writeEnvFile(envPath: string, content: string): void {
  writeFileSync(envPath, content, 'utf-8');
}

/**
 * Updates or adds THYME_AUTH_TOKEN in the .env file
 */
function updateEnvFile(envPath: string, token: string): void {
  let content = readEnvFile(envPath);

  // Check if THYME_AUTH_TOKEN already exists
  const tokenRegex = /^THYME_AUTH_TOKEN=.*$/m;
  const hasToken = tokenRegex.test(content);

  if (hasToken) {
    // Replace existing token
    content = content.replace(tokenRegex, `THYME_AUTH_TOKEN=${token}`);
  } else {
    // Add new token
    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    content += `THYME_AUTH_TOKEN=${token}\n`;
  }

  writeEnvFile(envPath, content);
}

/**
 * Main auth function that stores the token in .env file
 */
export async function auth(
  token: string,
  envFile: string = '.env',
): Promise<void> {
  if (!token || token.trim().length === 0) {
    throw new Error('Token cannot be empty');
  }

  const envPath = path.isAbsolute(envFile)
    ? envFile
    : path.join(process.cwd(), envFile);

  updateEnvFile(envPath, token.trim());

  console.log(`✅ Authentication token saved to ${envPath}`);
  console.log('🔐 Token will be used automatically when uploading functions');
}
