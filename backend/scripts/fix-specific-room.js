/**
 * Fix Specific Room Script
 * 
 * This script fixes the specific room that has 533 participants
 * by removing all participants and resetting the count
 */

const mongoose = require('mongoose');
const Room = require('../models/Room');
require('dotenv').config();

async function fixSpecificRoom() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the specific problematic room
    const roomId = '939e5abd-6c36-4d73-a894-6079da6c97bf';
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      console.log('❌ Room not found');
      return;
    }

    console.log(`🔍 Found room: ${room.roomName} (${room.roomId})`);
    console.log(`   Before: ${room.participants.length} participants, ${room.currentParticipants} active`);

    // Remove ALL participants to reset the room
    room.participants = [];
    room.currentParticipants = 0;
    
    // Save the room
    await room.save();
    
    console.log(`   After: ${room.participants.length} participants, ${room.currentParticipants} active`);
    console.log('✅ Room reset successfully - all participants removed');

    // Verify the fix
    const updatedRoom = await Room.findOne({ roomId });
    console.log(`\n🔍 Verification: Room now has ${updatedRoom.participants.length} participants, ${updatedRoom.currentParticipants} active`);
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
}

// Run the fix
fixSpecificRoom();
