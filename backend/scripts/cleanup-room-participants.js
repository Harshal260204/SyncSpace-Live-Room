/**
 * Cleanup Room Participants Script
 * 
 * This script fixes rooms that have incorrect participant counts
 * by cleaning up inactive participants and recalculating counts
 */

const mongoose = require('mongoose');
const Room = require('../models/Room');
require('dotenv').config();

async function cleanupRoomParticipants() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all rooms
    const rooms = await Room.find({});
    console.log(`📊 Found ${rooms.length} rooms`);

    for (const room of rooms) {
      console.log(`\n🔍 Processing room: ${room.roomName} (${room.roomId})`);
      console.log(`   Before: ${room.participants.length} participants, ${room.currentParticipants} active`);

      // Clean up inactive participants (older than 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const originalCount = room.participants.length;
      
      room.participants = room.participants.filter(p => p.isActive || p.lastActivity > oneHourAgo);
      
      // Recalculate current participants
      room.currentParticipants = room.participants.filter(p => p.isActive).length;
      
      // Save the room
      await room.save();
      
      console.log(`   After: ${room.participants.length} participants, ${room.currentParticipants} active`);
      console.log(`   Removed: ${originalCount - room.participants.length} inactive participants`);
    }

    console.log('\n✅ Cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
}

// Run the cleanup
cleanupRoomParticipants();
