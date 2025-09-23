/**
 * Room Routes
 * 
 * RESTful API endpoints for room management
 * Handles room creation, retrieval, updates, and deletion
 * Includes proper validation and error handling
 */

const express = require('express');
const { query } = require('express-validator');
const Room = require('../models/Room');
const { handleValidationErrors, validateRoomCreation, validatePagination, validateRoomId } = require('../middleware/validation');
const { sendServerError, sendNotFoundError } = require('../utils/errorHandler');

const router = express.Router();

/**
 * GET /api/rooms
 * Get list of active rooms with pagination and filtering
 */
router.get('/', [
  ...validatePagination,
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  handleValidationErrors,
], async (req, res) => {
  try {
    console.log('📡 GET /api/rooms - Starting room fetch');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    const skip = (page - 1) * limit;

    console.log('📡 Query parameters:', { page, limit, search, skip });

    // Build query
    let query = { isActive: true };
    if (search) {
      query.$or = [
        { roomName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    console.log('📡 Database query:', query);

    // Get rooms with pagination using aggregation for better performance
    const rooms = await Room.aggregate([
      { $match: query },
      { 
        $project: {
          roomId: 1,
          roomName: 1,
          description: 1,
          currentParticipants: 1,
          maxParticipants: 1,
          createdAt: 1,
          lastActivity: 1,
          settings: 1
        }
      },
      { $sort: { lastActivity: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    console.log('📡 Found rooms:', rooms.length);

    // Get total count for pagination with proper error handling
    const totalRooms = await Room.countDocuments(query).catch(err => {
      console.error('❌ Error counting rooms:', err);
      return 0;
    });
    const totalPages = Math.ceil(totalRooms / limit);

    console.log('📡 Total rooms:', totalRooms);

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

    console.log('📡 Successfully sent room data');

  } catch (error) {
    console.error('❌ Error in GET /api/rooms:', error);
    sendServerError(res, 'Failed to fetch rooms', 'An error occurred while retrieving rooms');
  }
});

/**
 * GET /api/rooms/:roomId
 * Get specific room details by room ID
 */
router.get('/:roomId', [
  ...validateRoomId,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findRoomById(roomId);
    if (!room) {
      return sendNotFoundError(res, 'Room not found', 'The requested room does not exist or is inactive');
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
    sendServerError(res, 'Failed to fetch room', 'An error occurred while retrieving room details');
  }
});

/**
 * POST /api/rooms
 * Create a new room
 */
router.post('/', [
  ...validateRoomCreation,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomName, description, maxParticipants, settings } = req.body;
    console.log('🏠 Creating room with data:', { roomName, description, maxParticipants, settings });
    
    // Generate unique room ID using UUID
    const { v4: uuidv4 } = require('uuid');
    const roomId = uuidv4();
    console.log('🆔 Generated room ID:', roomId);
    
    // Create new room with proper validation and error handling
    const roomData = {
      roomId,
      roomName: roomName || `Room ${roomId.substring(0, 8)}`,
      description: description || '',
      maxParticipants: Math.min(Math.max(maxParticipants || 50, 2), 100), // Ensure valid range
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
    };

    console.log('💾 Creating room with data:', roomData);
    
    // Use findOneAndUpdate with upsert to prevent duplicate room creation
    const room = await Room.findOneAndUpdate(
      { roomId: roomId },
      roomData,
      { 
        upsert: true, 
        new: true, 
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );
    
    console.log('✅ Room saved successfully:', { 
      roomId: room.roomId, 
      roomName: room.roomName, 
      participantsCount: room.participants.length,
      currentParticipants: room.currentParticipants, 
      maxParticipants: room.maxParticipants,
      isActive: room.isActive
    });
    
    // Verify the room can be found immediately after creation
    try {
      const verifyRoom = await Room.findRoomById(room.roomId);
      if (verifyRoom) {
        console.log('✅ Room verification successful - room can be found immediately');
      } else {
        console.log('⚠️ Room verification failed - room not found immediately after creation');
      }
    } catch (verifyError) {
      console.error('❌ Room verification error:', verifyError);
    }

    const responseData = {
      roomId: room.roomId,
      roomName: room.roomName,
      description: room.description,
      maxParticipants: room.maxParticipants,
      currentParticipants: room.currentParticipants,
      settings: room.settings,
      createdAt: room.createdAt,
    };
    
    console.log('📤 Sending room creation response:', responseData);
    res.status(201).json(responseData);

  } catch (error) {
    console.error('❌ Error creating room:', error);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid room data provided',
        details: Object.values(error.errors).map(e => e.message),
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        error: 'Duplicate Room ID',
        message: 'A room with this ID already exists',
      });
    }
    
    sendServerError(res, 'Failed to create room', 'An error occurred while creating the room');
  }
});

/**
 * PUT /api/rooms/:roomId
 * Update room settings (only by room creator or admin)
 */
router.put('/:roomId', [
  ...validateRoomId,
  ...validateRoomCreation,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomId } = req.params;
    const { roomName, description, maxParticipants, settings } = req.body;
    
    const room = await Room.findRoomById(roomId);
    if (!room) {
      return sendNotFoundError(res, 'Room not found', 'The requested room does not exist or is inactive');
    }

    // Update room fields with validation and atomic operations
    const updateData = {};
    
    if (roomName !== undefined && roomName.trim().length > 0) {
      updateData.roomName = roomName.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description.trim();
    }
    
    if (maxParticipants !== undefined) {
      // Ensure maxParticipants is within valid range
      const validMaxParticipants = Math.min(Math.max(maxParticipants, 2), 100);
      updateData.maxParticipants = validMaxParticipants;
    }
    
    if (settings !== undefined) {
      updateData.settings = { ...room.settings, ...settings };
    }

    // Use atomic update to prevent race conditions
    const updatedRoom = await Room.findByIdAndUpdate(
      room._id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedRoom) {
      return sendNotFoundError(res, 'Room not found', 'The room could not be updated');
    }

    res.json({
      roomId: updatedRoom.roomId,
      roomName: updatedRoom.roomName,
      description: updatedRoom.description,
      maxParticipants: updatedRoom.maxParticipants,
      settings: updatedRoom.settings,
      updatedAt: updatedRoom.updatedAt,
    });

  } catch (error) {
    sendServerError(res, 'Failed to update room', 'An error occurred while updating the room');
  }
});

/**
 * DELETE /api/rooms/:roomId
 * Deactivate a room (soft delete)
 */
router.delete('/:roomId', [
  ...validateRoomId,
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
    sendServerError(res, 'Failed to deactivate room', 'An error occurred while deactivating the room');
  }
});

/**
 * GET /api/rooms/:roomId/participants
 * Get list of active participants in a room
 */
router.get('/:roomId/participants', [
  ...validateRoomId,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findRoomById(roomId);
    if (!room) {
      return sendNotFoundError(res, 'Room not found', 'The requested room does not exist or is inactive');
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
    sendServerError(res, 'Failed to fetch participants', 'An error occurred while retrieving room participants');
  }
});

/**
 * GET /api/rooms/:roomId/chat
 * Get chat history for a room
 */
router.get('/:roomId/chat', [
  ...validateRoomId,
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const room = await Room.findRoomById(roomId);
    if (!room) {
      return sendNotFoundError(res, 'Room not found', 'The requested room does not exist or is inactive');
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
    sendServerError(res, 'Failed to fetch chat history', 'An error occurred while retrieving chat messages');
  }
});

module.exports = router;
