/**
 * User Model
 * 
 * Defines the schema for anonymous guest users in Live Room
 * Stores minimal user data for session management and accessibility preferences
 */

const mongoose = require('mongoose');

/**
 * User schema for anonymous guest users
 * Minimal data collection focusing on accessibility and session management
 */
const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 50,
    validate: {
      validator: function(v) {
        // Username validation: alphanumeric, spaces, hyphens, underscores only
        return /^[a-zA-Z0-9\s\-_]+$/.test(v);
      },
      message: 'Username can only contain letters, numbers, spaces, hyphens, and underscores',
    },
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  currentRoom: {
    type: String,
    default: null,
  },
  preferences: {
    accessibility: {
      screenReader: {
        type: Boolean,
        default: false,
      },
      highContrast: {
        type: Boolean,
        default: false,
      },
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium',
      },
      announceChanges: {
        type: Boolean,
        default: true,
      },
      keyboardNavigation: {
        type: Boolean,
        default: true,
      },
    },
    appearance: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto',
      },
      cursorColor: {
        type: String,
        default: '#3B82F6',
        validate: {
          validator: function(v) {
            return /^#[0-9A-F]{6}$/i.test(v);
          },
          message: 'Cursor color must be a valid hex color code',
        },
      },
    },
    notifications: {
      chatMessages: {
        type: Boolean,
        default: true,
      },
      userJoinLeave: {
        type: Boolean,
        default: true,
      },
      codeChanges: {
        type: Boolean,
        default: false,
      },
      systemAnnouncements: {
        type: Boolean,
        default: true,
      },
    },
  },
  activityStats: {
    totalRoomsJoined: {
      type: Number,
      default: 0,
    },
    totalMessagesSent: {
      type: Number,
      default: 0,
    },
    totalTimeSpent: {
      type: Number, // in minutes
      default: 0,
    },
    lastRoomJoined: {
      type: Date,
      default: null,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
userSchema.index({ isActive: 1, lastSeen: -1 });
userSchema.index({ currentRoom: 1 });

// Pre-save middleware to update lastSeen
userSchema.pre('save', function(next) {
  this.lastSeen = new Date();
  next();
});

// Instance methods for user management
userSchema.methods.updateActivity = async function() {
  try {
    // Use atomic operation to prevent race conditions
    const result = await this.constructor.findByIdAndUpdate(
      this._id,
      {
        $set: {
          lastSeen: new Date()
        }
      },
      { new: true, runValidators: true }
    );
    
    if (result) {
      this.lastSeen = result.lastSeen;
    }
    
    return this;
  } catch (error) {
    console.error('❌ Error updating activity:', error);
    throw error;
  }
};

userSchema.methods.joinRoom = async function(roomId) {
  try {
    // Use atomic operation to prevent race conditions
    const result = await this.constructor.findByIdAndUpdate(
      this._id,
      {
        $set: {
          currentRoom: roomId,
          lastSeen: new Date()
        },
        $inc: {
          'activityStats.totalRoomsJoined': 1
        },
        $currentDate: {
          'activityStats.lastRoomJoined': true
        }
      },
      { new: true, runValidators: true }
    );
    
    if (result) {
      Object.assign(this, result);
    }
    
    return this;
  } catch (error) {
    console.error('❌ Error joining room:', error);
    throw error;
  }
};

userSchema.methods.leaveRoom = async function() {
  try {
    // Use atomic operation to prevent race conditions
    const result = await this.constructor.findByIdAndUpdate(
      this._id,
      {
        $set: {
          currentRoom: null,
          lastSeen: new Date()
        }
      },
      { new: true, runValidators: true }
    );
    
    if (result) {
      Object.assign(this, result);
    }
    
    return this;
  } catch (error) {
    console.error('❌ Error leaving room:', error);
    throw error;
  }
};

userSchema.methods.updatePreferences = function(newPreferences) {
  this.preferences = { ...this.preferences, ...newPreferences };
  return this.save();
};

userSchema.methods.incrementMessageCount = function() {
  this.activityStats.totalMessagesSent += 1;
  return this.save();
};

userSchema.methods.updateTimeSpent = function(minutes) {
  this.activityStats.totalTimeSpent += minutes;
  return this.save();
};

userSchema.methods.deactivate = function() {
  this.isActive = false;
  this.currentRoom = null;
  return this.save();
};

// Static methods for user queries
userSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ sessionId, isActive: true });
};

userSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId, isActive: true });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true }).sort({ lastSeen: -1 });
};

userSchema.statics.findUsersInRoom = function(roomId) {
  return this.find({ currentRoom: roomId, isActive: true });
};

userSchema.statics.cleanupInactiveUsers = function() {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  return this.updateMany(
    { 
      isActive: true, 
      lastSeen: { $lt: cutoffTime } 
    },
    { isActive: false }
  );
};

// Virtual for user display name (can be customized later)
userSchema.virtual('displayName').get(function() {
  return this.username;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
