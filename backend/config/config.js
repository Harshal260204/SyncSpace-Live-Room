/**
 * Configuration Management
 * 
 * Centralized configuration with environment-specific settings
 * Provides validation and type safety for all configuration values
 */

const Joi = require('joi');

/**
 * Configuration schema for validation
 */
const configSchema = Joi.object({
  // Server configuration
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(5000),
  
  // Database configuration
  MONGODB_URI: Joi.string().required(),
  MONGODB_OPTIONS: Joi.object().default({}),
  
  // CORS configuration
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  CORS_ORIGINS: Joi.string().default(''),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  
  // Socket.io configuration
  SOCKET_PING_TIMEOUT: Joi.number().default(60000),
  SOCKET_PING_INTERVAL: Joi.number().default(25000),
  
  // Cleanup intervals
  ROOM_CLEANUP_INTERVAL: Joi.number().default(300000), // 5 minutes
  USER_CLEANUP_INTERVAL: Joi.number().default(300000), // 5 minutes
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_FILE_MAX_SIZE: Joi.number().default(5242880), // 5MB
  LOG_FILE_MAX_FILES: Joi.number().default(5),
  
  // Security
  SESSION_SECRET: Joi.string().min(32).default('your-super-secret-session-key-change-in-production'),
  JWT_SECRET: Joi.string().min(32).default('your-super-secret-jwt-key-change-in-production'),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  
  // File upload limits
  MAX_FILE_SIZE: Joi.number().default(10 * 1024 * 1024), // 10MB
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/gif,text/plain,application/pdf'),
  
  // Feature flags
  ENABLE_REGISTRATION: Joi.boolean().default(true),
  ENABLE_ANONYMOUS_USERS: Joi.boolean().default(true),
  ENABLE_FILE_UPLOADS: Joi.boolean().default(false),
  ENABLE_ANALYTICS: Joi.boolean().default(false),
  
  // Performance
  ENABLE_COMPRESSION: Joi.boolean().default(true),
  ENABLE_CACHING: Joi.boolean().default(true),
  CACHE_TTL: Joi.number().default(300), // 5 minutes
  
  // Monitoring
  ENABLE_HEALTH_CHECKS: Joi.boolean().default(true),
  ENABLE_METRICS: Joi.boolean().default(false),
  METRICS_PORT: Joi.number().port().default(9090),
});

/**
 * Load and validate configuration
 */
function loadConfig() {
  const config = {
    // Server
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    
    // Database
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_OPTIONS: process.env.MONGODB_OPTIONS ? JSON.parse(process.env.MONGODB_OPTIONS) : {},
    
    // CORS
    FRONTEND_URL: process.env.FRONTEND_URL,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    
    // Rate limiting
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
    
    // Socket.io
    SOCKET_PING_TIMEOUT: process.env.SOCKET_PING_TIMEOUT,
    SOCKET_PING_INTERVAL: process.env.SOCKET_PING_INTERVAL,
    
    // Cleanup
    ROOM_CLEANUP_INTERVAL: process.env.ROOM_CLEANUP_INTERVAL,
    USER_CLEANUP_INTERVAL: process.env.USER_CLEANUP_INTERVAL,
    
    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL,
    LOG_FILE_MAX_SIZE: process.env.LOG_FILE_MAX_SIZE,
    LOG_FILE_MAX_FILES: process.env.LOG_FILE_MAX_FILES,
    
    // Security
    SESSION_SECRET: process.env.SESSION_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    
    // File uploads
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
    ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES,
    
    // Feature flags
    ENABLE_REGISTRATION: process.env.ENABLE_REGISTRATION,
    ENABLE_ANONYMOUS_USERS: process.env.ENABLE_ANONYMOUS_USERS,
    ENABLE_FILE_UPLOADS: process.env.ENABLE_FILE_UPLOADS,
    ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS,
    
    // Performance
    ENABLE_COMPRESSION: process.env.ENABLE_COMPRESSION,
    ENABLE_CACHING: process.env.ENABLE_CACHING,
    CACHE_TTL: process.env.CACHE_TTL,
    
    // Monitoring
    ENABLE_HEALTH_CHECKS: process.env.ENABLE_HEALTH_CHECKS,
    ENABLE_METRICS: process.env.ENABLE_METRICS,
    METRICS_PORT: process.env.METRICS_PORT,
  };

  // Validate configuration
  const { error, value } = configSchema.validate(config, {
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(`Configuration validation error: ${error.details.map(d => d.message).join(', ')}`);
  }

  return value;
}

/**
 * Get environment-specific configuration
 */
function getEnvironmentConfig() {
  const config = loadConfig();
  
  const environmentConfigs = {
    development: {
      ...config,
      LOG_LEVEL: 'debug',
      ENABLE_ANALYTICS: false,
      ENABLE_METRICS: false,
    },
    
    production: {
      ...config,
      LOG_LEVEL: 'info',
      ENABLE_ANALYTICS: true,
      ENABLE_METRICS: true,
    },
    
    test: {
      ...config,
      LOG_LEVEL: 'error',
      ENABLE_ANALYTICS: false,
      ENABLE_METRICS: false,
      MONGODB_URI: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/liveroom-test',
    },
  };

  return environmentConfigs[config.NODE_ENV] || environmentConfigs.development;
}

/**
 * Configuration utilities
 */
const configUtils = {
  /**
   * Check if feature is enabled
   */
  isFeatureEnabled: (feature) => {
    const config = getEnvironmentConfig();
    return config[`ENABLE_${feature.toUpperCase()}`] === true;
  },

  /**
   * Get database options
   */
  getDatabaseOptions: () => {
    const config = getEnvironmentConfig();
    return {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      ...config.MONGODB_OPTIONS,
    };
  },

  /**
   * Get CORS origins
   */
  getCorsOrigins: () => {
    const config = getEnvironmentConfig();
    const origins = [config.FRONTEND_URL];
    
    if (config.CORS_ORIGINS) {
      origins.push(...config.CORS_ORIGINS.split(','));
    }
    
    return origins;
  },

  /**
   * Get rate limit configuration
   */
  getRateLimitConfig: () => {
    const config = getEnvironmentConfig();
    return {
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX_REQUESTS,
    };
  },

  /**
   * Get socket.io configuration
   */
  getSocketConfig: () => {
    const config = getEnvironmentConfig();
    return {
      pingTimeout: config.SOCKET_PING_TIMEOUT,
      pingInterval: config.SOCKET_PING_INTERVAL,
      transports: ['websocket', 'polling'],
    };
  },

  /**
   * Get logging configuration
   */
  getLoggingConfig: () => {
    const config = getEnvironmentConfig();
    return {
      level: config.LOG_LEVEL,
      maxSize: config.LOG_FILE_MAX_SIZE,
      maxFiles: config.LOG_FILE_MAX_FILES,
    };
  },
};

// Load configuration
const config = getEnvironmentConfig();

module.exports = {
  config,
  configUtils,
  loadConfig,
  getEnvironmentConfig,
};
