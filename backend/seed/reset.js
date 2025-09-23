/**
 * Database Reset Script
 * 
 * Clears all data from the database and optionally re-seeds it
 * WARNING: This will delete ALL data in the database!
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Room = require('../models/Room');

/**
 * Reset the database by clearing all collections
 */
const resetDatabase = async () => {
  try {
    console.log('🗑️  Starting database reset...');
    
    // Connect to database
    await connectDB();
    
    // Clear all collections
    console.log('🧹 Clearing users...');
    await User.deleteMany({});
    console.log('   ✅ Users cleared');
    
    console.log('🧹 Clearing rooms...');
    await Room.deleteMany({});
    console.log('   ✅ Rooms cleared');
    
    console.log('✅ Database reset completed successfully!');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

/**
 * Reset and re-seed the database
 */
const resetAndSeed = async () => {
  try {
    console.log('🔄 Starting database reset and re-seeding...');
    
    // Reset database
    await resetDatabase();
    
    // Re-seed database
    console.log('🌱 Re-seeding database...');
    const { seedDatabase } = require('./seed');
    await seedDatabase();
    
    console.log('✅ Database reset and re-seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Reset and re-seeding failed:', error);
    throw error;
  }
};

// Export functions for use in other scripts
module.exports = {
  resetDatabase,
  resetAndSeed,
};

// Run reset if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const shouldReseed = args.includes('--reseed') || args.includes('-r');
  
  if (shouldReseed) {
    resetAndSeed()
      .then(() => {
        console.log('🎉 Reset and re-seeding process completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Reset and re-seeding process failed:', error);
        process.exit(1);
      });
  } else {
    resetDatabase()
      .then(() => {
        console.log('🎉 Reset process completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Reset process failed:', error);
        process.exit(1);
      });
  }
}
