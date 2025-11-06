import * as TOML from '@iarna/toml';
import { readFile } from 'fs/promises';

export async function parseToml(
  tomlPath: string,
  envs: Record<string, string>,
  profile: string,
): Promise<{ rpcUrl: string; privateKey: string; publicKey: string }> {
  const toml = await readFile(tomlPath, 'utf-8');

  const result = TOML.parse(toml);

  if (!('profiles' in result)) {
    throw new Error(
      'No profiles found in untl.toml. Please define at least one profile.',
    );
  }
  const profiles = result.profiles as Record<string, any>;

  if (!(profile in profiles)) {
    throw new Error(
      `Profile ${profile} not found in untl.toml. Please define the profile in the untl.toml file.`,
    );
  }

  const profileData = profiles[profile] as {
    rpcUrl: string;
    privateKey: string;
    publicKey: string;
  };

  let rpcUrl = profileData.rpcUrl;

  if (rpcUrl.startsWith('$')) {
    const localRpcUrl = envs[rpcUrl.slice(1)];
    if (!localRpcUrl) {
      throw new Error(`Environment variable ${rpcUrl.slice(1)} not found`);
    }
    rpcUrl = localRpcUrl;
  }

  let privateKey = profileData.privateKey;
  if (privateKey.startsWith('$')) {
    const localPrivateKey = envs[privateKey.slice(1)];
    if (!localPrivateKey) {
      throw new Error(`Environment variable ${privateKey.slice(1)} not found`);
    }
    privateKey = localPrivateKey;
  }

  let publicKey = profileData.publicKey;
  if (publicKey.startsWith('$')) {
    const localPublicKey = envs[publicKey.slice(1)];
    if (!localPublicKey) {
      throw new Error(`Environment variable ${publicKey.slice(1)} not found`);
    }
    publicKey = localPublicKey;
  }

  return {
    rpcUrl,
    privateKey,
    publicKey,
  };
}
