/**
 * Async Error Handler Middleware
 * Wraps async Express route handlers to catch unhandled rejections and forward to next()
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
