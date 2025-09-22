/**
 * Room Service
 * 
 * Business logic layer for room operations
 * Handles complex business rules and data transformations
 */

const Room = require('../models/Room');
const User = require('../models/User');
const { NotFoundError, ConflictError, ValidationError, logger } = require('../utils/errorHandler');

class RoomService {
  /**
   * Get paginated list of active rooms
   */
  static async getRooms(options = {}) {
    const {
      page = 1,
      limit = 10,
      search = null,
      sortBy = 'lastActivity',
      sortOrder = 'desc'
    } = options;

    const skip = (page - 1) * limit;

    // Build query
    let query = { isActive: true };
    if (search) {
      query.$or = [
        { roomName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    try {
      const [rooms, totalRooms] = await Promise.all([
        Room.find(query)
          .select('roomId roomName description currentParticipants maxParticipants createdAt lastActivity settings')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Room.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalRooms / limit);

      return {
        rooms,
        pagination: {
          currentPage: page,
          totalPages,
          totalRooms,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        }
      };
    } catch (error) {
      logger.error('Error fetching rooms:', error);
      throw error;
    }
  }

  /**
   * Get room by ID with full details
   */
  static async getRoomById(roomId) {
    try {
      const room = await Room.findRoomById(roomId);
      if (!room) {
        throw new NotFoundError('Room');
      }

      // Transform room data for API response
      return this.transformRoomData(room);
    } catch (error) {
      logger.error('Error fetching room by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new room
   */
  static async createRoom(roomData, creatorInfo) {
    try {
      const {
        roomName,
        description,
        maxParticipants = 50,
        settings = {}
      } = roomData;

      // Validate room name uniqueness
      if (roomName) {
        const existingRoom = await Room.findOne({
          roomName,
          isActive: true
        });
        if (existingRoom) {
          throw new ConflictError('Room name already exists');
        }
      }

      // Generate unique room ID
      const roomId = require('uuid').v4();

      // Create room with default settings
      const room = new Room({
        roomId,
        roomName: roomName || `Room ${roomId.substring(0, 8)}`,
        description: description || '',
        maxParticipants: Math.min(Math.max(maxParticipants, 2), 100),
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
          userId: creatorInfo.userId || 'system',
          username: creatorInfo.username || 'System',
        },
      });

      await room.save();

      logger.info('Room created successfully', {
        roomId: room.roomId,
        roomName: room.roomName,
        createdBy: creatorInfo.username
      });

      return this.transformRoomData(room);
    } catch (error) {
      logger.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Update room settings
   */
  static async updateRoom(roomId, updateData, updaterInfo) {
    try {
      const room = await Room.findRoomById(roomId);
      if (!room) {
        throw new NotFoundError('Room');
      }

      // Check if user has permission to update (creator or admin)
      const canUpdate = room.createdBy.userId === updaterInfo.userId || 
                       updaterInfo.role === 'admin';
      
      if (!canUpdate) {
        throw new ValidationError('Insufficient permissions to update room');
      }

      // Update allowed fields
      const allowedUpdates = ['roomName', 'description', 'maxParticipants', 'settings'];
      const updates = {};

      for (const field of allowedUpdates) {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      }

      // Validate max participants
      if (updates.maxParticipants) {
        updates.maxParticipants = Math.min(Math.max(updates.maxParticipants, 2), 100);
        
        // Check if current participants exceed new limit
        if (room.currentParticipants > updates.maxParticipants) {
          throw new ValidationError('Cannot set max participants below current participant count');
        }
      }

      // Validate room name uniqueness if changing
      if (updates.roomName && updates.roomName !== room.roomName) {
        const existingRoom = await Room.findOne({
          roomName: updates.roomName,
          isActive: true,
          roomId: { $ne: roomId }
        });
        if (existingRoom) {
          throw new ConflictError('Room name already exists');
        }
      }

      // Apply updates
      Object.assign(room, updates);
      await room.save();

      logger.info('Room updated successfully', {
        roomId,
        updates: Object.keys(updates),
        updatedBy: updaterInfo.username
      });

      return this.transformRoomData(room);
    } catch (error) {
      logger.error('Error updating room:', error);
      throw error;
    }
  }

  /**
   * Deactivate a room (soft delete)
   */
  static async deactivateRoom(roomId, deactivatorInfo) {
    try {
      const room = await Room.findRoomById(roomId);
      if (!room) {
        throw new NotFoundError('Room');
      }

      // Check if user has permission to deactivate
      const canDeactivate = room.createdBy.userId === deactivatorInfo.userId || 
                           deactivatorInfo.role === 'admin';
      
      if (!canDeactivate) {
        throw new ValidationError('Insufficient permissions to deactivate room');
      }

      room.isActive = false;
      await room.save();

      logger.info('Room deactivated successfully', {
        roomId,
        deactivatedBy: deactivatorInfo.username
      });

      return { message: 'Room deactivated successfully', roomId };
    } catch (error) {
      logger.error('Error deactivating room:', error);
      throw error;
    }
  }

  /**
   * Get room participants
   */
  static async getRoomParticipants(roomId) {
    try {
      const room = await Room.findRoomById(roomId);
      if (!room) {
        throw new NotFoundError('Room');
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

      return {
        roomId: room.roomId,
        participants,
        totalParticipants: participants.length,
      };
    } catch (error) {
      logger.error('Error fetching room participants:', error);
      throw error;
    }
  }

  /**
   * Get room chat history
   */
  static async getRoomChatHistory(roomId, limit = 50) {
    try {
      const room = await Room.findRoomById(roomId);
      if (!room) {
        throw new NotFoundError('Room');
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

      return {
        roomId: room.roomId,
        messages,
        totalMessages: room.chatMessages.length,
      };
    } catch (error) {
      logger.error('Error fetching room chat history:', error);
      throw error;
    }
  }

  /**
   * Transform room data for API response
   */
  static transformRoomData(room) {
    return {
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
      createdBy: room.createdBy,
    };
  }

  /**
   * Clean up inactive rooms (called by scheduled job)
   */
  static async cleanupInactiveRooms() {
    try {
      const result = await Room.cleanupInactiveRooms();
      logger.info('Room cleanup completed', { 
        modifiedCount: result.modifiedCount 
      });
      return result;
    } catch (error) {
      logger.error('Error during room cleanup:', error);
      throw error;
    }
  }
}

module.exports = RoomService;
