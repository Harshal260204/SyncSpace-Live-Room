/**
 * Participants List Component
 * 
 * Shows active participants in the collaborative workspace
 * Displays user presence, cursors, and activity status
 */

import React, { useState, useEffect } from 'react';

const ParticipantsList = ({ participants }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Update online users when participants change
  useEffect(() => {
    const users = Object.values(participants).map(participant => ({
      ...participant,
      isOnline: true,
      lastSeen: new Date(),
    }));
    setOnlineUsers(users);
  }, [participants]);

  // Get user status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'away':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get user activity text
  const getActivityText = (activity) => {
    switch (activity) {
      case 'coding':
        return '💻 Coding';
      case 'drawing':
        return '🎨 Drawing';
      case 'writing':
        return '📝 Writing';
      case 'chatting':
        return '💬 Chatting';
      default:
        return '👀 Viewing';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          👥 Participants
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {onlineUsers.length} online
        </p>
      </div>

      {/* Participants list */}
      <div className="flex-1 overflow-y-auto p-4">
        {onlineUsers.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <div className="text-4xl mb-2">👤</div>
            <p>No participants yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {onlineUsers.map((user, index) => (
              <div
                key={user.userId || index}
                className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                {/* Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${getStatusColor(user.status || 'active')}`}
                    title={user.status || 'active'}
                  />
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.username || 'Anonymous'}
                    </p>
                    {user.isHost && (
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
                        Host
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getActivityText(user.activity || 'viewing')}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      •
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user.lastSeen ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* User actions */}
                <div className="flex items-center space-x-1">
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Send message"
                  >
                    💬
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="View profile"
                  >
                    👁️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-600 px-4 py-3">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Real-time collaboration enabled
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
