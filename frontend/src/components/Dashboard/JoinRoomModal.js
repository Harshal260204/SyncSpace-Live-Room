/**
 * Join Room Modal Component
 * 
 * Modal for joining existing rooms with:
 * - Room ID input
 * - Room validation
 * - Error handling
 * - Accessibility features
 */

import React, { useState } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * Join Room Modal Component
 * 
 * Provides form for joining existing rooms by room ID
 * Includes validation and accessibility features
 */
const JoinRoomModal = ({ onClose, onJoinRoom }) => {
  const { announce, screenReader } = useAccessibility();
  
  // Form state
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);

  // Handle input change
  const handleInputChange = (e) => {
    setRoomId(e.target.value);
    setError(null); // Clear error when user starts typing
  };

  // Validate room ID
  const validateRoomId = (id) => {
    if (!id.trim()) {
      return 'Room ID is required';
    }
    
    if (id.length < 3) {
      return 'Room ID must be at least 3 characters';
    }
    
    if (id.length > 50) {
      return 'Room ID must be less than 50 characters';
    }
    
    // Check for valid characters (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9\-_]+$/.test(id)) {
      return 'Room ID can only contain letters, numbers, hyphens, and underscores';
    }
    
    return null;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validationError = validateRoomId(roomId);
    if (validationError) {
      setError(validationError);
      
      if (screenReader) {
        announce(validationError, 'assertive');
      }
      return;
    }
    
    setIsJoining(true);
    
    try {
      onJoinRoom(roomId.trim());
      
      if (screenReader) {
        announce(`Joining room ${roomId}`, 'polite');
      }
      
    } catch (err) {
      console.error('Error joining room:', err);
      setError(err.message || 'Failed to join room');
      
      if (screenReader) {
        announce('Failed to join room. Please check the room ID and try again.', 'assertive');
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Set up keyboard navigation
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Join Room
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Room ID Input */}
            <div>
              <label htmlFor="room-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room ID *
              </label>
              <input
                id="room-id"
                type="text"
                value={roomId}
                onChange={handleInputChange}
                className={`input w-full ${error ? 'border-red-500' : ''}`}
                placeholder="Enter room ID"
                aria-describedby={error ? 'room-id-error' : 'room-id-help'}
                maxLength={50}
                required
              />
              {error ? (
                <p id="room-id-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              ) : (
                <p id="room-id-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Enter the room ID provided by the room creator
                </p>
              )}
            </div>

            {/* Help Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                How to get a Room ID?
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Ask the room creator to share the room ID</li>
                <li>• Room IDs are usually 8-16 characters long</li>
                <li>• They can contain letters, numbers, hyphens, and underscores</li>
                <li>• Room IDs are case-sensitive</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
                disabled={isJoining}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isJoining || !roomId.trim()}
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomModal;
