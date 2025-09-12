/**
 * Socket Handler
 * 
 * Manages all Socket.io events for real-time collaboration in Live Room
 * Handles: joinRoom, code-change, note-change, draw-event, chat-message, presence-update
 * Includes comprehensive error handling and accessibility features
 */

const Room = require('../models/Room');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

/**
 * Socket event handler for Live Room collaboration
 * @param {Object} io - Socket.io server instance
 */
const socketHandler = (io) => {
  // Store active socket connections for room management
  const activeConnections = new Map();
  
  // Room cleanup interval (runs every 5 minutes)
  const cleanupInterval = setInterval(async () => {
    try {
      await Room.cleanupInactiveRooms();
      await User.cleanupInactiveUsers();
      console.log('🧹 Cleaned up inactive rooms and users');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }, parseInt(process.env.ROOM_CLEANUP_INTERVAL) || 300000);

  io.on('connection', async (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);
    
    // Store connection info
    activeConnections.set(socket.id, {
      userId: null,
      roomId: null,
      username: null,
      connectedAt: new Date(),
    });

    /**
     * Handle user joining a room
     * Creates or finds room, adds user to participants, broadcasts presence
     */
    socket.on('joinRoom', async (data) => {
      try {
        const { roomId, username, preferences = {} } = data;
        
        // Validate input data
        if (!roomId || !username) {
          socket.emit('error', { 
            message: 'Room ID and username are required',
            code: 'INVALID_DATA' 
          });
          return;
        }

        // Validate username format
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(username) || username.length > 50) {
          socket.emit('error', { 
            message: 'Invalid username format',
            code: 'INVALID_USERNAME' 
          });
          return;
        }

        // Create or find room
        let room = await Room.findRoomById(roomId);
        if (!room) {
          // Create new room
          room = new Room({
            roomId,
            roomName: `Room ${roomId}`,
            createdBy: {
              userId: socket.id, // Using socket.id as temporary userId
              username,
            },
          });
          await room.save();
          console.log(`🏠 Created new room: ${roomId}`);
        }

        // Check room capacity
        if (room.currentParticipants >= room.maxParticipants) {
          socket.emit('error', { 
            message: 'Room is at maximum capacity',
            code: 'ROOM_FULL' 
          });
          return;
        }

        // Generate unique userId for this session
        const userId = uuidv4();
        
        // Create or update user
        let user = await User.findBySessionId(socket.id);
        if (!user) {
          user = new User({
            userId,
            username,
            sessionId: socket.id,
            preferences,
          });
        } else {
          user.username = username;
          user.preferences = { ...user.preferences, ...preferences };
        }
        await user.save();

        // Join socket room
        socket.join(roomId);
        
        // Add user to room participants
        await room.addParticipant({
          userId,
          username,
          socketId: socket.id,
          accessibility: preferences.accessibility || {},
          color: preferences.appearance?.cursorColor || '#3B82F6',
        });

        // Update connection info
        activeConnections.set(socket.id, {
          userId,
          roomId,
          username,
          connectedAt: new Date(),
        });

        // Join user to room
        await user.joinRoom(roomId);

        // Send room data to the joining user
        socket.emit('roomJoined', {
          roomId,
          roomName: room.roomName,
          participants: room.participants.filter(p => p.isActive),
          codeContent: room.codeCollaboration.content,
          codeLanguage: room.codeCollaboration.language,
          notesContent: room.notesCollaboration.content,
          canvasData: room.canvasDrawing.drawingData,
          settings: room.settings,
        });

        // Broadcast user joined to other participants
        socket.to(roomId).emit('userJoined', {
          userId,
          username,
          accessibility: preferences.accessibility || {},
          color: preferences.appearance?.cursorColor || '#3B82F6',
          timestamp: new Date(),
        });

        // Send recent chat messages
        const recentMessages = room.chatMessages.slice(-20);
        socket.emit('chatHistory', recentMessages);

        console.log(`👤 ${username} joined room ${roomId}`);

      } catch (error) {
        console.error('❌ Error joining room:', error);
        socket.emit('error', { 
          message: 'Failed to join room',
          code: 'JOIN_ERROR' 
        });
      }
    });

    /**
     * Handle code changes in collaborative editor
     * Broadcasts changes to other participants in the room
     */
    socket.on('code-change', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { content, language, cursorPosition } = data;
        
        // Update room's code content
        const room = await Room.findRoomById(connection.roomId);
        if (room) {
          await room.updateCodeContent({
            content,
            language,
            userId: connection.userId,
            username: connection.username,
          });

          // Broadcast to other participants in the room
          socket.to(connection.roomId).emit('code-changed', {
            content,
            language,
            userId: connection.userId,
            username: connection.username,
            cursorPosition,
            timestamp: new Date(),
          });
        }

      } catch (error) {
        console.error('❌ Error handling code change:', error);
        socket.emit('error', { message: 'Failed to update code', code: 'CODE_UPDATE_ERROR' });
      }
    });

    /**
     * Handle notes changes in collaborative notes editor
     * Broadcasts changes to other participants in the room
     */
    socket.on('note-change', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { content } = data;
        
        // Update room's notes content
        const room = await Room.findRoomById(connection.roomId);
        if (room) {
          await room.updateNotesContent({
            content,
            userId: connection.userId,
            username: connection.username,
          });

          // Broadcast to other participants in the room
          socket.to(connection.roomId).emit('note-changed', {
            content,
            userId: connection.userId,
            username: connection.username,
            timestamp: new Date(),
          });
        }

      } catch (error) {
        console.error('❌ Error handling note change:', error);
        socket.emit('error', { message: 'Failed to update notes', code: 'NOTE_UPDATE_ERROR' });
      }
    });

    /**
     * Handle canvas drawing events
     * Broadcasts drawing data to other participants in the room
     */
    socket.on('draw-event', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { drawingData, action } = data;
        
        // Update room's canvas drawing
        const room = await Room.findRoomById(connection.roomId);
        if (room) {
          await room.updateCanvasDrawing({
            drawingData,
            userId: connection.userId,
            username: connection.username,
          });

          // Broadcast to other participants in the room
          socket.to(connection.roomId).emit('drawing-updated', {
            drawingData,
            action,
            userId: connection.userId,
            username: connection.username,
            timestamp: new Date(),
          });
        }

      } catch (error) {
        console.error('❌ Error handling draw event:', error);
        socket.emit('error', { message: 'Failed to update drawing', code: 'DRAW_UPDATE_ERROR' });
      }
    });

    /**
     * Handle chat messages
     * Stores message in database and broadcasts to room participants
     */
    socket.on('chat-message', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { message, messageType = 'text' } = data;
        
        if (!message || message.trim().length === 0) {
          socket.emit('error', { message: 'Message cannot be empty', code: 'EMPTY_MESSAGE' });
          return;
        }

        if (message.length > 1000) {
          socket.emit('error', { message: 'Message too long', code: 'MESSAGE_TOO_LONG' });
          return;
        }

        // Update room's chat messages
        const room = await Room.findRoomById(connection.roomId);
        if (room) {
          const messageData = {
            userId: connection.userId,
            username: connection.username,
            message: message.trim(),
            messageType,
          };

          await room.addChatMessage(messageData);

          // Update user's message count
          const user = await User.findByUserId(connection.userId);
          if (user) {
            await user.incrementMessageCount();
          }

          // Broadcast to all participants in the room (including sender)
          io.to(connection.roomId).emit('chat-message', {
            ...messageData,
            timestamp: new Date(),
            id: uuidv4(),
          });
        }

      } catch (error) {
        console.error('❌ Error handling chat message:', error);
        socket.emit('error', { message: 'Failed to send message', code: 'CHAT_ERROR' });
      }
    });

    /**
     * Handle presence updates (cursor position, activity status)
     * Broadcasts presence data to other participants
     */
    socket.on('presence-update', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          return; // Silently ignore if not in a room
        }

        const { cursorPosition, isActive = true } = data;
        
        // Update room participant data
        const room = await Room.findRoomById(connection.roomId);
        if (room) {
          const participant = room.participants.find(p => p.userId === connection.userId);
          if (participant) {
            participant.cursorPosition = cursorPosition || participant.cursorPosition;
            participant.isActive = isActive;
            participant.lastActivity = new Date();
            await room.save();
          }

          // Broadcast to other participants in the room
          socket.to(connection.roomId).emit('presence-updated', {
            userId: connection.userId,
            username: connection.username,
            cursorPosition,
            isActive,
            timestamp: new Date(),
          });
        }

      } catch (error) {
        console.error('❌ Error handling presence update:', error);
      }
    });

    /**
     * Handle user leaving the room
     * Removes user from participants and broadcasts leave event
     */
    socket.on('leaveRoom', async () => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          return;
        }

        const { userId, username, roomId } = connection;

        // Remove user from room participants
        const room = await Room.findRoomById(roomId);
        if (room) {
          await room.removeParticipant(userId);
          
          // Broadcast user left to other participants
          socket.to(roomId).emit('userLeft', {
            userId,
            username,
            timestamp: new Date(),
          });
        }

        // Update user's current room
        const user = await User.findByUserId(userId);
        if (user) {
          await user.leaveRoom();
        }

        // Leave socket room
        socket.leave(roomId);
        
        // Update connection info
        activeConnections.set(socket.id, {
          userId: null,
          roomId: null,
          username: null,
          connectedAt: new Date(),
        });

        console.log(`👋 ${username} left room ${roomId}`);

      } catch (error) {
        console.error('❌ Error leaving room:', error);
      }
    });

    /**
     * Handle socket disconnection
     * Clean up user data and notify other participants
     */
    socket.on('disconnect', async () => {
      try {
        const connection = activeConnections.get(socket.id);
        if (connection && connection.roomId) {
          const { userId, username, roomId } = connection;

          // Remove user from room participants
          const room = await Room.findRoomById(roomId);
          if (room) {
            await room.removeParticipant(userId);
            
            // Broadcast user disconnected to other participants
            socket.to(roomId).emit('userDisconnected', {
              userId,
              username,
              timestamp: new Date(),
            });
          }

          // Update user's current room
          const user = await User.findByUserId(userId);
          if (user) {
            await user.leaveRoom();
          }

          console.log(`🔌 ${username || 'User'} disconnected from room ${roomId}`);
        }

        // Remove connection from active connections
        activeConnections.delete(socket.id);

      } catch (error) {
        console.error('❌ Error handling disconnect:', error);
      }
    });

    /**
     * Handle error events from client
     * Log errors for debugging purposes
     */
    socket.on('client-error', (error) => {
      console.error('❌ Client error:', error);
    });

    /**
     * Handle ping/pong for connection health monitoring
     */
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date() });
    });
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    clearInterval(cleanupInterval);
  });

  process.on('SIGINT', () => {
    clearInterval(cleanupInterval);
  });
};

module.exports = socketHandler;
