/**
 * Live Room Backend Server
 * 
 * A real-time collaborative workspace backend built with Express.js and Socket.io
 * Features: Anonymous guest login, room-based collaboration, real-time code editing,
 * collaborative notes, canvas drawing, chat, and presence indicators
 * 
 * @author Live Room Team
 * @version 1.0.0
 */

// Load environment variables first
require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Debug environment variables
console.log('🔍 Environment Variables Debug:');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Import custom modules
const connectDB = require('./config/database');
const socketHandler = require('./socket/socketHandler');
const roomRoutes = require('./routes/roomRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Connect to MongoDB and wait for connection
const startServer = async () => {
  try {
    await connectDB();
    console.log('✅ Database connection established');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration for production and development
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased limit for development
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development for easier testing
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Rate limiting skipped for development: ${req.method} ${req.path}`);
      return true;
    }
    return false;
  },
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Debug endpoint to clear rate limit (development only)
if (process.env.NODE_ENV === 'development') {
  app.get('/debug/clear-rate-limit', (req, res) => {
    // Clear rate limit store
    if (limiter.resetKey) {
      limiter.resetKey(req.ip);
    }
    res.json({ message: 'Rate limit cleared for IP: ' + req.ip });
  });
}

// API routes
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);

// Socket.io configuration with CORS
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Initialize socket handler
socketHandler(io);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid data provided',
      details: errors,
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      error: 'Duplicate field value',
      message: 'A record with this value already exists',
    });
  }
  
  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      message: 'The provided ID is not valid',
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Please provide a valid token',
    });
  }
  
  // Socket.io connection errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection failed',
    });
  }
  
  // Rate limiting errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated');
    mongoose.connection.close();
  });
});

// Start server after database connection
const PORT = process.env.PORT || 5000;
startServer().then(() => {
  server.listen(PORT, () => {
    console.log(`
🚀 Live Room Backend Server Started
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
📊 Health Check: http://localhost:${PORT}/health
    `);
  });
});

module.exports = { app, server, io };
