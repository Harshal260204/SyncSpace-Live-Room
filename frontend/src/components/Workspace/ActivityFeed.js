/**
 * Activity Feed Component
 * 
 * Live user activity feed with:
 * - Real-time activity tracking and display
 * - Presence indicators and user status
 * - Visual alerts for different activity types
 * - ARIA attributes for dynamic announcements
 * - Filtering and search capabilities
 * - Accessibility support for screen readers
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useSocket } from '../../contexts/SocketContext';
import { useUser } from '../../contexts/UserContext';
import { useBlindMode } from '../../contexts/BlindModeContext';

/**
 * Activity Feed Component
 * 
 * Provides live activity tracking with comprehensive accessibility
 * Includes presence indicators, activity filtering, and real-time updates
 */
const ActivityFeed = ({ 
  roomId, 
  roomData, 
  participants, 
  onRoomUpdate,
  isVisible = true 
}) => {
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { socket, connected, sendEvent } = useSocket();
  const { user } = useUser();
  const { enabled: blindModeEnabled, announceToScreenReader } = useBlindMode();

  // Activity feed state
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [activityFilter, setActivityFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest'); // newest, oldest
  const [showUserActivities, setShowUserActivities] = useState(true);
  const [showSystemActivities, setShowSystemActivities] = useState(true);

  // Presence state
  const [userPresence, setUserPresence] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [recentlyActive, setRecentlyActive] = useState([]);

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Refs
  const activityContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const lastActivityRef = useRef(null);

  // Constants
  const MAX_ACTIVITIES = 1000;
  const RECENT_ACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  const ACTIVITY_TYPES = {
    message: { label: 'Messages', icon: '💬', color: 'blue' },
    join: { label: 'Joins', icon: '👋', color: 'green' },
    leave: { label: 'Leaves', icon: '👋', color: 'red' },
    typing: { label: 'Typing', icon: '⌨️', color: 'yellow' },
    drawing: { label: 'Drawing', icon: '🎨', color: 'purple' },
    code: { label: 'Code', icon: '💻', color: 'indigo' },
    notes: { label: 'Notes', icon: '📝', color: 'gray' },
    system: { label: 'System', icon: '⚙️', color: 'gray' }
  };

  /**
   * Initialize activities from room data
   */
  useEffect(() => {
    if (roomData?.activities) {
      setActivities(roomData.activities);
    }
  }, [roomData?.activities]);

  /**
   * Filter activities based on current filter and search
   */
  useEffect(() => {
    let filtered = [...activities];

    // Filter by type
    if (activityFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === activityFilter);
    }

    // Filter by user
    if (selectedUser) {
      filtered = filtered.filter(activity => activity.userId === selectedUser);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.description.toLowerCase().includes(searchLower) ||
        activity.username?.toLowerCase().includes(searchLower) ||
        activity.details?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by activity type visibility
    if (!showUserActivities) {
      filtered = filtered.filter(activity => activity.type !== 'message' && activity.type !== 'typing');
    }
    if (!showSystemActivities) {
      filtered = filtered.filter(activity => activity.type !== 'join' && activity.type !== 'leave' && activity.type !== 'system');
    }

    // Sort activities
    filtered.sort((a, b) => {
      if (sortOrder === 'newest') {
        return b.timestamp - a.timestamp;
      } else {
        return a.timestamp - b.timestamp;
      }
    });

    setFilteredActivities(filtered);
  }, [activities, activityFilter, searchTerm, selectedUser, showUserActivities, showSystemActivities, sortOrder]);

  /**
   * Update user presence
   */
  const updateUserPresence = useCallback((userData) => {
    setUserPresence(prev => ({
      ...prev,
      [userData.userId]: {
        ...userData,
        lastSeen: Date.now(),
        isOnline: true
      }
    }));

    // Update online users
    setOnlineUsers(prev => {
      const existing = prev.find(u => u.userId === userData.userId);
      if (existing) {
        return prev.map(u => 
          u.userId === userData.userId 
            ? { ...u, lastSeen: Date.now(), isOnline: true }
            : u
        );
      } else {
        return [...prev, { ...userData, lastSeen: Date.now(), isOnline: true }];
      }
    });

    // Update recently active
    setRecentlyActive(prev => {
      const existing = prev.find(u => u.userId === userData.userId);
      if (existing) {
        return prev.map(u => 
          u.userId === userData.userId 
            ? { ...u, lastSeen: Date.now() }
            : u
        );
      } else {
        return [...prev, { ...userData, lastSeen: Date.now() }];
      }
    });
  }, []);

  /**
   * Add activity to feed
   */
  const addActivity = useCallback((activity) => {
    const newActivity = {
      id: activity.id || `activity-${Date.now()}-${Math.random()}`,
      type: activity.type || 'system',
      description: activity.description || 'Unknown activity',
      details: activity.details || '',
      timestamp: activity.timestamp || Date.now(),
      userId: activity.userId,
      username: activity.username,
      color: activity.color || '#000000'
    };

    setActivities(prev => {
      const updated = [...prev, newActivity];
      return updated.slice(-MAX_ACTIVITIES);
    });

    // Update user presence
    if (activity.userId) {
      updateUserPresence({
        userId: activity.userId,
        username: activity.username,
        color: activity.color
      });
    }

    // Announce for Blind Mode
    if (blindModeEnabled) {
      announceToScreenReader(`Activity: ${newActivity.description}`);
    }

    // Announce to screen readers (fallback)
    if (screenReader && !blindModeEnabled) {
      announce(`Activity: ${newActivity.description}`, 'polite');
    }
  }, [screenReader, announce, updateUserPresence, blindModeEnabled, announceToScreenReader]);

  /**
   * Handle user join activity
   */
  const handleUserJoin = useCallback((userData) => {
    const activity = {
      type: 'join',
      description: `${userData.username} joined the room`,
      details: `User joined at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      userId: userData.userId,
      username: userData.username,
      color: userData.color || '#000000'
    };

    addActivity(activity);
    updateUserPresence(userData);
  }, [addActivity, updateUserPresence]);

  /**
   * Handle user leave activity
   */
  const handleUserLeave = useCallback((userData) => {
    const activity = {
      type: 'leave',
      description: `${userData.username} left the room`,
      details: `User left at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      userId: userData.userId,
      username: userData.username,
      color: userData.color || '#000000'
    };

    addActivity(activity);

    // Update presence
    setUserPresence(prev => {
      const updated = { ...prev };
      if (updated[userData.userId]) {
        updated[userData.userId].isOnline = false;
        updated[userData.userId].lastSeen = Date.now();
      }
      return updated;
    });

    setOnlineUsers(prev => prev.map(u => 
      u.userId === userData.userId 
        ? { ...u, isOnline: false, lastSeen: Date.now() }
        : u
    ));
  }, [addActivity]);

  /**
   * Handle message activity
   */
  const handleMessageActivity = useCallback((messageData) => {
    const activity = {
      type: 'message',
      description: `${messageData.username} sent a message`,
      details: messageData.text,
      timestamp: Date.now(),
      userId: messageData.userId,
      username: messageData.username,
      color: messageData.color || '#000000'
    };

    addActivity(activity);
  }, [addActivity]);

  /**
   * Handle typing activity
   */
  const handleTypingActivity = useCallback((userData) => {
    const activity = {
      type: 'typing',
      description: `${userData.username} is typing`,
      details: `Started typing at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      userId: userData.userId,
      username: userData.username,
      color: userData.color || '#000000'
    };

    addActivity(activity);
  }, [addActivity]);

  /**
   * Handle drawing activity
   */
  const handleDrawingActivity = useCallback((drawingData) => {
    const activity = {
      type: 'drawing',
      description: `${drawingData.username} drew something`,
      details: `Used ${drawingData.tool} tool`,
      timestamp: Date.now(),
      userId: drawingData.userId,
      username: drawingData.username,
      color: drawingData.color || '#000000'
    };

    addActivity(activity);
  }, [addActivity]);

  /**
   * Handle code activity
   */
  const handleCodeActivity = useCallback((codeData) => {
    const activity = {
      type: 'code',
      description: `${codeData.username} edited code`,
      details: `Modified ${codeData.language || 'code'} file`,
      timestamp: Date.now(),
      userId: codeData.userId,
      username: codeData.username,
      color: codeData.color || '#000000'
    };

    addActivity(activity);
  }, [addActivity]);

  /**
   * Handle notes activity
   */
  const handleNotesActivity = useCallback((notesData) => {
    const activity = {
      type: 'notes',
      description: `${notesData.username} edited notes`,
      details: `Updated notes content`,
      timestamp: Date.now(),
      userId: notesData.userId,
      username: notesData.username,
      color: notesData.color || '#000000'
    };

    addActivity(activity);
  }, [addActivity]);

  /**
   * Clear activities
   */
  const clearActivities = useCallback(() => {
    setActivities([]);
    if (screenReader) {
      announce('Activity feed cleared', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Export activities
   */
  const exportActivities = useCallback(() => {
    const dataStr = JSON.stringify(activities, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `room-${roomId}-activities-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activities, roomId]);

  /**
   * Render activity item
   */
  const renderActivityItem = useCallback((activity) => {
    const activityType = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES.system;
    const activityTime = new Date(activity.timestamp).toLocaleTimeString();
    const isRecent = Date.now() - activity.timestamp < RECENT_ACTIVITY_THRESHOLD;

    return (
      <div
        key={activity.id}
        className={`flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 ${
          isRecent ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        }`}
        role="listitem"
        aria-label={`Activity: ${activity.description}`}
      >
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
            activityType.color === 'blue' ? 'bg-blue-100 text-blue-600' :
            activityType.color === 'green' ? 'bg-green-100 text-green-600' :
            activityType.color === 'red' ? 'bg-red-100 text-red-600' :
            activityType.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
            activityType.color === 'purple' ? 'bg-purple-100 text-purple-600' :
            activityType.color === 'indigo' ? 'bg-indigo-100 text-indigo-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {activityType.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {activity.description}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {activityTime}
            </p>
          </div>
          {activity.details && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {activity.details}
            </p>
          )}
          {activity.username && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              by {activity.username}
            </p>
          )}
        </div>
      </div>
    );
  }, []);

  /**
   * Render user presence indicator
   */
  const renderUserPresence = useCallback((userData) => {
    const isOnline = userData.isOnline;
    const lastSeen = new Date(userData.lastSeen).toLocaleTimeString();

    return (
      <div
        key={userData.userId}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
        role="listitem"
      >
        <div className="relative">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm text-white"
            style={{ backgroundColor: userData.color || '#000000' }}
          >
            {userData.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
            aria-label={isOnline ? 'Online' : 'Offline'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {userData.username}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isOnline ? 'Online' : `Last seen ${lastSeen}`}
          </p>
        </div>
      </div>
    );
  }, []);

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Activity Feed Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Activity Feed
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-sm btn-outline"
            aria-label="Toggle filters"
            title="Toggle filters"
          >
            🔍
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn btn-sm btn-outline"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '📉' : '📈'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="space-y-3">
            {/* Search */}
            <div>
              <label htmlFor="activity-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search Activities
              </label>
              <input
                id="activity-search"
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activities..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
                aria-label="Search activities"
              />
            </div>

            {/* Filter by type */}
            <div>
              <label htmlFor="activity-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Type
              </label>
              <select
                id="activity-filter"
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
                aria-label="Filter activities by type"
              >
                <option value="all">All Activities</option>
                {Object.entries(ACTIVITY_TYPES).map(([key, type]) => (
                  <option key={key} value={key}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort order */}
            <div>
              <label htmlFor="sort-order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort Order
              </label>
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
                aria-label="Sort activities"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {/* Activity type visibility */}
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showUserActivities}
                  onChange={(e) => setShowUserActivities(e.target.checked)}
                  className="mr-2"
                  aria-label="Show user activities"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">User Activities</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showSystemActivities}
                  onChange={(e) => setShowSystemActivities(e.target.checked)}
                  className="mr-2"
                  aria-label="Show system activities"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">System Activities</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <button
                onClick={clearActivities}
                className="btn btn-sm btn-outline"
                aria-label="Clear activities"
                title="Clear activities"
              >
                🗑️ Clear
              </button>
              <button
                onClick={exportActivities}
                className="btn btn-sm btn-outline"
                aria-label="Export activities"
                title="Export activities"
              >
                📤 Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Presence */}
      {isExpanded && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Online Users ({onlineUsers.filter(u => u.isOnline).length})
          </h3>
          <div className="max-h-32 overflow-y-auto">
            {onlineUsers.map(renderUserPresence)}
          </div>
        </div>
      )}

      {/* Activities */}
      <div
        ref={activityContainerRef}
        className="flex-1 overflow-y-auto"
        role="log"
        aria-label="Activity feed"
        aria-live="polite"
      >
        {filteredActivities.length > 0 ? (
          <div className="p-3 space-y-1">
            {filteredActivities.map(renderActivityItem)}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">📝</p>
              <p>No activities found</p>
              {searchTerm && (
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Activity Stats */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{filteredActivities.length} activities</span>
          <span>{onlineUsers.filter(u => u.isOnline).length} online</span>
        </div>
      </div>

      {/* Screen Reader Status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {filteredActivities.length} activities displayed
        {onlineUsers.filter(u => u.isOnline).length} users online
      </div>
    </div>
  );
};

export default ActivityFeed;