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
const mongoose = require('mongoose');

/**
 * Socket event handler for Live Room collaboration
 * @param {Object} io - Socket.io server instance
 */
const socketHandler = (io) => {
  // Store active socket connections for room management
  const activeConnections = new Map();
  
  // Store pending join operations to prevent duplicate joins
  const pendingJoins = new Map();
  
  // Connection state tracking to prevent race conditions
  const connectionStates = new Map();
  
  // Room locks to prevent concurrent modifications
  const roomLocks = new Map();
  
  // Helper function to acquire room lock
  const acquireRoomLock = async (roomId, timeout = 5000) => {
    const lockKey = `room_${roomId}`;
    const startTime = Date.now();
    
    while (roomLocks.has(lockKey)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Room lock timeout for ${roomId}`);
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    roomLocks.set(lockKey, { timestamp: Date.now(), socketId: 'system' });
    return lockKey;
  };
  
  // Helper function to release room lock
  const releaseRoomLock = (lockKey) => {
    roomLocks.delete(lockKey);
  };
  
  // Cleanup function for stale locks and connections
  const cleanupStaleConnections = () => {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute
    
    // Clean up stale room locks
    for (const [lockKey, lockData] of roomLocks.entries()) {
      if (now - lockData.timestamp > staleThreshold) {
        console.log(`🧹 Cleaning up stale room lock: ${lockKey}`);
        roomLocks.delete(lockKey);
      }
    }
    
    // Clean up stale pending joins
    for (const [joinKey, timestamp] of pendingJoins.entries()) {
      if (now - timestamp > staleThreshold) {
        console.log(`🧹 Cleaning up stale pending join: ${joinKey}`);
        pendingJoins.delete(joinKey);
      }
    }
    
    // Clean up stale connection states
    for (const [socketId, state] of connectionStates.entries()) {
      if (now - state.timestamp > staleThreshold) {
        console.log(`🧹 Cleaning up stale connection state: ${socketId}`);
        connectionStates.delete(socketId);
      }
    }
  };
  
  // Run cleanup every 30 seconds
  setInterval(cleanupStaleConnections, 30000);

  // Helper function to check database connection health
  const isDatabaseConnected = () => {
    return mongoose.connection.readyState === 1;
  };

  // Helper function to retry database operations
  const retryDatabaseOperation = async (operation, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (!isDatabaseConnected()) {
          throw new Error('Database not connected');
        }
        return await operation();
      } catch (error) {
        console.error(`❌ Database operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
        if (i === maxRetries - 1) {
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  // Helper function to force cleanup stuck joins
  const forceCleanupStuckJoins = () => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Clean up old pending joins
    for (const [key, timestamp] of pendingJoins.entries()) {
      if (timestamp < fiveMinutesAgo) {
        console.log(`🧹 Force cleaning up stuck join: ${key}`);
        pendingJoins.delete(key);
      }
    }
    
    // Clean up old connection states
    for (const [socketId, state] of connectionStates.entries()) {
      if (state.timestamp < fiveMinutesAgo) {
        console.log(`🧹 Force cleaning up stuck connection: ${socketId}`);
        connectionStates.delete(socketId);
      }
    }
  };
  
  // Room cleanup interval (runs every 5 minutes)
  const cleanupInterval = setInterval(async () => {
    try {
      // Clean up inactive rooms and users
      await Room.cleanupInactiveRooms();
      await User.cleanupInactiveUsers();
      
      // Clean up stale connection states (older than 1 hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      for (const [socketId, state] of connectionStates.entries()) {
        if (state.timestamp < oneHourAgo) {
          connectionStates.delete(socketId);
        }
      }
      
      // Clean up stale pending joins (older than 5 minutes)
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      for (const [key, timestamp] of pendingJoins.entries()) {
        if (timestamp < fiveMinutesAgo) {
          pendingJoins.delete(key);
        }
      }
      
      // Force cleanup of stuck joins
      forceCleanupStuckJoins();
      
      console.log('🧹 Cleaned up inactive rooms, users, and stale connections');
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
      let roomLockKey = null;
      let joinTimeout = null;
      let joinKey = null;
      
      try {
        // Check database connection first
        if (!isDatabaseConnected()) {
          socket.emit('error', { 
            message: 'Database connection lost. Please try again in a moment.',
            code: 'DB_DISCONNECTED' 
          });
          return;
        }

        const { roomId, username, preferences = {} } = data;
        
        // Generate consistent userId based on username for this session
        // This ensures the same user gets the same ID across reconnections
        const userId = `user_${username.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${socket.id}`;
        
        // Validate input data early
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
        
        // Enhanced duplicate join prevention with atomic check-and-set
        joinKey = `${socket.id}-${roomId}`;
        const connectionState = connectionStates.get(socket.id);
        
        // Check if this socket is already in this room
        const currentConnection = connectionStates.get(socket.id);
        if (currentConnection && currentConnection.roomId === roomId && currentConnection.joined) {
          console.log(`⏳ Socket ${socket.id} already in room ${roomId}, skipping duplicate join`);
          socket.emit('joinRoomResponse', { 
            success: true, 
            message: 'Already in room',
            roomId 
          });
          return;
        }
        
        // Check if user with same username is already in this room
        const existingConnection = Array.from(connectionStates.entries())
          .find(([id, state]) => id !== socket.id && state.username === username && state.roomId === roomId);
        
        if (existingConnection) {
          console.log(`⚠️ User ${username} already in room ${roomId}, disconnecting old session`);
          const [oldSocketId] = existingConnection;
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.emit('forceDisconnect', { 
              message: 'You joined from another device/session',
              reason: 'MULTIPLE_SESSIONS' 
            });
            oldSocket.disconnect();
          }
          connectionStates.delete(oldSocketId);
        }
        
        // Enhanced duplicate prevention with circuit breaker
        if (pendingJoins.has(joinKey)) {
          const joinTimestamp = pendingJoins.get(joinKey);
          if (Date.now() - joinTimestamp < 3000) { // Reduced timeout to 3 seconds
            console.log(`⏳ Socket ${socket.id} already joining room ${roomId}, skipping duplicate request`);
            socket.emit('joinRoomResponse', { 
              success: false, 
              message: 'Already joining room, please wait...',
              roomId 
            });
            return;
          } else {
            console.log(`🧹 Cleaning up stale join for socket ${socket.id}`);
            pendingJoins.delete(joinKey);
          }
        }
        
        // Circuit breaker: prevent too many attempts to the same room
        const roomAttempts = Array.from(pendingJoins.entries())
          .filter(([key, timestamp]) => key.includes(roomId) && Date.now() - timestamp < 10000)
          .length;
          
        if (roomAttempts > 5) {
          console.log(`🚫 Circuit breaker: Too many attempts to join room ${roomId} (${roomAttempts} attempts)`);
          socket.emit('error', { 
            message: 'Too many join attempts. Please wait before trying again.',
            code: 'TOO_MANY_ATTEMPTS' 
          });
          return;
        }
        
        if (connectionState && connectionState.joining && connectionState.roomId === roomId) {
          console.log(`⏳ Socket ${socket.id} already joining room ${roomId}, skipping duplicate request`);
          socket.emit('joinRoomResponse', { 
            success: false, 
            message: 'Already joining room, please wait...',
            roomId 
          });
          return;
        }
        
        // Atomic set of join state
        pendingJoins.set(joinKey, Date.now());
        connectionStates.set(socket.id, { 
          joining: true, 
          roomId, 
          userId,
          username,
          timestamp: Date.now() 
        });
        
        // Additional check: prevent user from joining multiple rooms simultaneously
        const existingConnections = Array.from(connectionStates.entries())
          .filter(([id, state]) => id !== socket.id && state.userId === userId);
        
        if (existingConnections.length > 0) {
          console.log(`⚠️ User ${userId} already connected, cleaning up old connections`);
          existingConnections.forEach(([oldSocketId]) => {
            const oldSocket = io.sockets.sockets.get(oldSocketId);
            if (oldSocket) {
              oldSocket.emit('forceDisconnect', { 
                message: 'You joined from another device/session',
                reason: 'MULTIPLE_SESSIONS' 
              });
              oldSocket.disconnect();
            }
            connectionStates.delete(oldSocketId);
          });
        }
        
        // Acquire room lock to prevent concurrent modifications
        try {
          roomLockKey = await acquireRoomLock(roomId);
        } catch (lockError) {
          console.error(`❌ Failed to acquire room lock for ${roomId}:`, lockError.message);
          socket.emit('error', { 
            message: 'Room is busy. Please try again in a moment.',
            code: 'ROOM_BUSY' 
          });
          return;
        }
        
        // Set a timeout to prevent stuck joins (15 seconds)
        joinTimeout = setTimeout(() => {
          console.log(`⏰ Join timeout for socket ${socket.id} in room ${roomId}, cleaning up`);
          if (joinKey) pendingJoins.delete(joinKey);
          connectionStates.delete(socket.id);
          if (roomLockKey) releaseRoomLock(roomLockKey);
          socket.emit('error', { 
            message: 'Join operation timed out. Please try again.',
            code: 'JOIN_TIMEOUT' 
          });
        }, 15000);

        // Find existing room
        let room;
        try {
          console.log(`🔍 Looking for room ${roomId} in database...`);
          room = await retryDatabaseOperation(async () => {
            const foundRoom = await Room.findRoomById(roomId);
            if (!foundRoom) {
              console.log(`❌ Room ${roomId} not found in database`);
              // Let's also check if the room exists but is inactive
              const inactiveRoom = await Room.findOne({ roomId, isActive: false });
              if (inactiveRoom) {
                console.log(`⚠️ Room ${roomId} exists but is inactive`);
              }
              socket.emit('error', { 
                message: 'Room not found. Please check the room ID or create a new room.',
                code: 'ROOM_NOT_FOUND' 
              });
              return null;
            }
            console.log(`✅ Room ${roomId} found:`, { 
              roomName: foundRoom.roomName, 
              currentParticipants: foundRoom.currentParticipants, 
              maxParticipants: foundRoom.maxParticipants,
              isActive: foundRoom.isActive 
            });
            return foundRoom;
          });
        } catch (dbError) {
          console.error('❌ Database error finding room:', dbError);
          console.error('❌ Database connection state:', mongoose.connection.readyState);
          socket.emit('error', { 
            message: 'Database connection error. Please try again.',
            code: 'DB_CONNECTION_ERROR' 
          });
          return;
        }

        // Check if room was found
        if (!room) {
          console.log(`❌ Room ${roomId} not found, aborting join`);
          return;
        }

        // Aggressive room capacity check with forced cleanup
        console.log(`🔍 Room capacity check: ${room.currentParticipants}/${room.maxParticipants}`);
        
        // Force cleanup of inactive participants (more aggressive)
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        const activeParticipants = room.participants.filter(p => 
          p.isActive && p.lastActivity && p.lastActivity > thirtyMinutesAgo
        );
        
        // If room is at capacity, force cleanup and try again
        if (room.currentParticipants >= room.maxParticipants) {
          console.log(`🧹 Room at capacity, forcing cleanup...`);
          
          // Remove all inactive participants
          room.participants = activeParticipants;
          room.currentParticipants = activeParticipants.length;
          
          await room.save();
          console.log(`🧹 After cleanup: ${room.currentParticipants}/${room.maxParticipants} participants`);
          
          // If still at capacity after cleanup, reject
          if (room.currentParticipants >= room.maxParticipants) {
            console.log(`❌ Room ${roomId} still at maximum capacity after cleanup: ${room.currentParticipants}/${room.maxParticipants}`);
            clearTimeout(joinTimeout);
            if (joinKey) pendingJoins.delete(joinKey);
            connectionStates.delete(socket.id);
            if (roomLockKey) releaseRoomLock(roomLockKey);
            socket.emit('error', { 
              message: 'Room is at maximum capacity. Please try another room or wait for someone to leave.',
              code: 'ROOM_FULL' 
            });
            return;
          }
        }
        
        // Create or update user
        let user;
        try {
          user = await retryDatabaseOperation(async () => {
            const foundUser = await User.findBySessionId(socket.id);
            if (!foundUser) {
              const newUser = new User({
                userId,
                username,
                sessionId: socket.id,
                preferences,
              });
              await newUser.save();
              return newUser;
            } else {
              foundUser.username = username;
              foundUser.preferences = { ...foundUser.preferences, ...preferences };
              await foundUser.save();
              return foundUser;
            }
          });
        } catch (dbError) {
          console.error('❌ Database error creating/updating user:', dbError);
          socket.emit('error', { 
            message: 'Database connection error. Please try again.',
            code: 'DB_CONNECTION_ERROR' 
          });
          return;
        }

        // Add user to room participants (atomic operation)
        try {
          console.log(`👤 Adding participant to room ${roomId}:`, { userId, username, socketId: socket.id });
          await retryDatabaseOperation(async () => {
            await room.addParticipant({
              userId,
              username,
              socketId: socket.id,
              accessibility: preferences.accessibility || {},
              color: preferences.appearance?.cursorColor || '#3B82F6',
            });
          });
          console.log(`✅ Participant added successfully. Room now has ${room.currentParticipants} participants`);
        } catch (dbError) {
          console.error('❌ Database error adding participant:', dbError);
          clearTimeout(joinTimeout);
          if (joinKey) pendingJoins.delete(joinKey);
          connectionStates.delete(socket.id);
          if (roomLockKey) releaseRoomLock(roomLockKey);
          socket.emit('error', { 
            message: 'Database connection error. Please try again.',
            code: 'DB_CONNECTION_ERROR' 
          });
          return;
        }
        
        // Only join socket room after successful database operations
        socket.join(roomId);

        // Update connection info
        activeConnections.set(socket.id, {
          userId,
          roomId,
          username,
          connectedAt: new Date(),
        });

        // Join user to room
        try {
          await retryDatabaseOperation(async () => {
            await user.joinRoom(roomId);
          });
        } catch (dbError) {
          console.error('❌ Database error joining user to room:', dbError);
          socket.emit('error', { 
            message: 'Database connection error. Please try again.',
            code: 'DB_CONNECTION_ERROR' 
          });
          return;
        }

        // Send room data to the joining user
        socket.emit('roomJoined', {
          roomId,
          roomName: room.roomName,
          participants: room.participants.filter(p => p.isActive),
          codeContent: room.codeCollaboration?.content || '',
          codeLanguage: room.codeCollaboration?.language || 'javascript',
          notesContent: room.notesCollaboration?.content || '',
          canvasData: room.canvasDrawing?.drawingData || '',
          settings: room.settings,
        });

        // Enhanced metadata for Blind Mode
        const joinMetadata = {
          author: username,
          timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
          actionType: 'join',
          userId: userId,
        };

        // Broadcast user joined to other participants
        socket.to(roomId).emit('userJoined', {
          userId,
          username,
          accessibility: preferences.accessibility || {},
          color: preferences.appearance?.cursorColor || '#3B82F6',
          timestamp: new Date(),
          metadata: joinMetadata, // Include metadata for Blind Mode
        });

        // Send recent chat messages
        const recentMessages = room.chatMessages.slice(-20);
        socket.emit('chatHistory', recentMessages);

        console.log(`👤 ${username} joined room ${roomId}`);
        
        // Clean up pending join and connection state on success
        clearTimeout(joinTimeout);
        if (joinKey) pendingJoins.delete(joinKey);
        connectionStates.set(socket.id, { 
          joined: true, 
          roomId, 
          timestamp: Date.now() 
        });
        
        // Release room lock
        if (roomLockKey) releaseRoomLock(roomLockKey);

      } catch (error) {
        console.error('❌ Error joining room:', error);
        
        // Clean up pending join and connection state on error
        if (joinTimeout) clearTimeout(joinTimeout);
        if (joinKey) pendingJoins.delete(joinKey);
        connectionStates.delete(socket.id);
        if (roomLockKey) releaseRoomLock(roomLockKey);
        
        // Handle specific error types
        let errorMessage = 'Failed to join room';
        let errorCode = 'JOIN_ERROR';
        
        if (error.message.includes('Room not found')) {
          errorMessage = 'Room not found. Please check the room ID.';
          errorCode = 'ROOM_NOT_FOUND';
        } else if (error.message.includes('Database')) {
          errorMessage = 'Database connection error. Please try again.';
          errorCode = 'DB_CONNECTION_ERROR';
        } else if (error.message.includes('capacity')) {
          errorMessage = 'Room is at maximum capacity.';
          errorCode = 'ROOM_FULL';
        }
        
        socket.emit('error', { 
          message: errorMessage,
          code: errorCode 
        });
      }
    });

    /**
     * Handle code changes in collaborative editor
     * Broadcasts changes to other participants in the room
     * Enhanced with metadata for Blind Mode support
     */
    socket.on('code-change', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { content, language, cursorPosition, actionType = 'edit', linesChanged = 0, file = 'main' } = data;
        
        // Update room's code content
        const room = await Room.findRoomById(connection.roomId);
        if (room) {
          await room.updateCodeContent({
            content,
            language,
            userId: connection.userId,
            username: connection.username,
          });

          // Enhanced metadata for Blind Mode
          const metadata = {
            author: connection.username,
            timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
            actionType: actionType, // insert, delete, edit, format, etc.
            linesChanged: linesChanged,
            file: file,
            userId: connection.userId,
          };

          // Broadcast to other participants in the room
          socket.to(connection.roomId).emit('code-changed', {
            content,
            language,
            userId: connection.userId,
            username: connection.username,
            cursorPosition,
            timestamp: new Date(),
            metadata, // Include metadata for Blind Mode
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
     * Enhanced with metadata for Blind Mode support
     */
    socket.on('note-change', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { content, actionType = 'edit', wordsChanged = 0 } = data;
        
        // Update room's notes content
        const room = await Room.findRoomById(connection.roomId);
        if (room) {
          await room.updateNotesContent({
            content,
            userId: connection.userId,
            username: connection.username,
          });

          // Enhanced metadata for Blind Mode
          const metadata = {
            author: connection.username,
            timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
            actionType: actionType, // insert, delete, edit, format, etc.
            wordsChanged: wordsChanged,
            userId: connection.userId,
          };

          // Broadcast to other participants in the room
          socket.to(connection.roomId).emit('note-changed', {
            content,
            userId: connection.userId,
            username: connection.username,
            timestamp: new Date(),
            metadata, // Include metadata for Blind Mode
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
     * Enhanced with metadata for Blind Mode support
     */
    socket.on('draw-event', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { drawingData, action, actionType = 'draw', shapeType = 'unknown' } = data;
        
        // Update room's canvas drawing
        const room = await Room.findRoomById(connection.roomId);
        if (room) {
          await room.updateCanvasDrawing({
            drawingData,
            userId: connection.userId,
            username: connection.username,
          });

          // Enhanced metadata for Blind Mode
          const metadata = {
            author: connection.username,
            timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
            actionType: actionType, // draw, erase, clear, move, resize, etc.
            shapeType: shapeType, // line, circle, rectangle, text, etc.
            userId: connection.userId,
          };

          // Broadcast to other participants in the room
          socket.to(connection.roomId).emit('drawing-updated', {
            drawingData,
            action,
            userId: connection.userId,
            username: connection.username,
            timestamp: new Date(),
            metadata, // Include metadata for Blind Mode
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
     * Enhanced with metadata for Blind Mode support
     */
    socket.on('chat-message', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          socket.emit('error', { message: 'Not in a room', code: 'NOT_IN_ROOM' });
          return;
        }

        const { message, messageType = 'text', actionType = 'send' } = data;
        
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

          // Enhanced metadata for Blind Mode
          const metadata = {
            author: connection.username,
            timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
            actionType: actionType, // send, edit, delete, react, etc.
            messageLength: message.trim().length,
            userId: connection.userId,
          };

          // Broadcast to all participants in the room (including sender)
          io.to(connection.roomId).emit('chat-message', {
            ...messageData,
            timestamp: new Date(),
            id: uuidv4(),
            metadata, // Include metadata for Blind Mode
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
     * Enhanced with metadata for Blind Mode support
     */
    socket.on('presence-update', async (data) => {
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          return; // Silently ignore if not in a room
        }

        const { cursorPosition, isActive = true, actionType = 'move' } = data;
        
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

          // Enhanced metadata for Blind Mode
          const metadata = {
            author: connection.username,
            timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
            actionType: actionType, // move, join, leave, focus, blur, etc.
            userId: connection.userId,
          };

          // Broadcast to other participants in the room
          socket.to(connection.roomId).emit('presence-updated', {
            userId: connection.userId,
            username: connection.username,
            cursorPosition,
            isActive,
            timestamp: new Date(),
            metadata, // Include metadata for Blind Mode
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
      let roomLockKey = null;
      
      try {
        const connection = activeConnections.get(socket.id);
        if (!connection || !connection.roomId) {
          return;
        }

        const { userId, username, roomId } = connection;

        // Acquire room lock to prevent concurrent modifications
        try {
          roomLockKey = await acquireRoomLock(roomId);
        } catch (lockError) {
          console.error(`❌ Failed to acquire room lock for ${roomId}:`, lockError.message);
          // Continue without lock for leave operations
        }

        // Remove user from room participants
        const room = await Room.findRoomById(roomId);
        if (room) {
          await room.removeParticipant(userId);
          
          // Enhanced metadata for Blind Mode
          const leaveMetadata = {
            author: username,
            timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
            actionType: 'leave',
            userId: userId,
          };

          // Broadcast user left to other participants
          socket.to(roomId).emit('userLeft', {
            userId,
            username,
            timestamp: new Date(),
            metadata: leaveMetadata, // Include metadata for Blind Mode
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
      } finally {
        // Always release room lock
        if (roomLockKey) releaseRoomLock(roomLockKey);
      }
    });

    /**
     * Handle socket disconnection
     * Clean up user data and notify other participants
     */
    socket.on('disconnect', async () => {
      let roomLockKey = null;
      
      try {
        // Clean up any pending joins for this socket
        for (const [key, value] of pendingJoins.entries()) {
          if (key.startsWith(`${socket.id}-`)) {
            pendingJoins.delete(key);
          }
        }
        
        // Clean up connection state
        connectionStates.delete(socket.id);
        
        const connection = activeConnections.get(socket.id);
        if (connection && connection.roomId) {
          const { userId, username, roomId } = connection;

          // Acquire room lock for disconnect operations
          try {
            roomLockKey = await acquireRoomLock(roomId);
          } catch (lockError) {
            console.error(`❌ Failed to acquire room lock for disconnect ${roomId}:`, lockError.message);
            // Continue without lock for disconnect operations
          }

          // Remove user from room participants with error handling
          try {
            const room = await Room.findRoomById(roomId);
            if (room) {
              await room.removeParticipant(userId);
              
              // Enhanced metadata for Blind Mode
              const disconnectMetadata = {
                author: username,
                timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
                actionType: 'disconnect',
                userId: userId,
              };

              // Broadcast user disconnected to other participants
              socket.to(roomId).emit('userDisconnected', {
                userId,
                username,
                timestamp: new Date(),
                metadata: disconnectMetadata, // Include metadata for Blind Mode
              });
            }
          } catch (roomError) {
            console.error('❌ Error removing participant from room:', roomError);
          }

          // Update user's current room with error handling
          try {
            const user = await User.findByUserId(userId);
            if (user) {
              await user.leaveRoom();
            }
          } catch (userError) {
            console.error('❌ Error updating user room status:', userError);
          }

          console.log(`🔌 ${username || 'User'} disconnected from room ${roomId}`);
        }

        // Remove connection from active connections
        activeConnections.delete(socket.id);

      } catch (error) {
        console.error('❌ Error handling disconnect:', error);
      } finally {
        // Always release room lock
        if (roomLockKey) releaseRoomLock(roomLockKey);
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
