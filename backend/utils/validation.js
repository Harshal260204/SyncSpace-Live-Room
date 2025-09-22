/**
 * Input Validation and Sanitization Utilities
 * 
 * Comprehensive validation and sanitization functions for all input data
 * Includes XSS protection, SQL injection prevention, and data type validation
 */

const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');
const { ValidationError } = require('./errorHandler');

/**
 * Common validation schemas
 */
const schemas = {
  // User validation
  username: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z0-9\s\-_]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, spaces, hyphens, and underscores',
      'string.min': 'Username must be at least 1 character long',
      'string.max': 'Username cannot exceed 50 characters',
    }),

  userId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid user ID format',
    }),

  sessionId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid session ID format',
    }),

  // Room validation
  roomId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid room ID format',
    }),

  roomName: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .required()
    .messages({
      'string.min': 'Room name must be at least 1 character long',
      'string.max': 'Room name cannot exceed 100 characters',
    }),

  roomDescription: Joi.string()
    .max(500)
    .trim()
    .allow('')
    .messages({
      'string.max': 'Room description cannot exceed 500 characters',
    }),

  maxParticipants: Joi.number()
    .integer()
    .min(2)
    .max(100)
    .default(50)
    .messages({
      'number.min': 'Maximum participants must be at least 2',
      'number.max': 'Maximum participants cannot exceed 100',
    }),

  // Chat validation
  message: Joi.string()
    .min(1)
    .max(1000)
    .trim()
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'string.max': 'Message cannot exceed 1000 characters',
    }),

  messageType: Joi.string()
    .valid('text', 'system', 'announcement')
    .default('text')
    .messages({
      'any.only': 'Message type must be text, system, or announcement',
    }),

  // Code validation
  codeContent: Joi.string()
    .max(100000) // 100KB limit
    .allow('')
    .messages({
      'string.max': 'Code content cannot exceed 100KB',
    }),

  codeLanguage: Joi.string()
    .valid('javascript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'markdown', 'plaintext')
    .default('javascript')
    .messages({
      'any.only': 'Unsupported programming language',
    }),

  // Notes validation
  notesContent: Joi.string()
    .max(50000) // 50KB limit
    .allow('')
    .messages({
      'string.max': 'Notes content cannot exceed 50KB',
    }),

  // Canvas validation
  drawingData: Joi.object()
    .unknown(true)
    .messages({
      'object.base': 'Drawing data must be a valid object',
    }),

  // Cursor position validation
  cursorPosition: Joi.object({
    x: Joi.number().min(0).required(),
    y: Joi.number().min(0).required(),
  }).messages({
    'object.base': 'Cursor position must be a valid object with x and y coordinates',
  }),

  // Pagination validation
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'Page must be at least 1',
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),

  // Search validation
  search: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .messages({
      'string.min': 'Search term must be at least 1 character',
      'string.max': 'Search term cannot exceed 100 characters',
    }),

  // Preferences validation
  preferences: Joi.object({
    accessibility: Joi.object({
      screenReader: Joi.boolean().default(false),
      highContrast: Joi.boolean().default(false),
      fontSize: Joi.string().valid('small', 'medium', 'large').default('medium'),
      announceChanges: Joi.boolean().default(true),
      keyboardNavigation: Joi.boolean().default(true),
    }).default({}),
    appearance: Joi.object({
      theme: Joi.string().valid('light', 'dark', 'auto').default('auto'),
      cursorColor: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#3B82F6'),
    }).default({}),
    notifications: Joi.object({
      chatMessages: Joi.boolean().default(true),
      userJoinLeave: Joi.boolean().default(true),
      codeChanges: Joi.boolean().default(false),
      systemAnnouncements: Joi.boolean().default(true),
    }).default({}),
  }).default({}),

  // Settings validation
  roomSettings: Joi.object({
    allowAnonymous: Joi.boolean().default(true),
    allowCodeEditing: Joi.boolean().default(true),
    allowNotesEditing: Joi.boolean().default(true),
    allowCanvasDrawing: Joi.boolean().default(true),
    allowChat: Joi.boolean().default(true),
    isPublic: Joi.boolean().default(true),
  }).default({}),
};

/**
 * Validation middleware factory
 */
function createValidationMiddleware(schema, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      ...options,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return next(new ValidationError('Validation failed', details));
    }

    req.body = value;
    next();
  };
}

/**
 * Query validation middleware factory
 */
function createQueryValidationMiddleware(schema, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      ...options,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return next(new ValidationError('Query validation failed', details));
    }

    req.query = value;
    next();
  };
}

/**
 * Parameter validation middleware factory
 */
function createParamValidationMiddleware(schema, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      ...options,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return next(new ValidationError('Parameter validation failed', details));
    }

    req.params = value;
    next();
  };
}

/**
 * Sanitize HTML content to prevent XSS
 */
function sanitizeHtml(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize text content
 */
function sanitizeText(input) {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize object recursively
 */
function sanitizeObject(obj, options = {}) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return options.sanitizeHtml ? sanitizeHtml(obj) : sanitizeText(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip sanitization for certain fields
      if (options.skipFields && options.skipFields.includes(key)) {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeObject(value, options);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Sanitization middleware
 */
function sanitizationMiddleware(options = {}) {
  return (req, res, next) => {
    if (req.body) {
      req.body = sanitizeObject(req.body, options);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query, options);
    }
    next();
  };
}

/**
 * Rate limiting validation
 */
function validateRateLimit(limit, windowMs) {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new ValidationError('Rate limit must be a positive integer');
  }
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new ValidationError('Rate limit window must be a positive integer');
  }
}

/**
 * File upload validation
 */
function validateFileUpload(file, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/plain'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.txt']
  } = options;

  if (!file) {
    throw new ValidationError('No file provided');
  }

  if (file.size > maxSize) {
    throw new ValidationError(`File size exceeds maximum allowed size of ${maxSize} bytes`);
  }

  if (!allowedTypes.includes(file.mimetype)) {
    throw new ValidationError(`File type ${file.mimetype} is not allowed`);
  }

  const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    throw new ValidationError(`File extension ${extension} is not allowed`);
  }

  return true;
}

/**
 * URL validation
 */
function validateUrl(url, options = {}) {
  const { allowedProtocols = ['http:', 'https:'] } = options;
  
  try {
    const urlObj = new URL(url);
    
    if (!allowedProtocols.includes(urlObj.protocol)) {
      throw new ValidationError(`Protocol ${urlObj.protocol} is not allowed`);
    }
    
    return true;
  } catch (error) {
    throw new ValidationError('Invalid URL format');
  }
}

/**
 * Email validation
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
  
  return true;
}

/**
 * Password validation
 */
function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false
  } = options;

  if (password.length < minLength) {
    throw new ValidationError(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    throw new ValidationError('Password must contain at least one lowercase letter');
  }

  if (requireNumbers && !/\d/.test(password)) {
    throw new ValidationError('Password must contain at least one number');
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new ValidationError('Password must contain at least one special character');
  }

  return true;
}

module.exports = {
  schemas,
  createValidationMiddleware,
  createQueryValidationMiddleware,
  createParamValidationMiddleware,
  sanitizeHtml,
  sanitizeText,
  sanitizeObject,
  sanitizationMiddleware,
  validateRateLimit,
  validateFileUpload,
  validateUrl,
  validateEmail,
  validatePassword,
};
