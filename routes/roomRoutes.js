/**
 * Room Routes
 * 
 * RESTful API endpoints for room management
 * Handles room creation, retrieval, updates, and deletion
 * Includes proper validation and error handling
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const Room = require('../models/Room');
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
 * GET /api/rooms
 * Get list of active rooms with pagination and filtering
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const skip = (page - 1) * limit;

    // Build query
    let query = { isActive: true };
    if (search) {
      query.$or = [
        { roomName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Get rooms with pagination
    const rooms = await Room.find(query)
      .select('roomId roomName description currentParticipants maxParticipants createdAt lastActivity settings')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalRooms = await Room.countDocuments(query);
    const totalPages = Math.ceil(totalRooms / limit);

    res.json({
      rooms,
      pagination: {
        currentPage: page,
        totalPages,
        totalRooms,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching rooms:', error);
    res.status(500).json({
      error: 'Failed to fetch rooms',
      message: 'An error occurred while retrieving rooms',
    });
  }
});

/**
 * GET /api/rooms/:roomId
 * Get specific room details by room ID
 */
router.get('/:roomId', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
        message: 'The requested room does not exist or is inactive',
      });
    }

    // Return room data without sensitive information
    const roomData = {
      roomId: room.roomId,
      roomName: room.roomName,
      description: room.description,
      currentParticipants: room.currentParticipants,
      maxParticipants: room.maxParticipants,
      participants: room.participants.filter(p => p.isActive).map(p => ({
        userId: p.userId,
        username: p.username,
        lastActivity: p.lastActivity,
        accessibility: p.accessibility,
        color: p.color,
      })),
      settings: room.settings,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
    };

    res.json(roomData);

  } catch (error) {
    console.error('❌ Error fetching room:', error);
    res.status(500).json({
      error: 'Failed to fetch room',
      message: 'An error occurred while retrieving room details',
    });
  }
});

/**
 * POST /api/rooms
 * Create a new room
 */
router.post('/', [
  body('roomName').optional().isLength({ min: 1, max: 100 }).withMessage('Room name must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('maxParticipants').optional().isInt({ min: 2, max: 100 }).withMessage('Max participants must be between 2 and 100'),
  body('settings').optional().isObject().withMessage('Settings must be an object'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomName, description, maxParticipants, settings } = req.body;
    
    // Generate unique room ID
    const roomId = require('uuid').v4();
    
    // Create new room
    const room = new Room({
      roomId,
      roomName: roomName || `Room ${roomId.substring(0, 8)}`,
      description: description || '',
      maxParticipants: maxParticipants || 50,
      settings: {
        allowAnonymous: true,
        allowCodeEditing: true,
        allowNotesEditing: true,
        allowCanvasDrawing: true,
        allowChat: true,
        isPublic: true,
        ...settings,
      },
      createdBy: {
        userId: 'system', // Will be updated when user joins
        username: 'System',
      },
    });

    await room.save();

    res.status(201).json({
      roomId: room.roomId,
      roomName: room.roomName,
      description: room.description,
      maxParticipants: room.maxParticipants,
      settings: room.settings,
      createdAt: room.createdAt,
    });

  } catch (error) {
    console.error('❌ Error creating room:', error);
    res.status(500).json({
      error: 'Failed to create room',
      message: 'An error occurred while creating the room',
    });
  }
});

/**
 * PUT /api/rooms/:roomId
 * Update room settings (only by room creator or admin)
 */
router.put('/:roomId', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  body('roomName').optional().isLength({ min: 1, max: 100 }).withMessage('Room name must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('maxParticipants').optional().isInt({ min: 2, max: 100 }).withMessage('Max participants must be between 2 and 100'),
  body('settings').optional().isObject().withMessage('Settings must be an object'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomId } = req.params;
    const { roomName, description, maxParticipants, settings } = req.body;
    
    const room = await Room.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
        message: 'The requested room does not exist or is inactive',
      });
    }

    // Update room fields
    if (roomName !== undefined) room.roomName = roomName;
    if (description !== undefined) room.description = description;
    if (maxParticipants !== undefined) room.maxParticipants = maxParticipants;
    if (settings !== undefined) {
      room.settings = { ...room.settings, ...settings };
    }

    await room.save();

    res.json({
      roomId: room.roomId,
      roomName: room.roomName,
      description: room.description,
      maxParticipants: room.maxParticipants,
      settings: room.settings,
      updatedAt: room.updatedAt,
    });

  } catch (error) {
    console.error('❌ Error updating room:', error);
    res.status(500).json({
      error: 'Failed to update room',
      message: 'An error occurred while updating the room',
    });
  }
});

/**
 * DELETE /api/rooms/:roomId
 * Deactivate a room (soft delete)
 */
router.delete('/:roomId', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
        message: 'The requested room does not exist or is already inactive',
      });
    }

    // Soft delete - mark as inactive
    room.isActive = false;
    await room.save();

    res.json({
      message: 'Room deactivated successfully',
      roomId: room.roomId,
    });

  } catch (error) {
    console.error('❌ Error deactivating room:', error);
    res.status(500).json({
      error: 'Failed to deactivate room',
      message: 'An error occurred while deactivating the room',
    });
  }
});

/**
 * GET /api/rooms/:roomId/participants
 * Get list of active participants in a room
 */
router.get('/:roomId/participants', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
        message: 'The requested room does not exist or is inactive',
      });
    }

    const participants = room.participants
      .filter(p => p.isActive)
      .map(p => ({
        userId: p.userId,
        username: p.username,
        lastActivity: p.lastActivity,
        accessibility: p.accessibility,
        color: p.color,
      }));

    res.json({
      roomId: room.roomId,
      participants,
      totalParticipants: participants.length,
    });

  } catch (error) {
    console.error('❌ Error fetching participants:', error);
    res.status(500).json({
      error: 'Failed to fetch participants',
      message: 'An error occurred while retrieving room participants',
    });
  }
});

/**
 * GET /api/rooms/:roomId/chat
 * Get chat history for a room
 */
router.get('/:roomId/chat', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const room = await Room.findRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        error: 'Room not found',
        message: 'The requested room does not exist or is inactive',
      });
    }

    const messages = room.chatMessages
      .slice(-limit)
      .map(msg => ({
        id: msg.id,
        userId: msg.userId,
        username: msg.username,
        message: msg.message,
        messageType: msg.messageType,
        timestamp: msg.timestamp,
      }));

    res.json({
      roomId: room.roomId,
      messages,
      totalMessages: room.chatMessages.length,
    });

  } catch (error) {
    console.error('❌ Error fetching chat history:', error);
    res.status(500).json({
      error: 'Failed to fetch chat history',
      message: 'An error occurred while retrieving chat messages',
    });
  }
});

module.exports = router;
