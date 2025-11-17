import crypto from 'crypto';

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a URL-safe token
 */
export function generateUrlSafeToken(length: number = 32): string {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Hash a token for storage (one-way)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against a hash
 */
export function verifyToken(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash));
}

/**
 * Generate a time-based OTP
 */
export function generateOTP(length: number = 6): string {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }

  return otp;
}

/**
 * Generate a verification code
 */
export function generateVerificationCode(): string {
  return generateOTP(6);
}
