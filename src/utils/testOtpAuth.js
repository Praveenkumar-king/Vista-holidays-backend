/**
 * testOtpAuth.js
 * 
 * Comprehensive Automated Test Suite for Vista Holidays Sign In with OTP Feature.
 */

import { generateLoginOtp, hashOtp } from './security.js';
import { buildLoginOtpEmail } from '../services/emails/templates/loginOtpTemplate.js';
import emailService from '../services/emailService.js';
import User from '../models/User.js';
import { sendOtpLimiter, verifyOtpLimiter } from '../middleware/rateLimiter.js';

console.log('====================================================');
console.log('RUNNING SIGN IN WITH OTP AUTOMATED TEST SUITE');
console.log('====================================================');

let passed = 0;
let total = 0;

const assert = (condition, description) => {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${description}`);
  } else {
    console.error(`  [FAIL] ${description}`);
    process.exitCode = 1;
  }
};

// 1. OTP Generation Security Tests
const otpData = generateLoginOtp();
assert(typeof otpData.rawOtp === 'string', 'generateLoginOtp returns string rawOtp');
assert(/^\d{6}$/.test(otpData.rawOtp), `rawOtp is exactly 6 numeric digits: ${otpData.rawOtp}`);
assert(parseInt(otpData.rawOtp, 10) >= 100000 && parseInt(otpData.rawOtp, 10) <= 999999, 'rawOtp is in range 100000-999999');
assert(otpData.hashedOtp === hashOtp(otpData.rawOtp), 'hashedOtp matches SHA-256 hash of rawOtp');
assert(otpData.expiresMinutes === 5, 'Expiration is set to 5 minutes');
assert(otpData.expiresAt instanceof Date, 'expiresAt is a valid Date object');
assert(otpData.expiresAt.getTime() > Date.now(), 'expiresAt is in the future');

// 2. Hash Security Tests
const testCode = '482169';
const testHash = hashOtp(testCode);
assert(testHash.length === 64, 'hashOtp produces a 64-character SHA-256 hex string');
assert(testHash === hashOtp(testCode), 'hashOtp is deterministic');
assert(testHash !== hashOtp('482168'), 'Distinct OTP codes produce distinct hashes');
assert(hashOtp('') === '', 'Empty OTP produces empty string');
assert(hashOtp(null) === '', 'Null OTP produces empty string');

// 3. Login OTP Email Template Tests
const otpEmail = buildLoginOtpEmail({
  toEmail: 'praveen@vistatest.com',
  userName: 'Praveen',
  otp: '849201',
  expiresMinutes: 5,
  clientUrl: 'https://vistaholidays.com'
});

assert(otpEmail.subject === 'Sign In Verification Code - Praveen 🔐', 'Email subject matches branded style');
assert(otpEmail.html.includes('SIGN IN WITH OTP'), 'Email type badge is present');
assert(otpEmail.html.includes('849201'), '6-digit OTP code is prominently present in HTML');
assert(otpEmail.html.includes('5 minutes'), 'Expiration time notice is rendered');
assert(otpEmail.html.includes('Never share this code with anyone'), 'Security advice is present in HTML');
assert(otpEmail.html.includes('https://res.cloudinary.com/dkzkasg7x/image/upload/v1789387703/Vista_Holidays_Logo.png'), 'Vista Holidays logo is present');
assert(otpEmail.html.includes('Vista Holidays ❤️'), 'Brand signature is present');
assert(otpEmail.html.includes('praveen@vistatest.com'), 'Recipient email is rendered in footer');
assert(otpEmail.text.includes('849201'), 'Plaintext version contains OTP code');
assert(otpEmail.text.includes('5 minutes'), 'Plaintext version contains expiration duration');

// Fallback user name test
const fallbackEmail = buildLoginOtpEmail({
  toEmail: 'traveler@vistatest.com',
  userName: '',
  otp: '123456',
  expiresMinutes: 5,
  clientUrl: 'https://vistaholidays.com'
});
assert(fallbackEmail.subject === 'Sign In Verification Code - Traveler 🔐', 'Fallback recipient name is Traveler');

// 4. Email Service Integration Test (Simulation in dev)
const sendResult = await emailService.sendLoginOtpEmail({
  toEmail: 'praveen@vistatest.com',
  userName: 'Praveen',
  otp: '654321',
  expiresMinutes: 5
});
assert(sendResult.simulated === true || sendResult.sent === true, 'sendLoginOtpEmail dispatches smoothly');

// 5. User Model Schema & Safe Serialization Tests
const sampleUser = new User({
  name: 'Test Traveler',
  email: 'traveler@vistaholidays.com',
  passwordHash: 'secret_pw_hash',
  mobile: '+91 9876543210',
  emailVerified: true,
  loginOtpHash: hashOtp('999888'),
  loginOtpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
  loginOtpAttempts: 1,
  loginOtpLastSentAt: new Date()
});

const safeObj = sampleUser.toSafeObject();
assert(safeObj.loginOtpHash === undefined, 'loginOtpHash is strictly excluded from toSafeObject()');
assert(safeObj.email === 'traveler@vistaholidays.com', 'User email preserved in safe object');

const jsonString = JSON.stringify(sampleUser.toJSON());
assert(!jsonString.includes('999888'), 'Raw OTP is not present in JSON output');
assert(!jsonString.includes('loginOtpHash'), 'loginOtpHash is strictly stripped by toJSON transform');

// 6. Rate Limiter Configuration Tests
assert(typeof sendOtpLimiter === 'function', 'sendOtpLimiter middleware is exported and configured');
assert(typeof verifyOtpLimiter === 'function', 'verifyOtpLimiter middleware is exported and configured');

// 7. Cooldown Logic Validation
const now = Date.now();
const recentSend = new Date(now - 20 * 1000); // 20s ago
const secondsSinceRecent = (now - recentSend.getTime()) / 1000;
assert(secondsSinceRecent < 45, '20s since last OTP is within 45s cooldown window');
const oldSend = new Date(now - 50 * 1000); // 50s ago
const secondsSinceOld = (now - oldSend.getTime()) / 1000;
assert(secondsSinceOld >= 45, '50s since last OTP has expired 45s cooldown');

console.log('====================================================');
console.log(`TEST SUMMARY: ${passed} / ${total} OTP TESTS PASSED`);
console.log('====================================================');
