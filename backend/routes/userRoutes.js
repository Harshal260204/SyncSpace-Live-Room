/**
 * User Routes
 * 
 * RESTful API endpoints for user management
 * Handles user creation, preferences, and session management
 * Includes proper validation and error handling
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const UserService = require('../services/userService');
const { 
  asyncHandler, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  logger 
} = require('../utils/errorHandler');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    return next(new ValidationError('Validation failed', details));
  }
  next();
};

/**
 * POST /api/users
 * Create a new anonymous user session
 */
router.post('/', [
  body('username').isLength({ min: 1, max: 50 }).withMessage('Username must be between 1 and 50 characters'),
  body('username').matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Username can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const userData = req.body;
  
  const user = await UserService.createUser(userData);

  res.status(201).json(user);
}));

/**
 * GET /api/users/:userId
 * Get user details by user ID
 */
router.get('/:userId', [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const user = await UserService.getUserById(userId);

  res.json(user);
}));

/**
 * PUT /api/users/:userId
 * Update user preferences and settings
 */
router.put('/:userId', [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
  body('username').optional().isLength({ min: 1, max: 50 }).withMessage('Username must be between 1 and 50 characters'),
  body('username').optional().matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Username can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const updateData = req.body;
  
  const user = await UserService.updateUser(userId, updateData);

  res.json(user);
}));

/**
 * DELETE /api/users/:userId
 * Deactivate a user session (soft delete)
 */
router.delete('/:userId', [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const result = await UserService.deactivateUser(userId);

  res.json(result);
}));

/**
 * GET /api/users/:userId/activity
 * Get user activity statistics
 */
router.get('/:userId/activity', [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  const activity = await UserService.getUserActivity(userId);

  res.json(activity);
}));

/**
 * POST /api/users/:userId/update-time
 * Update user's time spent in current session
 */
router.post('/:userId/update-time', [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
  body('minutes').isInt({ min: 0 }).withMessage('Minutes must be a non-negative integer'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { minutes } = req.body;
  
  const result = await UserService.updateUserTime(userId, minutes);

  res.json(result);
}));

/**
 * GET /api/users/session/:sessionId
 * Get user by session ID (for socket connections)
 */
router.get('/session/:sessionId', [
  param('sessionId').isLength({ min: 1 }).withMessage('Session ID is required'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  
  const user = await UserService.getUserBySessionId(sessionId);

  res.json(user);
}));

module.exports = router;
