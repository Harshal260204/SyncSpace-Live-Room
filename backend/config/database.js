/**
 * Database Configuration
 * 
 * Handles MongoDB connection with proper error handling and reconnection logic
 * Includes connection monitoring and graceful shutdown handling
 */

const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the connection string from environment variables
 * Supports both local MongoDB and MongoDB Atlas
 * Includes retry logic and connection monitoring for production reliability
 */
const connectDB = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('📡 MongoDB already connected');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain minimum 2 connections
      serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
      heartbeatFrequencyMS: 10000, // Send a ping every 10 seconds
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      retryWrites: true, // Retry write operations on failure
      retryReads: true, // Retry read operations on failure
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
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (mongoose.connection.readyState === 0) {
          console.log('🔄 Attempting to reconnect to MongoDB...');
          connectDB();
        }
      }, 5000);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

    // Monitor connection health
    setInterval(() => {
      if (mongoose.connection.readyState !== 1) {
        console.log('⚠️ Database connection unhealthy, attempting reconnection...');
        connectDB();
      }
    }, 30000); // Check every 30 seconds

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
