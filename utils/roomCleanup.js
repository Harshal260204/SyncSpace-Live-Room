/**
 * Room Cleanup Utilities
 * 
 * Handles automatic cleanup of inactive rooms and users
 * Prevents database bloat and maintains optimal performance
 */

const Room = require('../models/Room');
const User = require('../models/User');

/**
 * Clean up inactive rooms and users
 * Runs periodically to maintain database performance
 */
const cleanupInactiveData = async () => {
  try {
    console.log('🧹 Starting cleanup of inactive data...');
    
    // Clean up inactive rooms (no activity for 30 minutes and no participants)
    const roomCutoffTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    const roomResult = await Room.updateMany(
      { 
        isActive: true, 
        lastActivity: { $lt: roomCutoffTime },
        currentParticipants: 0 
      },
      { isActive: false }
    );
    
    console.log(`🗑️ Deactivated ${roomResult.modifiedCount} inactive rooms`);

    // Clean up inactive users (no activity for 24 hours)
    const userCutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const userResult = await User.updateMany(
      { 
        isActive: true, 
        lastSeen: { $lt: userCutoffTime } 
      },
      { isActive: false }
    );
    
    console.log(`👤 Deactivated ${userResult.modifiedCount} inactive users`);

    // Clean up old chat messages (keep only last 100 per room)
    const rooms = await Room.find({ isActive: true });
    let totalMessagesRemoved = 0;
    
    for (const room of rooms) {
      if (room.chatMessages.length > 100) {
        const messagesToRemove = room.chatMessages.length - 100;
        room.chatMessages = room.chatMessages.slice(-100);
        await room.save();
        totalMessagesRemoved += messagesToRemove;
      }
    }
    
    console.log(`💬 Removed ${totalMessagesRemoved} old chat messages`);

    // Clean up old inactive rooms completely (older than 7 days)
    const oldRoomCutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const oldRoomResult = await Room.deleteMany({
      isActive: false,
      lastActivity: { $lt: oldRoomCutoffTime }
    });
    
    console.log(`🗑️ Permanently deleted ${oldRoomResult.deletedCount} old inactive rooms`);

    // Clean up old inactive users completely (older than 30 days)
    const oldUserCutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const oldUserResult = await User.deleteMany({
      isActive: false,
      lastSeen: { $lt: oldUserCutoffTime }
    });
    
    console.log(`👤 Permanently deleted ${oldUserResult.deletedCount} old inactive users`);

    console.log('✅ Cleanup completed successfully');
    
    return {
      roomsDeactivated: roomResult.modifiedCount,
      usersDeactivated: userResult.modifiedCount,
      messagesRemoved: totalMessagesRemoved,
      oldRoomsDeleted: oldRoomResult.deletedCount,
      oldUsersDeleted: oldUserResult.deletedCount,
    };

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

/**
 * Get cleanup statistics
 * Returns information about data that can be cleaned up
 */
const getCleanupStats = async () => {
  try {
    const roomCutoffTime = new Date(Date.now() - 30 * 60 * 1000);
    const userCutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldRoomCutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldUserCutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      inactiveRooms,
      inactiveUsers,
      oldInactiveRooms,
      oldInactiveUsers,
      totalRooms,
      totalUsers,
      totalMessages,
    ] = await Promise.all([
      Room.countDocuments({
        isActive: true,
        lastActivity: { $lt: roomCutoffTime },
        currentParticipants: 0
      }),
      User.countDocuments({
        isActive: true,
        lastSeen: { $lt: userCutoffTime }
      }),
      Room.countDocuments({
        isActive: false,
        lastActivity: { $lt: oldRoomCutoffTime }
      }),
      User.countDocuments({
        isActive: false,
        lastSeen: { $lt: oldUserCutoffTime }
      }),
      Room.countDocuments({}),
      User.countDocuments({}),
      Room.aggregate([
        { $match: { isActive: true } },
        { $project: { messageCount: { $size: '$chatMessages' } } },
        { $group: { _id: null, totalMessages: { $sum: '$messageCount' } } }
      ])
    ]);

    return {
      inactiveRooms,
      inactiveUsers,
      oldInactiveRooms,
      oldInactiveUsers,
      totalRooms,
      totalUsers,
      totalMessages: totalMessages[0]?.totalMessages || 0,
      lastChecked: new Date(),
    };

  } catch (error) {
    console.error('❌ Error getting cleanup stats:', error);
    throw error;
  }
};

/**
 * Force cleanup of a specific room
 * Useful for manual room management
 */
const forceCleanupRoom = async (roomId) => {
  try {
    const room = await Room.findRoomById(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    // Remove all participants
    room.participants = [];
    room.currentParticipants = 0;
    room.isActive = false;
    
    await room.save();
    
    console.log(`🗑️ Force cleaned room: ${roomId}`);
    return { success: true, roomId };

  } catch (error) {
    console.error('❌ Error force cleaning room:', error);
    throw error;
  }
};

/**
 * Force cleanup of a specific user
 * Useful for manual user management
 */
const forceCleanupUser = async (userId) => {
  try {
    const user = await User.findByUserId(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Deactivate user and remove from current room
    await user.deactivate();
    
    console.log(`👤 Force cleaned user: ${userId}`);
    return { success: true, userId };

  } catch (error) {
    console.error('❌ Error force cleaning user:', error);
    throw error;
  }
};

/**
 * Get database size information
 * Returns approximate database size and collection statistics
 */
const getDatabaseStats = async () => {
  try {
    const db = require('mongoose').connection.db;
    
    const [roomStats, userStats, dbStats] = await Promise.all([
      db.collection('rooms').stats(),
      db.collection('users').stats(),
      db.stats()
    ]);

    return {
      rooms: {
        count: roomStats.count,
        size: roomStats.size,
        avgObjSize: roomStats.avgObjSize,
      },
      users: {
        count: userStats.count,
        size: userStats.size,
        avgObjSize: userStats.avgObjSize,
      },
      database: {
        dataSize: dbStats.dataSize,
        storageSize: dbStats.storageSize,
        indexSize: dbStats.indexSize,
        totalSize: dbStats.dataSize + dbStats.indexSize,
      },
      lastChecked: new Date(),
    };

  } catch (error) {
    console.error('❌ Error getting database stats:', error);
    throw error;
  }
};

module.exports = {
  cleanupInactiveData,
  getCleanupStats,
  forceCleanupRoom,
  forceCleanupUser,
  getDatabaseStats,
};
