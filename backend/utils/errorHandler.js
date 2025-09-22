/**
 * Centralized Error Handling Utilities
 * 
 * Provides consistent error handling, logging, and response formatting
 * across the entire application with proper error categorization
 */

const winston = require('winston');

/**
 * Custom error classes for better error categorization
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400);
    this.details = details;
    this.type = 'VALIDATION_ERROR';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.type = 'AUTHENTICATION_ERROR';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.type = 'AUTHORIZATION_ERROR';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.type = 'NOT_FOUND_ERROR';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.type = 'CONFLICT_ERROR';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.type = 'RATE_LIMIT_ERROR';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500);
    this.type = 'DATABASE_ERROR';
    this.isOperational = false;
  }
}

class SocketError extends AppError {
  constructor(message = 'Socket operation failed') {
    super(message, 500);
    this.type = 'SOCKET_ERROR';
    this.isOperational = false;
  }
}

/**
 * Winston logger configuration
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'liveroom-backend' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Error response formatter
 */
const formatErrorResponse = (error, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const baseResponse = {
    error: {
      message: error.message,
      type: error.type || 'UNKNOWN_ERROR',
      timestamp: error.timestamp || new Date().toISOString(),
      requestId: req.id || 'unknown'
    }
  };

  // Add additional details in development
  if (isDevelopment) {
    baseResponse.error.stack = error.stack;
    baseResponse.error.details = error.details;
    baseResponse.error.path = req.path;
    baseResponse.error.method = req.method;
  }

  // Add validation details if available
  if (error.details && Array.isArray(error.details)) {
    baseResponse.error.validation = error.details;
  }

  return baseResponse;
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error({
    message: error.message,
    stack: error.stack,
    type: error.type,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    error = new ValidationError('Validation failed', details);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new ConflictError(`${field} already exists`);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    error = new ValidationError(`Invalid ${err.path}: ${err.value}`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AuthenticationError('Token expired');
  }

  // Socket.io errors
  if (err.name === 'SocketError') {
    error = new SocketError(err.message);
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error = new AppError('Internal server error', 500, false);
  }

  // Send error response
  res.status(error.statusCode).json(formatErrorResponse(error, req));
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Socket error handler
 */
const socketErrorHandler = (socket, error, event = 'unknown') => {
  logger.error({
    message: `Socket error in ${event}`,
    error: error.message,
    stack: error.stack,
    socketId: socket.id,
    event
  });

  socket.emit('error', {
    message: error.message,
    type: error.type || 'SOCKET_ERROR',
    timestamp: new Date().toISOString()
  });
};

/**
 * Request ID middleware
 */
const requestIdMiddleware = (req, res, next) => {
  req.id = require('uuid').v4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Performance monitoring middleware
 */
const performanceMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      message: 'Request completed',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.id
    });
  });
  
  next();
};

/**
 * Health check endpoint
 */
const healthCheck = (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    requestId: req.id
  };

  res.status(200).json(health);
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  SocketError,
  
  // Utilities
  logger,
  globalErrorHandler,
  asyncHandler,
  socketErrorHandler,
  requestIdMiddleware,
  performanceMiddleware,
  healthCheck,
  formatErrorResponse
};
