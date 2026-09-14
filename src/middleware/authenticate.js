import { verifyJwtToken } from '../utils/security.js';
import User from '../models/User.js';
import { isDatabaseConnected } from '../config/database.js';
import { errorResponse } from '../utils/apiResponse.js';

export const AUTH_COOKIE_NAME = 'vista_auth_token';

/**
 * Authentication middleware to verify user sessions via HttpOnly cookie or Bearer token
 */
export const authenticate = async (req, res, next) => {
  try {
    // 1. Extract token from cookie or Authorization header
    let token = req.cookies ? req.cookies[AUTH_COOKIE_NAME] : null;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return errorResponse(res, 'Authentication required. Please log in to continue.', null, 401);
    }

    // 2. Verify JWT token
    let decoded;
    try {
      decoded = verifyJwtToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return errorResponse(res, 'Session expired. Please log in again.', null, 401);
      }
      return errorResponse(res, 'Invalid authentication token. Please log in again.', null, 401);
    }

    // 3. Ensure database is reachable
    if (!isDatabaseConnected()) {
      return errorResponse(res, 'Database temporarily unavailable. Please try again shortly.', null, 503);
    }

    // 4. Find active user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return errorResponse(res, 'User account no longer exists.', null, 401);
    }

    if (user.accountStatus !== 'active') {
      return errorResponse(res, 'This account is inactive or suspended. Please contact support.', null, 403);
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Authentication error.', error.message, 500);
  }
};

/**
 * Optional authentication middleware: attaches req.user if a valid session exists,
 * but allows unauthenticated requests to continue seamlessly with req.user = null
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    let token = req.cookies ? req.cookies[AUTH_COOKIE_NAME] : null;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = verifyJwtToken(token);
    } catch {
      req.user = null;
      return next();
    }

    if (!isDatabaseConnected()) {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.userId);
    if (user && user.accountStatus === 'active') {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch {
    req.user = null;
    next();
  }
};

/**
 * Authorization middleware to ensure the authenticated user has admin role
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Authentication required. Please log in as an administrator.', null, 401);
  }

  if (req.user.role !== 'admin') {
    return errorResponse(res, 'Access denied. Administrator privileges required.', null, 403);
  }

  next();
};

export default authenticate;


