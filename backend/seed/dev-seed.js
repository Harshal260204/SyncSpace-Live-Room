/**
 * Development Auto-Seeding
 * 
 * Automatically seeds the database in development mode if it's empty
 * This script is designed to be run on server startup in development
 */

require('dotenv').config();
const { seedIfEmpty } = require('./seed');

/**
 * Development auto-seeding function
 * Only runs if NODE_ENV is development and database is empty
 */
const runDevSeeding = async () => {
  // Only run in development mode
  if (process.env.NODE_ENV === 'production') {
    console.log('🚫 Auto-seeding disabled in production mode');
    return;
  }
  
  try {
    console.log('🔧 Running development auto-seeding...');
    await seedIfEmpty();
  } catch (error) {
    console.error('❌ Development auto-seeding failed:', error);
    // Don't throw error in development to prevent server startup failure
  }
};

// Export function for use in server startup
module.exports = runDevSeeding;

// Run auto-seeding if this file is executed directly
if (require.main === module) {
  runDevSeeding()
    .then(() => {
      console.log('🎉 Development auto-seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Development auto-seeding failed:', error);
      process.exit(1);
    });
}
