import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENC_KEY_B64 = process.env.VOICE_ENC_KEY ?? '';

function getKey(): Buffer {
  if (!ENC_KEY_B64) {
    throw new Error('VOICE_ENC_KEY environment variable is not set');
  }
  const key = Buffer.from(ENC_KEY_B64, 'base64');
  if (key.length !== 32) {
    throw new Error('VOICE_ENC_KEY must be a base64-encoded 32-byte value (openssl rand -base64 32)');
  }
  return key;
}

export interface EncryptedProfile {
  profile: string; // base64 ciphertext
  iv: string;      // base64 12-byte nonce
  tag: string;     // base64 16-byte GCM auth tag
}

export function encryptProfile(plaintext: Buffer): EncryptedProfile {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    profile: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptProfile(enc: EncryptedProfile): Buffer {
  const key = getKey();
  const iv = Buffer.from(enc.iv, 'base64');
  const tag = Buffer.from(enc.tag, 'base64');
  const ciphertext = Buffer.from(enc.profile, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}
