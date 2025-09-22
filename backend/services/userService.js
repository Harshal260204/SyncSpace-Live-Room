/**
 * User Service
 * 
 * Business logic layer for user operations
 * Handles user creation, validation, and session management
 */

const User = require('../models/User');
const { NotFoundError, ConflictError, ValidationError, logger } = require('../utils/errorHandler');

class UserService {
  /**
   * Create a new user session
   */
  static async createUser(userData) {
    try {
      const { username, preferences = {} } = userData;
      const sessionId = require('uuid').v4();
      const userId = require('uuid').v4();

      // Check if username is already taken in active sessions
      const existingUser = await User.findOne({
        username,
        isActive: true,
      });

      if (existingUser) {
        throw new ConflictError('Username already in use');
      }

      // Validate and sanitize preferences
      const sanitizedPreferences = this.sanitizePreferences(preferences);

      // Create new user
      const user = new User({
        userId,
        username,
        sessionId,
        preferences: sanitizedPreferences,
      });

      await user.save();

      logger.info('User created successfully', {
        userId,
        username,
        sessionId
      });

      return this.transformUserData(user);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    try {
      const user = await User.findByUserId(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      return this.transformUserData(user);
    } catch (error) {
      logger.error('Error fetching user by ID:', error);
      throw error;
    }
  }

  /**
   * Get user by session ID
   */
  static async getUserBySessionId(sessionId) {
    try {
      const user = await User.findBySessionId(sessionId);
      if (!user) {
        throw new NotFoundError('User session');
      }

      return this.transformUserData(user);
    } catch (error) {
      logger.error('Error fetching user by session ID:', error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  static async updateUser(userId, updateData) {
    try {
      const user = await User.findByUserId(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Check if new username is already taken (if username is being changed)
      if (updateData.username && updateData.username !== user.username) {
        const existingUser = await User.findOne({
          username: updateData.username,
          isActive: true,
          userId: { $ne: userId },
        });

        if (existingUser) {
          throw new ConflictError('Username already in use');
        }
      }

      // Update allowed fields
      const allowedUpdates = ['username', 'preferences'];
      const updates = {};

      for (const field of allowedUpdates) {
        if (updateData[field] !== undefined) {
          if (field === 'preferences') {
            updates[field] = this.sanitizePreferences(updateData[field]);
          } else {
            updates[field] = updateData[field];
          }
        }
      }

      // Apply updates
      Object.assign(user, updates);
      await user.save();

      logger.info('User updated successfully', {
        userId,
        updates: Object.keys(updates)
      });

      return this.transformUserData(user);
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Deactivate user session
   */
  static async deactivateUser(userId) {
    try {
      const user = await User.findByUserId(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      await user.deactivate();

      logger.info('User deactivated successfully', {
        userId,
        username: user.username
      });

      return { message: 'User session deactivated successfully', userId };
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Get user activity statistics
   */
  static async getUserActivity(userId) {
    try {
      const user = await User.findByUserId(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      return {
        userId: user.userId,
        username: user.username,
        activityStats: user.activityStats,
        lastSeen: user.lastSeen,
        currentRoom: user.currentRoom,
      };
    } catch (error) {
      logger.error('Error fetching user activity:', error);
      throw error;
    }
  }

  /**
   * Update user's time spent in session
   */
  static async updateUserTime(userId, minutes) {
    try {
      const user = await User.findByUserId(userId);
      if (!user) {
        throw new NotFoundError('User');
      }

      if (minutes < 0) {
        throw new ValidationError('Time cannot be negative');
      }

      await user.updateTimeSpent(minutes);

      logger.info('User time updated successfully', {
        userId,
        minutes,
        totalTime: user.activityStats.totalTimeSpent
      });

      return {
        message: 'Time updated successfully',
        userId: user.userId,
        totalTimeSpent: user.activityStats.totalTimeSpent,
      };
    } catch (error) {
      logger.error('Error updating user time:', error);
      throw error;
    }
  }

  /**
   * Get active users
   */
  static async getActiveUsers(limit = 50) {
    try {
      const users = await User.findActiveUsers().limit(limit);
      return users.map(user => this.transformUserData(user));
    } catch (error) {
      logger.error('Error fetching active users:', error);
      throw error;
    }
  }

  /**
   * Get users in a specific room
   */
  static async getUsersInRoom(roomId) {
    try {
      const users = await User.findUsersInRoom(roomId);
      return users.map(user => this.transformUserData(user));
    } catch (error) {
      logger.error('Error fetching users in room:', error);
      throw error;
    }
  }

  /**
   * Clean up inactive users (called by scheduled job)
   */
  static async cleanupInactiveUsers() {
    try {
      const result = await User.cleanupInactiveUsers();
      logger.info('User cleanup completed', { 
        modifiedCount: result.modifiedCount 
      });
      return result;
    } catch (error) {
      logger.error('Error during user cleanup:', error);
      throw error;
    }
  }

  /**
   * Sanitize user preferences
   */
  static sanitizePreferences(preferences) {
    const defaultPreferences = {
      accessibility: {
        screenReader: false,
        highContrast: false,
        fontSize: 'medium',
        announceChanges: true,
        keyboardNavigation: true,
      },
      appearance: {
        theme: 'auto',
        cursorColor: '#3B82F6',
      },
      notifications: {
        chatMessages: true,
        userJoinLeave: true,
        codeChanges: false,
        systemAnnouncements: true,
      },
    };

    // Deep merge with defaults
    const sanitized = this.deepMerge(defaultPreferences, preferences);

    // Validate specific fields
    if (!['small', 'medium', 'large'].includes(sanitized.accessibility.fontSize)) {
      sanitized.accessibility.fontSize = 'medium';
    }

    if (!['light', 'dark', 'auto'].includes(sanitized.appearance.theme)) {
      sanitized.appearance.theme = 'auto';
    }

    if (!/^#[0-9A-F]{6}$/i.test(sanitized.appearance.cursorColor)) {
      sanitized.appearance.cursorColor = '#3B82F6';
    }

    return sanitized;
  }

  /**
   * Deep merge objects
   */
  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Transform user data for API response
   */
  static transformUserData(user) {
    return {
      userId: user.userId,
      username: user.username,
      sessionId: user.sessionId,
      preferences: user.preferences,
      activityStats: user.activityStats,
      lastSeen: user.lastSeen,
      currentRoom: user.currentRoom,
      createdAt: user.createdAt,
      isActive: user.isActive,
    };
  }
}

module.exports = UserService;
