/**
 * Room Routes
 * 
 * RESTful API endpoints for room management
 * Handles room creation, retrieval, updates, and deletion
 * Includes proper validation and error handling
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const RoomService = require('../services/roomService');
const { 
  asyncHandler, 
  ValidationError, 
  NotFoundError, 
  ConflictError,
  logger 
} = require('../utils/errorHandler');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    return next(new ValidationError('Validation failed', details));
  }
  next();
};

/**
 * GET /api/rooms
 * Get list of active rooms with pagination and filtering
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search term must be between 1 and 100 characters'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const options = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    search: req.query.search,
    sortBy: req.query.sortBy || 'lastActivity',
    sortOrder: req.query.sortOrder || 'desc'
  };

  const result = await RoomService.getRooms(options);

  logger.info('Rooms fetched successfully', {
    requestId: req.id,
    ...options,
    totalRooms: result.pagination.totalRooms
  });

  res.json(result);
}));

/**
 * GET /api/rooms/:roomId
 * Get specific room details by room ID
 */
router.get('/:roomId', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  
  const roomData = await RoomService.getRoomById(roomId);

  logger.info('Room details fetched successfully', {
    requestId: req.id,
    roomId,
    participants: roomData.currentParticipants
  });

  res.json(roomData);
}));

/**
 * POST /api/rooms
 * Create a new room
 */
router.post('/', [
  body('roomName').optional().isLength({ min: 1, max: 100 }).withMessage('Room name must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('maxParticipants').optional().isInt({ min: 2, max: 100 }).withMessage('Max participants must be between 2 and 100'),
  body('settings').optional().isObject().withMessage('Settings must be an object'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const roomData = req.body;
  const creatorInfo = {
    userId: req.user?.userId || 'system',
    username: req.user?.username || 'System'
  };

  const room = await RoomService.createRoom(roomData, creatorInfo);

  res.status(201).json(room);
}));

/**
 * PUT /api/rooms/:roomId
 * Update room settings (only by room creator or admin)
 */
router.put('/:roomId', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  body('roomName').optional().isLength({ min: 1, max: 100 }).withMessage('Room name must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('maxParticipants').optional().isInt({ min: 2, max: 100 }).withMessage('Max participants must be between 2 and 100'),
  body('settings').optional().isObject().withMessage('Settings must be an object'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const updateData = req.body;
  const updaterInfo = {
    userId: req.user?.userId || 'system',
    username: req.user?.username || 'System',
    role: req.user?.role || 'user'
  };

  const room = await RoomService.updateRoom(roomId, updateData, updaterInfo);

  res.json(room);
}));

/**
 * DELETE /api/rooms/:roomId
 * Deactivate a room (soft delete)
 */
router.delete('/:roomId', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const deactivatorInfo = {
    userId: req.user?.userId || 'system',
    username: req.user?.username || 'System',
    role: req.user?.role || 'user'
  };

  const result = await RoomService.deactivateRoom(roomId, deactivatorInfo);

  res.json(result);
}));

/**
 * GET /api/rooms/:roomId/participants
 * Get list of active participants in a room
 */
router.get('/:roomId/participants', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  
  const result = await RoomService.getRoomParticipants(roomId);

  res.json(result);
}));

/**
 * GET /api/rooms/:roomId/chat
 * Get chat history for a room
 */
router.get('/:roomId/chat', [
  param('roomId').isLength({ min: 1 }).withMessage('Room ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
], asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  
  const result = await RoomService.getRoomChatHistory(roomId, limit);

  res.json(result);
}));

module.exports = router;
