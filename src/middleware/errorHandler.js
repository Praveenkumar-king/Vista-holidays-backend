/**
 * Centralized error handling middleware
 * Returns consistent, normalized JSON errors without exposing secrets or raw stack traces
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = err.message || 'An unexpected server error occurred. Please try again.';

  // Log error for development diagnostics (sanitizing any sensitive headers)
  console.error(`[API Error] ${req.method} ${req.originalUrl} (${statusCode}):`, err.message);

  res.status(statusCode).json({
    success: false,
    message
  });
};

export default errorHandler;
