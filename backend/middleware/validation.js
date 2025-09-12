/**
 * Validation Middleware
 * 
 * Custom validation functions and middleware for request validation
 * Provides consistent error handling and validation across all routes
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 * Returns formatted error response if validation fails
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid input data provided',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
        location: err.location,
      })),
    });
  }
  next();
};

/**
 * Validation rules for room creation
 */
const validateRoomCreation = [
  body('roomName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Room name must be between 1 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters')
    .trim(),
  body('maxParticipants')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('Max participants must be between 2 and 100'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  body('settings.allowAnonymous')
    .optional()
    .isBoolean()
    .withMessage('allowAnonymous must be a boolean'),
  body('settings.allowCodeEditing')
    .optional()
    .isBoolean()
    .withMessage('allowCodeEditing must be a boolean'),
  body('settings.allowNotesEditing')
    .optional()
    .isBoolean()
    .withMessage('allowNotesEditing must be a boolean'),
  body('settings.allowCanvasDrawing')
    .optional()
    .isBoolean()
    .withMessage('allowCanvasDrawing must be a boolean'),
  body('settings.allowChat')
    .optional()
    .isBoolean()
    .withMessage('allowChat must be a boolean'),
  body('settings.isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
];

/**
 * Validation rules for user creation
 */
const validateUserCreation = [
  body('username')
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Username can only contain letters, numbers, spaces, hyphens, and underscores')
    .trim(),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  body('preferences.accessibility')
    .optional()
    .isObject()
    .withMessage('Accessibility preferences must be an object'),
  body('preferences.accessibility.screenReader')
    .optional()
    .isBoolean()
    .withMessage('screenReader must be a boolean'),
  body('preferences.accessibility.highContrast')
    .optional()
    .isBoolean()
    .withMessage('highContrast must be a boolean'),
  body('preferences.accessibility.fontSize')
    .optional()
    .isIn(['small', 'medium', 'large'])
    .withMessage('fontSize must be small, medium, or large'),
  body('preferences.appearance')
    .optional()
    .isObject()
    .withMessage('Appearance preferences must be an object'),
  body('preferences.appearance.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('theme must be light, dark, or auto'),
  body('preferences.appearance.cursorColor')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('cursorColor must be a valid hex color code'),
];

/**
 * Validation rules for pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

/**
 * Validation rules for room ID parameter
 */
const validateRoomId = [
  param('roomId')
    .isLength({ min: 1 })
    .withMessage('Room ID is required')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Room ID contains invalid characters'),
];

/**
 * Validation rules for user ID parameter
 */
const validateUserId = [
  param('userId')
    .isLength({ min: 1 })
    .withMessage('User ID is required')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('User ID contains invalid characters'),
];

/**
 * Validation rules for session ID parameter
 */
const validateSessionId = [
  param('sessionId')
    .isLength({ min: 1 })
    .withMessage('Session ID is required')
    .matches(/^[a-zA-Z0-9\-_]+$/)
    .withMessage('Session ID contains invalid characters'),
];

/**
 * Validation rules for chat messages
 */
const validateChatMessage = [
  body('message')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
    .trim(),
  body('messageType')
    .optional()
    .isIn(['text', 'system', 'announcement'])
    .withMessage('messageType must be text, system, or announcement'),
];

/**
 * Validation rules for code changes
 */
const validateCodeChange = [
  body('content')
    .isString()
    .withMessage('Content must be a string'),
  body('language')
    .optional()
    .isIn(['javascript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'markdown', 'plaintext'])
    .withMessage('Language must be a supported programming language'),
  body('cursorPosition')
    .optional()
    .isObject()
    .withMessage('cursorPosition must be an object'),
];

/**
 * Validation rules for notes changes
 */
const validateNotesChange = [
  body('content')
    .isString()
    .withMessage('Content must be a string'),
];

/**
 * Validation rules for canvas drawing
 */
const validateCanvasDrawing = [
  body('drawingData')
    .isObject()
    .withMessage('drawingData must be an object'),
  body('action')
    .optional()
    .isString()
    .withMessage('action must be a string'),
];

/**
 * Validation rules for presence updates
 */
const validatePresenceUpdate = [
  body('cursorPosition')
    .optional()
    .isObject()
    .withMessage('cursorPosition must be an object'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

/**
 * Sanitize input data to prevent XSS attacks
 */
const sanitizeInput = (req, res, next) => {
  // Recursively sanitize string values
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      return value
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .trim();
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};

/**
 * Rate limiting for specific endpoints
 */
const createRateLimit = (windowMs, max, message) => {
  const rateLimit = require('express-rate-limit');
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = {
  handleValidationErrors,
  validateRoomCreation,
  validateUserCreation,
  validatePagination,
  validateRoomId,
  validateUserId,
  validateSessionId,
  validateChatMessage,
  validateCodeChange,
  validateNotesChange,
  validateCanvasDrawing,
  validatePresenceUpdate,
  sanitizeInput,
  createRateLimit,
};
