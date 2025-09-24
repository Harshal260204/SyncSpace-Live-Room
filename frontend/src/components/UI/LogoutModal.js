/**
 * Logout Modal Component
 * 
 * Confirmation modal for user logout with:
 * - Logout confirmation
 * - Data cleanup information
 * - Accessibility features
 * - Keyboard navigation
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { useSocket } from '../../contexts/SocketContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * Logout Modal Component
 * 
 * Provides logout confirmation and cleanup
 * Includes accessibility features and proper data cleanup
 */
const LogoutModal = ({ onClose }) => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const { leaveRoom, disconnect } = useSocket();
  const { announce, screenReader } = useAccessibility();
  
  // Local state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Debug: Log when modal is rendered
  React.useEffect(() => {
    console.log('🔍 LogoutModal rendered');
    return () => {
      console.log('🔍 LogoutModal unmounted');
    };
  }, []);

  // Handle logout confirmation
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    
    try {
      console.log('🔄 Starting logout process...');
      
      // Announce logout to screen readers
      if (screenReader) {
        announce('Logging out...', 'polite');
      }
      
      // Leave current room if in one
      if (user?.currentRoom) {
        console.log('🚪 Leaving current room:', user.currentRoom);
        leaveRoom();
      }
      
      // Disconnect from socket
      console.log('🔌 Disconnecting from socket...');
      disconnect();
      
      // Clear user data
      console.log('🧹 Clearing user data...');
      logout();
      
      // Announce successful logout
      if (screenReader) {
        announce('Successfully logged out', 'polite');
      }
      
      console.log('🏠 Navigating to dashboard...');
      // Navigate to dashboard (which will show the username entry form)
      navigate('/', { replace: true });
      console.log('✅ Navigation completed');
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      
      if (screenReader) {
        announce('Error during logout. Please try again.', 'assertive');
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [user, leaveRoom, disconnect, logout, navigate, screenReader, announce]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

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
              Logout
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
          <div className="p-6 space-y-4">
            {/* User Info */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-600 dark:text-gray-300">
                  {user?.username?.charAt(0)?.toUpperCase() || '👤'}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {user?.username || 'Guest User'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Are you sure you want to logout?
              </p>
            </div>

            {/* Warning Information */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    What happens when you logout:
                  </h4>
                  <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>• You'll leave any active rooms</li>
                    <li>• Your session data will be cleared</li>
                    <li>• You'll need to create a new session to continue</li>
                    <li>• Your preferences will be lost</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Current Room Info */}
            {user?.currentRoom && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Active Room
                    </h4>
                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                      You're currently in a room. Logging out will remove you from the room.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="btn btn-outline"
              disabled={isLoggingOut}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                console.log('🔘 Logout button in modal clicked');
                handleLogout();
              }}
              className="btn btn-danger"
              disabled={isLoggingOut}
              aria-label="Confirm logout"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
