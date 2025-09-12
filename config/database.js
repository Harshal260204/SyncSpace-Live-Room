/**
 * Database Configuration
 * 
 * Handles MongoDB connection with proper error handling and reconnection logic
 * Includes connection monitoring and graceful shutdown handling
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas using the connection string from environment variables
 * Includes retry logic and connection monitoring for production reliability
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Connection event listeners for monitoring
    mongoose.connection.on('connected', () => {
      console.log('📡 Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose disconnected from MongoDB');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔒 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // In production, exit the process if database connection fails
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    // In development, retry connection after 5 seconds
    console.log('🔄 Retrying database connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
