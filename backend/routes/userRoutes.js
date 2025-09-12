/**
 * User Routes
 * 
 * RESTful API endpoints for user management
 * Handles user creation, preferences, and session management
 * Includes proper validation and error handling
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
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
], async (req, res) => {
  try {
    const { username, preferences = {} } = req.body;
    const sessionId = require('uuid').v4();
    const userId = require('uuid').v4();

    // Check if username is already taken in active sessions
    const existingUser = await User.findOne({
      username,
      isActive: true,
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Username taken',
        message: 'This username is already in use. Please choose a different one.',
      });
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
    console.error('❌ Error creating user:', error);
    res.status(500).json({
      error: 'Failed to create user',
      message: 'An error occurred while creating the user session',
    });
  }
});

/**
 * GET /api/users/:userId
 * Get user details by user ID
 */
router.get('/:userId', [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByUserId(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist or is inactive',
      });
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
    console.error('❌ Error fetching user:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: 'An error occurred while retrieving user details',
    });
  }
});

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
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, preferences } = req.body;
    
    const user = await User.findByUserId(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist or is inactive',
      });
    }

    // Check if new username is already taken (if username is being changed)
    if (username && username !== user.username) {
      const existingUser = await User.findOne({
        username,
        isActive: true,
        userId: { $ne: userId },
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Username taken',
          message: 'This username is already in use. Please choose a different one.',
        });
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
    console.error('❌ Error updating user:', error);
    res.status(500).json({
      error: 'Failed to update user',
      message: 'An error occurred while updating the user',
    });
  }
});

/**
 * DELETE /api/users/:userId
 * Deactivate a user session (soft delete)
 */
router.delete('/:userId', [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
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
    console.error('❌ Error deactivating user:', error);
    res.status(500).json({
      error: 'Failed to deactivate user',
      message: 'An error occurred while deactivating the user session',
    });
  }
});

/**
 * GET /api/users/:userId/activity
 * Get user activity statistics
 */
router.get('/:userId/activity', [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByUserId(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist or is inactive',
      });
    }

    res.json({
      userId: user.userId,
      username: user.username,
      activityStats: user.activityStats,
      lastSeen: user.lastSeen,
      currentRoom: user.currentRoom,
    });

  } catch (error) {
    console.error('❌ Error fetching user activity:', error);
    res.status(500).json({
      error: 'Failed to fetch user activity',
      message: 'An error occurred while retrieving user activity data',
    });
  }
});

/**
 * POST /api/users/:userId/update-time
 * Update user's time spent in current session
 */
router.post('/:userId/update-time', [
  param('userId').isLength({ min: 1 }).withMessage('User ID is required'),
  body('minutes').isInt({ min: 0 }).withMessage('Minutes must be a non-negative integer'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { minutes } = req.body;
    
    const user = await User.findByUserId(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The requested user does not exist or is inactive',
      });
    }

    await user.updateTimeSpent(minutes);

    res.json({
      message: 'Time updated successfully',
      userId: user.userId,
      totalTimeSpent: user.activityStats.totalTimeSpent,
    });

  } catch (error) {
    console.error('❌ Error updating user time:', error);
    res.status(500).json({
      error: 'Failed to update time',
      message: 'An error occurred while updating user time',
    });
  }
});

/**
 * GET /api/users/session/:sessionId
 * Get user by session ID (for socket connections)
 */
router.get('/session/:sessionId', [
  param('sessionId').isLength({ min: 1 }).withMessage('Session ID is required'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const user = await User.findBySessionId(sessionId);
    if (!user) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The requested session does not exist or is inactive',
      });
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
    console.error('❌ Error fetching user by session:', error);
    res.status(500).json({
      error: 'Failed to fetch user session',
      message: 'An error occurred while retrieving user session data',
    });
  }
});

module.exports = router;
