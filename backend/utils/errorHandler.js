/**
 * Error Handler Utilities
 * 
 * Centralized error handling functions to reduce code duplication
 * and provide consistent error responses across the application
 */

/**
 * Send a standardized 500 error response
 * @param {Object} res - Express response object
 * @param {string} errorType - Type of error (e.g., 'Failed to fetch rooms')
 * @param {string} message - Human-readable error message
 */
const sendServerError = (res, errorType, message) => {
  res.status(500).json({
    error: errorType,
    message: message,
  });
};

/**
 * Send a standardized 404 error response
 * @param {Object} res - Express response object
 * @param {string} errorType - Type of error (e.g., 'Room not found')
 * @param {string} message - Human-readable error message
 */
const sendNotFoundError = (res, errorType, message) => {
  res.status(404).json({
    error: errorType,
    message: message,
  });
};

/**
 * Send a standardized 400 error response
 * @param {Object} res - Express response object
 * @param {string} errorType - Type of error (e.g., 'Validation Error')
 * @param {string} message - Human-readable error message
 */
const sendBadRequestError = (res, errorType, message) => {
  res.status(400).json({
    error: errorType,
    message: message,
  });
};

/**
 * Send a standardized 409 error response
 * @param {Object} res - Express response object
 * @param {string} errorType - Type of error (e.g., 'Username taken')
 * @param {string} message - Human-readable error message
 */
const sendConflictError = (res, errorType, message) => {
  res.status(409).json({
    error: errorType,
    message: message,
  });
};

module.exports = {
  sendServerError,
  sendNotFoundError,
  sendBadRequestError,
  sendConflictError,
};
