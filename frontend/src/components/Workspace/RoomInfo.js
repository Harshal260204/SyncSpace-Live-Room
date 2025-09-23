/**
 * Room Info Component
 * 
 * Displays room information and sharing options including:
 * - Room ID with copy functionality
 * - Share link generation
 * - Room settings access
 * - Accessibility features
 */

import React, { useState, useCallback } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * Room Info Component
 * 
 * Provides room sharing functionality for creators and participants
 * Includes copy-to-clipboard and share link generation
 */
const RoomInfo = ({ roomId, roomData, isCreator = false }) => {
  const { announce, screenReader } = useAccessibility();
  
  // Local state
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareLink, setShareLink] = useState('');

  // Generate share link
  const generateShareLink = useCallback(() => {
    const baseUrl = window.location.origin;
    const roomLink = `${baseUrl}/room/${roomId}`;
    setShareLink(roomLink);
    return roomLink;
  }, [roomId]);

  // Copy room ID to clipboard
  const copyRoomId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopySuccess(true);
      
      if (screenReader) {
        announce('Room ID copied to clipboard', 'polite');
      }
      
      // Reset success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy room ID:', error);
      
      if (screenReader) {
        announce('Failed to copy room ID', 'assertive');
      }
    }
  }, [roomId, screenReader, announce]);

  // Copy share link to clipboard
  const copyShareLink = useCallback(async () => {
    try {
      const link = shareLink || generateShareLink();
      await navigator.clipboard.writeText(link);
      setCopySuccess(true);
      
      if (screenReader) {
        announce('Room link copied to clipboard', 'polite');
      }
      
      // Reset success state after 2 seconds
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy share link:', error);
      
      if (screenReader) {
        announce('Failed to copy room link', 'assertive');
      }
    }
  }, [shareLink, generateShareLink, screenReader, announce]);

  // Handle share modal toggle
  const toggleShareModal = useCallback(() => {
    setShowShareModal(!showShareModal);
    if (!showShareModal) {
      generateShareLink();
    }
  }, [showShareModal, generateShareLink]);

  // Format room ID for display (show first 8 and last 4 characters)
  const formatRoomId = (id) => {
    if (id.length <= 12) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Room Information
        </h3>
        {isCreator && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Creator
          </span>
        )}
      </div>

      {/* Room Details */}
      <div className="space-y-3">
        {/* Room Name */}
        <div>
          <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Room Name
          </div>
          <p className="text-sm text-gray-900 dark:text-white">
            {roomData?.roomName || 'Untitled Room'}
          </p>
        </div>

        {/* Room ID */}
        <div>
          <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Room ID
          </div>
          <div className="flex items-center space-x-2">
            <code className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded text-sm font-mono">
              {formatRoomId(roomId)}
            </code>
            <button
              onClick={copyRoomId}
              className={`btn btn-sm ${copySuccess ? 'btn-success' : 'btn-outline'}`}
              aria-label="Copy room ID"
              title="Copy room ID to clipboard"
            >
              {copySuccess ? '✓' : '📋'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Share this ID with others to let them join your room
          </p>
        </div>

        {/* Room Description */}
        {roomData?.description && (
          <div>
            <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {roomData.description}
            </p>
          </div>
        )}

        {/* Room Settings */}
        {roomData?.settings && (
          <div>
            <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Features
            </div>
            <div className="flex flex-wrap gap-2">
              {roomData.settings.allowCodeEditing && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  💻 Code Editing
                </span>
              )}
              {roomData.settings.allowNotesEditing && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  📝 Notes
                </span>
              )}
              {roomData.settings.allowCanvasDrawing && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  🎨 Drawing
                </span>
              )}
              {roomData.settings.allowChat && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  💬 Chat
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={toggleShareModal}
            className="btn btn-primary btn-sm flex-1"
            aria-label="Open share options"
          >
            🔗 Share Room
          </button>
          <button
            onClick={copyRoomId}
            className="btn btn-outline btn-sm flex-1"
            aria-label="Copy room ID"
          >
            📋 Copy ID
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => setShowShareModal(false)}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Share Room
                </h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Room Link */}
                <div>
                  <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Room Link
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 input text-sm"
                      aria-label="Room share link"
                    />
                    <button
                      onClick={copyShareLink}
                      className={`btn btn-sm ${copySuccess ? 'btn-success' : 'btn-outline'}`}
                      aria-label="Copy room link"
                    >
                      {copySuccess ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                {/* Room ID */}
                <div>
                  <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Room ID
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={roomId}
                      readOnly
                      className="flex-1 input text-sm font-mono"
                      aria-label="Room ID"
                    />
                    <button
                      onClick={copyRoomId}
                      className={`btn btn-sm ${copySuccess ? 'btn-success' : 'btn-outline'}`}
                      aria-label="Copy room ID"
                    >
                      {copySuccess ? '✓' : '📋'}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    How to share:
                  </h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Send the room link to invite others</li>
                    <li>• Or share the room ID for manual entry</li>
                    <li>• Others can join by clicking the link or entering the ID</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="btn btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomInfo;
