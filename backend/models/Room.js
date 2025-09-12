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
roomSchema.index({ roomId: 1 });
roomSchema.index({ isActive: 1, lastActivity: -1 });
roomSchema.index({ 'participants.userId': 1 });
roomSchema.index({ createdAt: -1 });

// Pre-save middleware to update lastActivity
roomSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  this.currentParticipants = this.participants.filter(p => p.isActive).length;
  next();
});

// Instance methods for room management
roomSchema.methods.addParticipant = function(userData) {
  const existingParticipant = this.participants.find(p => p.userId === userData.userId);
  
  if (existingParticipant) {
    // Update existing participant
    existingParticipant.socketId = userData.socketId;
    existingParticipant.isActive = true;
    existingParticipant.lastActivity = new Date();
    existingParticipant.accessibility = { ...existingParticipant.accessibility, ...userData.accessibility };
  } else {
    // Add new participant
    this.participants.push({
      ...userData,
      lastActivity: new Date(),
      isActive: true,
    });
  }
  
  this.currentParticipants = this.participants.filter(p => p.isActive).length;
  return this.save();
};

roomSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.userId === userId);
  if (participant) {
    participant.isActive = false;
    participant.lastActivity = new Date();
    this.currentParticipants = this.participants.filter(p => p.isActive).length;
  }
  return this.save();
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
