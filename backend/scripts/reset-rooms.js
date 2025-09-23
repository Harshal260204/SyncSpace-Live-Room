/**
 * Reset Rooms Script
 * 
 * Clears all participant data from rooms to prevent capacity issues
 * Use this when rooms get stuck at maximum capacity
 */

const mongoose = require('mongoose');
const Room = require('../models/Room');

async function resetAllRooms() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/syncspace-liveroom');
    console.log('✅ Connected to database');
    
    // Find all rooms
    const rooms = await Room.find({ isActive: true });
    console.log(`📊 Found ${rooms.length} active rooms`);
    
    for (const room of rooms) {
      console.log(`🧹 Resetting room: ${room.roomName} (${room.roomId})`);
      console.log(`   Before: ${room.participants.length} total, ${room.currentParticipants} active`);
      
      // Clear all participants
      room.participants = [];
      room.currentParticipants = 0;
      
      await room.save();
      console.log(`   After: ${room.participants.length} total, ${room.currentParticipants} active`);
    }
    
    console.log('✅ All rooms reset successfully');
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAllRooms();
