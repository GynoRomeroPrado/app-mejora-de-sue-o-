import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Get encryption key from environment or generate one
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : crypto.randomBytes(KEY_LENGTH);

/**
 * Derive encryption key from password and salt
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt audio data
 */
export async function encryptAudio(buffer: Buffer, password?: string): Promise<Buffer> {
  try {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = password ? deriveKey(password, salt) : ENCRYPTION_KEY;
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    return Buffer.concat([
      salt,
      iv,
      tag,
      encrypted,
    ]);
  } catch (error) {
    console.error('Error encrypting audio:', error);
    throw new Error('Failed to encrypt audio data');
  }
}

/**
 * Decrypt audio data
 */
export async function decryptAudio(encryptedBuffer: Buffer, password?: string): Promise<Buffer> {
  try {
    // Extract components
    const salt = encryptedBuffer.slice(0, SALT_LENGTH);
    const iv = encryptedBuffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = encryptedBuffer.slice(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = encryptedBuffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const key = password ? deriveKey(password, salt) : ENCRYPTION_KEY;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted;
  } catch (error) {
    console.error('Error decrypting audio:', error);
    throw new Error('Failed to decrypt audio data');
  }
}

/**
 * Generate encryption key (for setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hash: string): boolean {
  const dataHash = hashData(data);
  return crypto.timingSafeEqual(Buffer.from(dataHash), Buffer.from(hash));
}

/**
 * Generate random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt string data
 */
export function encryptString(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypt string data
 */
export function decryptString(encryptedText: string): string {
  const buffer = Buffer.from(encryptedText, 'base64');

  const iv = buffer.slice(0, IV_LENGTH);
  const tag = buffer.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.slice(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
