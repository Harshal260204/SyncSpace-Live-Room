/**
 * User Routes
 * 
 * RESTful API endpoints for user management
 * Handles user creation, preferences, and session management
 * Includes proper validation and error handling
 */

const express = require('express');
const { body, param } = require('express-validator');
const User = require('../models/User');
const { handleValidationErrors, validateUserCreation, validateUserId, validateSessionId } = require('../middleware/validation');
const { sendServerError, sendNotFoundError, sendConflictError } = require('../utils/errorHandler');

const router = express.Router();

/**
 * POST /api/users
 * Create a new anonymous user session
 */
router.post('/', [
  ...validateUserCreation,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { username, preferences = {} } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const sessionId = uuidv4();
    const userId = uuidv4();

    // Check if username is already taken in active sessions
    const existingUser = await User.findOne({
      username,
      isActive: true,
    });

    if (existingUser) {
      return sendConflictError(res, 'Username taken', 'This username is already in use. Please choose a different one.');
    }

    // Create new user
    const user = new User({
      userId,
      username,
      sessionId,
      preferences,
    });

    await user.save();

    res.status(201).json({
      userId: user.userId,
      username: user.username,
      sessionId: user.sessionId,
      preferences: user.preferences,
      createdAt: user.createdAt,
    });

  } catch (error) {
    sendServerError(res, 'Failed to create user', 'An error occurred while creating the user session');
  }
});

/**
 * GET /api/users/:userId
 * Get user details by user ID
 */
router.get('/:userId', [
  ...validateUserId,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByUserId(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found', 'The requested user does not exist or is inactive');
    }

    // Return user data without sensitive information
    const userData = {
      userId: user.userId,
      username: user.username,
      preferences: user.preferences,
      activityStats: user.activityStats,
      lastSeen: user.lastSeen,
      currentRoom: user.currentRoom,
      createdAt: user.createdAt,
    };

    res.json(userData);

  } catch (error) {
    sendServerError(res, 'Failed to fetch user', 'An error occurred while retrieving user details');
  }
});

/**
 * PUT /api/users/:userId
 * Update user preferences and settings
 */
router.put('/:userId', [
  ...validateUserId,
  body('username').optional().isLength({ min: 1, max: 50 }).withMessage('Username must be between 1 and 50 characters'),
  body('username').optional().matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Username can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, preferences } = req.body;
    
    const user = await User.findByUserId(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found', 'The requested user does not exist or is inactive');
    }

    // Check if new username is already taken (if username is being changed)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        username,
        isActive: true,
        userId: { $ne: userId },
      });

      if (existingUser) {
        return sendConflictError(res, 'Username taken', 'This username is already in use. Please choose a different one.');
      }
    }

    // Update user fields
    if (username !== undefined) user.username = username;
    if (preferences !== undefined) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    res.json({
      userId: user.userId,
      username: user.username,
      preferences: user.preferences,
      updatedAt: user.updatedAt,
    });

  } catch (error) {
    sendServerError(res, 'Failed to update user', 'An error occurred while updating the user');
  }
});

/**
 * DELETE /api/users/:userId
 * Deactivate a user session (soft delete)
 */
router.delete('/:userId', [
  ...validateUserId,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByUserId(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist or is already inactive',
      });
    }

    // Soft delete - mark as inactive
    await user.deactivate();

    res.json({
      message: 'User session deactivated successfully',
      userId: user.userId,
    });

  } catch (error) {
    sendServerError(res, 'Failed to deactivate user', 'An error occurred while deactivating the user session');
  }
});

/**
 * GET /api/users/:userId/activity
 * Get user activity statistics
 */
router.get('/:userId/activity', [
  ...validateUserId,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByUserId(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found', 'The requested user does not exist or is inactive');
    }

    res.json({
      userId: user.userId,
      username: user.username,
      activityStats: user.activityStats,
      lastSeen: user.lastSeen,
      currentRoom: user.currentRoom,
    });

  } catch (error) {
    sendServerError(res, 'Failed to fetch user activity', 'An error occurred while retrieving user activity data');
  }
});

/**
 * POST /api/users/:userId/update-time
 * Update user's time spent in current session
 */
router.post('/:userId/update-time', [
  ...validateUserId,
  body('minutes').isInt({ min: 0 }).withMessage('Minutes must be a non-negative integer'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { minutes } = req.body;
    
    const user = await User.findByUserId(userId);
    if (!user) {
      return sendNotFoundError(res, 'User not found', 'The requested user does not exist or is inactive');
    }

    await user.updateTimeSpent(minutes);

    res.json({
      message: 'Time updated successfully',
      userId: user.userId,
      totalTimeSpent: user.activityStats.totalTimeSpent,
    });

  } catch (error) {
    sendServerError(res, 'Failed to update time', 'An error occurred while updating user time');
  }
});

/**
 * GET /api/users/session/:sessionId
 * Get user by session ID (for socket connections)
 */
router.get('/session/:sessionId', [
  ...validateSessionId,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const user = await User.findBySessionId(sessionId);
    if (!user) {
      return sendNotFoundError(res, 'Session not found', 'The requested session does not exist or is inactive');
    }

    res.json({
      userId: user.userId,
      username: user.username,
      sessionId: user.sessionId,
      preferences: user.preferences,
      currentRoom: user.currentRoom,
      lastSeen: user.lastSeen,
    });

  } catch (error) {
    sendServerError(res, 'Failed to fetch user session', 'An error occurred while retrieving user session data');
  }
});

module.exports = router;
