/**
 * Room Model
 * 
 * Defines the schema for collaborative rooms in Live Room
 * Stores room state, participants, chat history, and collaborative content
 */

const mongoose = require('mongoose');

/**
 * User presence schema for tracking active users in a room
 * Includes cursor position, last activity, and accessibility preferences
 */
const userPresenceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  socketId: {
    type: String,
    required: true,
  },
  cursorPosition: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  accessibility: {
    screenReader: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false },
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
  },
  color: {
    type: String,
    default: '#3B82F6', // Default blue color for cursor
  },
}, {
  timestamps: true,
});

/**
 * Chat message schema for room chat functionality
 * Includes message content, sender info, and accessibility features
 */
const chatMessageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => require('uuid').v4(),
  },
  userId: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  messageType: {
    type: String,
    enum: ['text', 'system', 'announcement'],
    default: 'text',
  },
  isAccessible: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

/**
 * Code collaboration schema for real-time code editing
 * Stores code content, language, and collaborative editing state
 */
const codeCollaborationSchema = new mongoose.Schema({
  language: {
    type: String,
    required: true,
    default: 'javascript',
    enum: ['javascript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'markdown', 'plaintext'],
  },
  content: {
    type: String,
    default: '',
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  lastModifiedBy: {
    userId: String,
    username: String,
  },
  version: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
});

/**
 * Notes collaboration schema for real-time note editing
 * Stores note content and collaborative editing state
 */
const notesCollaborationSchema = new mongoose.Schema({
  content: {
    type: String,
    default: '',
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  lastModifiedBy: {
    userId: String,
    username: String,
  },
  version: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
});

/**
 * Canvas drawing schema for collaborative sketching
 * Stores drawing data as JSON for real-time canvas collaboration
 */
const canvasDrawingSchema = new mongoose.Schema({
  drawingData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  lastModifiedBy: {
    userId: String,
    username: String,
  },
  version: {
    type: Number,
    default: 1,
  },
}, {
  timestamps: true,
});

/**
 * Main Room schema
 * Contains all collaborative features and room management data
 */
const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    default: () => require('uuid').v4(),
  },
  roomName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    default: 'Untitled Room',
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  createdBy: {
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  maxParticipants: {
    type: Number,
    default: 50,
    min: 2,
    max: 100,
  },
  currentParticipants: {
    type: Number,
    default: 0,
  },
  participants: [userPresenceSchema],
  chatMessages: [chatMessageSchema],
  codeCollaboration: codeCollaborationSchema,
  notesCollaboration: notesCollaborationSchema,
  canvasDrawing: canvasDrawingSchema,
  lastActivity: {
    type: Date,
    default: Date.now,
  },
  settings: {
    allowAnonymous: {
      type: Boolean,
      default: true,
    },
    allowCodeEditing: {
      type: Boolean,
      default: true,
    },
    allowNotesEditing: {
      type: Boolean,
      default: true,
    },
    allowCanvasDrawing: {
      type: Boolean,
      default: true,
    },
    allowChat: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
roomSchema.index({ isActive: 1, lastActivity: -1 });
roomSchema.index({ 'participants.userId': 1 });
roomSchema.index({ createdAt: -1 });

// Pre-save middleware to update lastActivity and maintain data integrity
roomSchema.pre('save', function(next) {
  try {
    this.lastActivity = new Date();
    
    // Ensure participants array exists and is valid
    if (!Array.isArray(this.participants)) {
      this.participants = [];
    }
    
    // Clean up inactive participants (older than 1 hour) to prevent array bloat
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.participants = this.participants.filter(p => {
      // Ensure participant has required fields
      if (!p || !p.userId || !p.username) {
        return false;
      }
      return p.isActive || (p.lastActivity && p.lastActivity > oneHourAgo);
    });
    
    // Recalculate current participants with validation
    this.currentParticipants = this.participants.filter(p => p.isActive === true).length;
    
    // Ensure currentParticipants is not negative
    if (this.currentParticipants < 0) {
      this.currentParticipants = 0;
    }
    
    // Ensure maxParticipants is within valid range
    if (this.maxParticipants < 2) {
      this.maxParticipants = 2;
    } else if (this.maxParticipants > 100) {
      this.maxParticipants = 100;
    }
    
    console.log(`🧹 Room ${this.roomId} cleanup: ${this.participants.length} total, ${this.currentParticipants} active`);
    
    next();
  } catch (error) {
    console.error('❌ Error in pre-save middleware:', error);
    next(error);
  }
});

// Instance methods for room management
roomSchema.methods.addParticipant = async function(userData) {
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // First, try to update existing participant
      const updateResult = await this.constructor.findOneAndUpdate(
        { 
          _id: this._id,
          'participants.userId': userData.userId 
        },
        {
          $set: {
            'participants.$.socketId': userData.socketId,
            'participants.$.isActive': true,
            'participants.$.lastActivity': new Date(),
            'participants.$.accessibility': userData.accessibility || {},
            'participants.$.color': userData.color || '#3B82F6'
          }
        },
        { new: true, runValidators: true }
      );

      // If no existing participant was found, add new one
      if (!updateResult) {
        await this.constructor.findByIdAndUpdate(
          this._id,
          {
            $push: {
              participants: {
                ...userData,
                lastActivity: new Date(),
                isActive: true,
              }
            }
          },
          { new: true, runValidators: true }
        );
      }

      // Clean up inactive participants and update count atomically
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await this.constructor.findByIdAndUpdate(
        this._id,
        {
          $pull: {
            participants: {
              isActive: false,
              lastActivity: { $lt: oneHourAgo }
            }
          }
        }
      );

      // Update participant count
      const updatedRoom = await this.constructor.findById(this._id);
      if (updatedRoom) {
        updatedRoom.currentParticipants = updatedRoom.participants.filter(p => p.isActive).length;
        await updatedRoom.save();
        return updatedRoom;
      }
      
      return this;
      
    } catch (error) {
      console.error(`❌ addParticipant attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (error.name === 'VersionError' && attempt < maxRetries) {
        // Refresh the document and retry
        const freshRoom = await this.constructor.findById(this._id);
        if (freshRoom) {
          Object.assign(this, freshRoom);
          continue;
        }
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt - 1)));
    }
  }
};

roomSchema.methods.removeParticipant = async function(userId) {
  try {
    // Use atomic operation to mark participant as inactive
    await this.constructor.findOneAndUpdate(
      { 
        _id: this._id,
        'participants.userId': userId 
      },
      {
        $set: {
          'participants.$.isActive': false,
          'participants.$.lastActivity': new Date()
        }
      },
      { new: true, runValidators: true }
    );

    // Clean up inactive participants and update count atomically
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await this.constructor.findByIdAndUpdate(
      this._id,
      {
        $pull: {
          participants: {
            isActive: false,
            lastActivity: { $lt: oneHourAgo }
          }
        }
      }
    );

    // Update participant count
    const updatedRoom = await this.constructor.findById(this._id);
    if (updatedRoom) {
      updatedRoom.currentParticipants = updatedRoom.participants.filter(p => p.isActive).length;
      await updatedRoom.save();
      return updatedRoom;
    }

    return this;
  } catch (error) {
    console.error('❌ Error removing participant:', error);
    throw error;
  }
};

roomSchema.methods.addChatMessage = function(messageData) {
  this.chatMessages.push({
    ...messageData,
    timestamp: new Date(),
  });
  
  // Keep only last 100 messages to prevent database bloat
  if (this.chatMessages.length > 100) {
    this.chatMessages = this.chatMessages.slice(-100);
  }
  
  return this.save();
};

roomSchema.methods.updateCodeContent = function(codeData) {
  // Initialize codeCollaboration if it doesn't exist
  if (!this.codeCollaboration) {
    this.codeCollaboration = {
      content: '',
      language: 'javascript',
      lastModified: new Date(),
      lastModifiedBy: { userId: '', username: '' },
      version: 0
    };
  }
  
  this.codeCollaboration.content = codeData.content;
  this.codeCollaboration.language = codeData.language || this.codeCollaboration.language;
  this.codeCollaboration.lastModified = new Date();
  this.codeCollaboration.lastModifiedBy = {
    userId: codeData.userId,
    username: codeData.username,
  };
  this.codeCollaboration.version += 1;
  return this.save();
};

roomSchema.methods.updateNotesContent = function(notesData) {
  // Initialize notesCollaboration if it doesn't exist
  if (!this.notesCollaboration) {
    this.notesCollaboration = {
      content: '',
      lastModified: new Date(),
      lastModifiedBy: { userId: '', username: '' },
      version: 0
    };
  }
  
  this.notesCollaboration.content = notesData.content;
  this.notesCollaboration.lastModified = new Date();
  this.notesCollaboration.lastModifiedBy = {
    userId: notesData.userId,
    username: notesData.username,
  };
  this.notesCollaboration.version += 1;
  return this.save();
};

roomSchema.methods.updateCanvasDrawing = function(drawingData) {
  // Initialize canvasDrawing if it doesn't exist
  if (!this.canvasDrawing) {
    this.canvasDrawing = {
      drawingData: '',
      lastModified: new Date(),
      lastModifiedBy: { userId: '', username: '' },
      version: 0
    };
  }
  
  this.canvasDrawing.drawingData = drawingData.drawingData;
  this.canvasDrawing.lastModified = new Date();
  this.canvasDrawing.lastModifiedBy = {
    userId: drawingData.userId,
    username: drawingData.username,
  };
  this.canvasDrawing.version += 1;
  return this.save();
};

// Static methods for room queries
roomSchema.statics.findActiveRooms = function() {
  return this.find({ isActive: true }).sort({ lastActivity: -1 });
};

roomSchema.statics.findRoomById = function(roomId) {
  return this.findOne({ roomId, isActive: true });
};

roomSchema.statics.cleanupInactiveRooms = function() {
  const cutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  return this.updateMany(
    { 
      isActive: true, 
      lastActivity: { $lt: cutoffTime },
      currentParticipants: 0 
    },
    { isActive: false }
  );
};

module.exports = mongoose.model('Room', roomSchema);
