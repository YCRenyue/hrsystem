/**
 * Centralized Error Handling Middleware
 */

class ApplicationError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApplicationError {
  constructor(message, details = {}) {
    super(message, 400);
    this.details = details;
  }
}

class NotFoundError extends ApplicationError {
  constructor(resource, id) {
    super(`${resource}(ID: ${id})未找到`, 404);
    this.resource = resource;
    this.id = id;
  }
}

class UnauthorizedError extends ApplicationError {
  constructor(message = '未授权访问') {
    super(message, 401);
  }
}

class ForbiddenError extends ApplicationError {
  constructor(message = '禁止访问') {
    super(message, 403);
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, _next) => {
  // Log error
  console.error('Error occurred:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      success: false,
      error: '数据验证失败',
      message: err.message,
      details: err.details
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(err.statusCode).json({
      success: false,
      error: '资源未找到',
      message: err.message
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(err.statusCode).json({
      success: false,
      error: '未授权访问',
      message: err.message
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(err.statusCode).json({
      success: false,
      error: '禁止访问',
      message: err.message
    });
  }

  // Default error response
  return res.status(err.statusCode || 500).json({
    success: false,
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器发生错误，请稍后重试'
  });
};

module.exports = {
  ApplicationError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  asyncHandler,
  errorHandler
};
