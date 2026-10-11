import User from '../models/User.js';
import PlatformSetting from '../models/PlatformSetting.js';
import { 
  generateVerificationToken, 
  hashVerificationToken, 
  generateLoginOtp,
  hashOtp,
  hashPassword, 
  signJwtToken,
  validatePasswordPolicy,
  getPrimaryClientUrl 
} from '../utils/security.js';
import emailService from '../services/emailService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isDatabaseConnected } from '../config/database.js';
import { AUTH_COOKIE_NAME } from '../middleware/authenticate.js';
import config from '../config/environment.js';
import logger from '../utils/logger.js';

const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const getCookieOptions = () => {
  const isProduction = config.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/'
  };
};

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    // Enforce Maintenance Mode: block regular registrations
    const platformSettings = await PlatformSetting.getSettings();
    if (platformSettings.maintenanceMode) {
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: platformSettings.maintenanceMessage || 'System under maintenance. User registration is temporarily paused. Please check the platform notification bar for updates.'
      });
    }

    const { name, email, password, mobile, termsAccepted } = req.body;

    // Validate presence of required fields
    if (!name || !email || !password || !mobile) {
      return errorResponse(res, 'All registration fields (Name, Email, Password, Mobile) are required.', null, 400);
    }

    // Terms of service agreement required on registration form
    if (termsAccepted !== true && termsAccepted !== 'true') {
      return errorResponse(res, 'You must accept the Terms & Conditions to create an account.', null, 400);
    }

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (trimmedName.length < 2) {
      return errorResponse(res, 'Name must be at least 2 characters long.', null, 400);
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return errorResponse(res, 'Please provide a valid email address.', null, 400);
    }

    // Password policy check
    const passwordCheck = validatePasswordPolicy(password);
    if (!passwordCheck.isValid) {
      return errorResponse(res, passwordCheck.message, null, 400);
    }

    // Mobile validation
    const trimmedMobile = typeof mobile === 'string' ? mobile.trim() : '';
    const numericDigits = trimmedMobile.replace(/\D/g, '');
    if (numericDigits.length < 7 || numericDigits.length > 15) {
      return errorResponse(res, 'Please provide a valid phone number (7-15 digits).', null, 400);
    }

    // Check for existing account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (existingUser.emailVerified) {
        return errorResponse(res, 'An account with this email already exists.', null, 409);
      } else {
        // Safe option to resend verification email instead of duplicate account
        return res.status(409).json({
          success: false,
          unverified: true,
          email: normalizedEmail,
          message: 'An unverified account with this email already exists. You can resend the verification email to activate it.'
        });
      }
    }

    // Hash password securely with bcrypt
    const passwordHash = await hashPassword(password);

    // Generate cryptographic verification token
    const { rawToken, hashedToken, expiresAt, expiresHours } = generateVerificationToken();

    // Create user in DB
    const newUser = new User({
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      mobile: trimmedMobile,
      emailVerified: false,
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpiresAt: expiresAt,
      termsAccepted: false, // Mandatory popup will be shown upon first login after email verification
      termsAcceptedAt: null,
      termsVersion: '1.0',
      accountStatus: 'active'
    });

    await newUser.save();

    // Build email verification URL with raw token
    const verificationUrl = `${getPrimaryClientUrl()}/users/verify-email?token=${rawToken}`;

    // Send verification email via Brevo SMTP
    try {
      await emailService.sendVerificationEmail({
        toEmail: normalizedEmail,
        userName: trimmedName,
        verificationUrl,
        expiresHours
      });
    } catch (emailErr) {
      logger.error('Failed to send verification email during registration:', emailErr.message);
      // We still return 201 so user exists and can use resend verification
      return res.status(201).json({
        success: true,
        message: 'Account created! However, email delivery encountered an issue. Please use the resend verification option.',
        emailDeliveryFailed: true,
        data: {
          email: normalizedEmail,
          name: trimmedName
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully! A verification email has been sent to your email address. Please verify your email to activate your account.',
      data: {
        email: normalizedEmail,
        name: trimmedName
      }
    });
  } catch (error) {
    logger.error('Registration error:', error.message);
    return errorResponse(res, 'Registration failed due to an internal error. Please try again.', error.message, 500);
  }
};

/**
 * Verify user email via verification token
 * GET /api/auth/verify-email?token=...
 */
export const verifyEmail = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const rawToken = req.query.token || req.body.token;

    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      return res.status(400).json({
        success: false,
        code: 'MISSING_TOKEN',
        message: 'Verification token is required.'
      });
    }

    // Hash the incoming raw token using SHA-256 to compare with DB
    const incomingTokenHash = hashVerificationToken(rawToken.trim());

    // Find user by hashed token
    const user = await User.findOne({
      emailVerificationTokenHash: incomingTokenHash
    }).select('+emailVerificationTokenHash');

    if (!user) {
      // Check if this exact token was already used successfully to verify an account
      const alreadyVerifiedUser = await User.findOne({
        lastVerifiedTokenHash: incomingTokenHash
      });

      if (alreadyVerifiedUser) {
        logger.info(`Verification link re-accessed for already verified user: ${alreadyVerifiedUser.email}`);
        return res.status(200).json({
          success: true,
          alreadyVerified: true,
          message: 'Your email has already been verified. You can sign in to your account.',
          data: {
            email: alreadyVerifiedUser.email,
            name: alreadyVerifiedUser.name,
            emailVerified: true,
            alreadyVerified: true
          }
        });
      }

      return res.status(400).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'This verification link is invalid or has already been used. If you have already verified, please sign in.'
      });
    }

    // Check token expiration
    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        code: 'EXPIRED_TOKEN',
        email: user.email,
        message: 'This email verification link has expired. Please request a new verification email.'
      });
    }

    // Activate the account, record last verified token hash, and invalidate the token (single-use)
    user.emailVerified = true;
    user.lastVerifiedTokenHash = incomingTokenHash;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;

    const shouldSendWelcome = !user.welcomeEmailSent;
    if (shouldSendWelcome) {
      user.welcomeEmailSent = true;
    }
    await user.save();

    logger.info(`User account verified successfully: ${user.email}`);

    // Send Welcome Email immediately after successful verification (Feature 3 & 5)
    if (shouldSendWelcome) {
      try {
        await emailService.sendWelcomeEmail({
          toEmail: user.email,
          userName: user.name
        });
      } catch (welcomeErr) {
        // Non-blocking: DB verification remains successful
        logger.error(`Failed to dispatch welcome email to ${user.email}:`, welcomeErr.message);
      }
    }

    return successResponse(res, 'Your Vista Holidays account has been successfully verified! You can now log in.', {
      email: user.email,
      name: user.name,
      emailVerified: true
    });
  } catch (error) {
    logger.error('Email verification error:', error.message);
    return errorResponse(res, 'Email verification failed. Please try again.', error.message, 500);
  }
};

/**
 * Resend email verification link
 * POST /api/auth/resend-verification
 */
export const resendVerification = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return errorResponse(res, 'Email address is required.', null, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Safe handling: avoid account enumeration
    if (!user) {
      return successResponse(res, 'If an account associated with this email exists and is unverified, a new verification link has been sent.');
    }

    // Already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_VERIFIED',
        message: 'This email is already verified. You can sign in to your account.'
      });
    }

    // Rate-limiting cooldown: prevent spamming resend within 60 seconds
    if (user.emailVerificationExpiresAt) {
      const tokenIssuedAt = new Date(user.emailVerificationExpiresAt.getTime() - (24 * 60 * 60 * 1000));
      const secondsSinceLastIssue = (Date.now() - tokenIssuedAt.getTime()) / 1000;
      if (secondsSinceLastIssue < 60) {
        const waitSec = Math.ceil(60 - secondsSinceLastIssue);
        return res.status(429).json({
          success: false,
          code: 'COOLDOWN_ACTIVE',
          message: `Please wait ${waitSec} second${waitSec === 1 ? '' : 's'} before requesting another verification email.`
        });
      }
    }

    // Generate new token and invalidate the old one
    const { rawToken, hashedToken, expiresAt, expiresHours } = generateVerificationToken();

    user.emailVerificationTokenHash = hashedToken;
    user.emailVerificationExpiresAt = expiresAt;
    await user.save();

    const verificationUrl = `${getPrimaryClientUrl()}/users/verify-email?token=${rawToken}`;

    await emailService.sendVerificationEmail({
      toEmail: user.email,
      userName: user.name,
      verificationUrl,
      expiresHours
    });

    return successResponse(res, 'Verification email sent. Please check your inbox.');
  } catch (error) {
    logger.error('Resend verification error:', error.message);
    return errorResponse(res, 'Failed to resend verification email. Please try again.', error.message, 500);
  }
};

/**
 * User login
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Please provide both email and password.', null, 400);
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    // Query user including passwordHash for comparison
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      return errorResponse(res, 'Invalid email or password.', null, 401);
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password.', null, 401);
    }

    // Enforce Maintenance Mode: allow administrators, block normal users
    const platformSettings = await PlatformSetting.getSettings();
    if (platformSettings.maintenanceMode && user.role !== 'admin') {
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: platformSettings.maintenanceMessage || 'System under maintenance. Normal user login is temporarily disabled. Please check the platform notification bar for updates.'
      });
    }

    // Check email verification status
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        unverified: true,
        email: user.email,
        message: 'Please verify your email before signing in.'
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return errorResponse(res, 'Your account is suspended or inactive. Please contact customer support.', null, 403);
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token
    const token = signJwtToken({
      userId: user._id,
      email: user.email
    });

    // Set secure HttpOnly cookie
    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());

    const safeUser = user.toSafeObject();

    logger.info(`User logged in successfully: ${user.email}`);

    return successResponse(res, `Welcome back, ${user.name}!`, {
      user: safeUser,
      token // Provided for robust cross-origin/client fallback
    });
  } catch (error) {
    logger.error('Login error:', error.message);
    return errorResponse(res, 'Login failed due to an internal error. Please try again.', error.message, 500);
  }
};

/**
 * User logout
 * POST /api/auth/logout
 */
export const logout = (req, res) => {
  try {
    const isProduction = config.nodeEnv === 'production';
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/'
    });

    return successResponse(res, 'Logged out successfully.');
  } catch (error) {
    logger.error('Logout error:', error.message);
    return errorResponse(res, 'Logout failed.', error.message, 500);
  }
};

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export const getCurrentUser = (req, res) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Not authenticated.', null, 401);
    }

    return successResponse(res, 'User profile retrieved.', {
      user: req.user.toSafeObject()
    });
  } catch (error) {
    logger.error('Get profile error:', error.message);
    return errorResponse(res, 'Failed to fetch user profile.', error.message, 500);
  }
};

/**
 * Accept Terms and Conditions
 * POST /api/auth/accept-terms
 */
export const acceptTerms = async (req, res) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', null, 401);
    }

    const user = req.user;
    user.termsAccepted = true;
    user.termsAcceptedAt = new Date();
    user.termsVersion = req.body?.version || '1.0';

    await user.save();

    logger.info(`Terms accepted by user: ${user.email} (version ${user.termsVersion})`);

    return successResponse(res, 'Terms Accepted', {
      user: user.toSafeObject()
    });
  } catch (error) {
    logger.error('Accept terms error:', error.message);
    return errorResponse(res, 'Failed to update terms acceptance.', error.message, 500);
  }
};

/**
 * Send Sign-In OTP
 * POST /api/auth/send-otp
 */
export const sendLoginOtp = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return errorResponse(res, 'Please provide an email address.', null, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(normalizedEmail)) {
      return errorResponse(res, 'Please provide a valid email address.', null, 400);
    }

    // Check Maintenance Mode
    const platformSettings = await PlatformSetting.getSettings();
    if (platformSettings.maintenanceMode) {
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: platformSettings.maintenanceMessage || 'System under maintenance. User login is temporarily disabled. Please check the platform notification bar for updates.'
      });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return errorResponse(res, 'No account found with this email address. Please register first.', null, 404);
    }

    // Check email verification status
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        unverified: true,
        email: user.email,
        message: 'Please verify your email before signing in.'
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return errorResponse(res, 'Your account is suspended or inactive. Please contact customer support.', null, 403);
    }

    // Rate-limiting cooldown: prevent spamming resend within 45 seconds
    if (user.loginOtpLastSentAt) {
      const secondsSinceLastOtp = (Date.now() - new Date(user.loginOtpLastSentAt).getTime()) / 1000;
      if (secondsSinceLastOtp < 45) {
        const remainingSeconds = Math.ceil(45 - secondsSinceLastOtp);
        return res.status(429).json({
          success: false,
          code: 'COOLDOWN_ACTIVE',
          remainingSeconds,
          message: `Please wait ${remainingSeconds} second${remainingSeconds === 1 ? '' : 's'} before requesting another OTP.`
        });
      }
    }

    // Generate secure 6-digit OTP
    const { rawOtp, hashedOtp, expiresAt, expiresMinutes } = generateLoginOtp();

    user.loginOtpHash = hashedOtp;
    user.loginOtpExpiresAt = expiresAt;
    user.loginOtpAttempts = 0;
    user.loginOtpLastSentAt = new Date();
    await user.save();

    // Send OTP via email
    try {
      await emailService.sendLoginOtpEmail({
        toEmail: user.email,
        userName: user.name,
        otp: rawOtp,
        expiresMinutes
      });
    } catch (emailErr) {
      logger.error('Failed to send login OTP email:', emailErr.message);
      return errorResponse(res, 'Failed to deliver OTP email. Please try again.', null, 500);
    }

    logger.info(`Login OTP sent successfully to: ${user.email}`);

    return successResponse(res, `OTP has been sent to ${user.email}. Please check your inbox.`, {
      email: user.email,
      expiresInMinutes: expiresMinutes
    });
  } catch (error) {
    logger.error('Send OTP error:', error.message);
    return errorResponse(res, 'Failed to process OTP request. Please try again.', error.message, 500);
  }
};

/**
 * Verify Sign-In OTP and log in
 * POST /api/auth/verify-otp
 */
export const verifyLoginOtp = async (req, res) => {
  try {
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database service is currently unavailable. Please try again later.', null, 503);
    }

    const { email, otp } = req.body;

    if (!email || !otp) {
      return errorResponse(res, 'Please provide both email and OTP code.', null, 400);
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedOtp = typeof otp === 'string' ? otp.trim() : String(otp).trim();

    if (!/^\d{6}$/.test(trimmedOtp)) {
      return errorResponse(res, 'Please provide a valid 6-digit numeric OTP code.', null, 400);
    }

    // Query user including loginOtpHash
    const user = await User.findOne({ email: normalizedEmail }).select('+loginOtpHash');

    if (!user) {
      return errorResponse(res, 'Invalid email or OTP.', null, 401);
    }

    // Enforce Maintenance Mode: allow administrators, block normal users
    const platformSettings = await PlatformSetting.getSettings();
    if (platformSettings.maintenanceMode && user.role !== 'admin') {
      return res.status(503).json({
        success: false,
        code: 'MAINTENANCE_MODE',
        message: platformSettings.maintenanceMessage || 'System under maintenance. Normal user login is temporarily disabled. Please check the platform notification bar for updates.'
      });
    }

    // Check email verification status
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        unverified: true,
        email: user.email,
        message: 'Please verify your email before signing in.'
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return errorResponse(res, 'Your account is suspended or inactive. Please contact customer support.', null, 403);
    }

    // Check if an OTP was ever issued
    if (!user.loginOtpHash || !user.loginOtpExpiresAt) {
      return res.status(400).json({
        success: false,
        code: 'NO_ACTIVE_OTP',
        message: 'No active OTP found. Please request a new OTP.'
      });
    }

    // Check if OTP has expired
    if (new Date() > new Date(user.loginOtpExpiresAt)) {
      user.loginOtpHash = null;
      user.loginOtpExpiresAt = null;
      user.loginOtpAttempts = 0;
      await user.save();
      return res.status(400).json({
        success: false,
        code: 'EXPIRED_OTP',
        message: 'This OTP has expired. Please request a new OTP.'
      });
    }

    // Check maximum attempts limit (e.g. 5 attempts)
    if ((user.loginOtpAttempts || 0) >= 5) {
      user.loginOtpHash = null;
      user.loginOtpExpiresAt = null;
      user.loginOtpAttempts = 0;
      await user.save();
      return res.status(429).json({
        success: false,
        code: 'EXCESSIVE_ATTEMPTS',
        message: 'Too many incorrect attempts. For security, this OTP has been invalidated. Please request a new OTP.'
      });
    }

    // Verify OTP hash
    const candidateHash = hashOtp(trimmedOtp);
    if (candidateHash !== user.loginOtpHash) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
      const remaining = 5 - user.loginOtpAttempts;
      await user.save();
      return res.status(400).json({
        success: false,
        code: 'INCORRECT_OTP',
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          : 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    // Successful verification: invalidate OTP to prevent replay attacks
    user.loginOtpHash = null;
    user.loginOtpExpiresAt = null;
    user.loginOtpAttempts = 0;
    user.loginOtpLastSentAt = null;
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token
    const token = signJwtToken({
      userId: user._id,
      email: user.email
    });

    // Set secure HttpOnly cookie
    res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());

    const safeUser = user.toSafeObject();

    logger.info(`User logged in successfully via OTP: ${user.email}`);

    return successResponse(res, `Welcome back, ${user.name}!`, {
      user: safeUser,
      token
    });
  } catch (error) {
    logger.error('Verify OTP error:', error.message);
    return errorResponse(res, 'OTP verification failed due to an internal error. Please try again.', error.message, 500);
  }
};

export default {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  getCurrentUser,
  acceptTerms,
  sendLoginOtp,
  verifyLoginOtp
};
