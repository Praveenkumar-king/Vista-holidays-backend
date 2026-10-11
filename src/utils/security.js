import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/environment.js';

const BCRYPT_SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_LIFETIME_HOURS = 24;

/**
 * Generate a cryptographically secure random verification token.
 * Returns the raw token (to be sent via email), the hashed token (to be saved in DB),
 * and the expiration timestamp.
 */
export const generateVerificationToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = hashVerificationToken(rawToken);
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_LIFETIME_HOURS * 60 * 60 * 1000);

  return {
    rawToken,
    hashedToken,
    expiresAt,
    expiresHours: VERIFICATION_TOKEN_LIFETIME_HOURS
  };
};

/**
 * Hash a verification token using SHA-256 for secure database storage and comparison
 */
export const hashVerificationToken = (rawToken) => {
  if (!rawToken || typeof rawToken !== 'string') {
    return '';
  }
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

const OTP_LIFETIME_MINUTES = 5;

/**
 * Generate a cryptographically secure 6-digit numeric OTP for login.
 * Returns rawOtp (to send via email), hashedOtp (for DB storage), and expiration Date.
 */
export const generateLoginOtp = () => {
  const rawOtp = crypto.randomInt(100000, 1000000).toString();
  const hashedOtp = hashOtp(rawOtp);
  const expiresAt = new Date(Date.now() + OTP_LIFETIME_MINUTES * 60 * 1000);

  return {
    rawOtp,
    hashedOtp,
    expiresAt,
    expiresMinutes: OTP_LIFETIME_MINUTES
  };
};

/**
 * Hash an OTP using SHA-256 for secure DB storage and verification
 */
export const hashOtp = (rawOtp) => {
  if (!rawOtp || typeof rawOtp !== 'string') {
    return '';
  }
  return crypto.createHash('sha256').update(rawOtp.trim()).digest('hex');
};

/**
 * Securely hash a user password using bcrypt with strong salt rounds
 */
export const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
};

/**
 * Compare plain candidate password with bcrypt password hash
 */
export const comparePassword = async (candidatePassword, hashedPassword) => {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

/**
 * Issue a signed JSON Web Token
 */
export const signJwtToken = (payload, expiresIn = config.jwtExpiresIn) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
};

/**
 * Verify and decode a JSON Web Token
 */
export const verifyJwtToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

/**
 * Password validation policy:
 * At least 8 characters, with at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character
 */
export const validatePasswordPolicy = (password) => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter (A-Z)' };
  }

  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter (a-z)' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number (0-9)' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }

  return { isValid: true, message: '' };
};

/**
 * Resolve client base URL for verification links.
 * Supports comma-separated origin configurations.
 */
export const getPrimaryClientUrl = () => {
  const urls = (config.clientUrl || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  // Return the first valid client origin
  return urls[0] || 'http://localhost:5173';
};

export default {
  generateVerificationToken,
  hashVerificationToken,
  generateLoginOtp,
  hashOtp,
  hashPassword,
  comparePassword,
  signJwtToken,
  verifyJwtToken,
  validatePasswordPolicy,
  getPrimaryClientUrl
};
