import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for login endpoint: max 10 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

/**
 * Rate limiter for resend verification email: max 5 requests per 15 minutes per IP
 */
export const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many verification email requests. Please wait a few minutes before trying again.'
  }
});

/**
 * Rate limiter for user registration: max 10 accounts per hour per IP
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many registration requests from this network. Please try again later.'
  }
});

/**
 * Rate limiter for Send OTP endpoint: max 5 requests per 15 minutes per IP
 */
export const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests from this IP. Please wait a few minutes before requesting another OTP.'
  }
});

/**
 * Rate limiter for Verify OTP endpoint: max 10 attempts per 15 minutes per IP
 */
export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP verification attempts from this IP. Please wait 15 minutes before trying again.'
  }
});

export default {
  loginLimiter,
  resendLimiter,
  registerLimiter,
  sendOtpLimiter,
  verifyOtpLimiter
};
