/**
 * Activity Feed Component
 * 
 * Real-time activity tracking with:
 * - Live activity updates and notifications
 * - Full accessibility support (ARIA labels, screen reader support)
 * - Activity filtering and search
 * - Keyboard navigation and focus management
 * - Activity history and persistence
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useSocket } from '../../contexts/SocketContext';

/**
 * Activity Feed Component
 * 
 * Displays real-time activity updates with comprehensive accessibility
 * Includes filtering, search, and activity management features
 */
const ActivityFeed = ({ activities = [], onActivityClick }) => {
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { connected } = useSocket();

  // Local state
  const [filter, setFilter] = useState('all'); // 'all', 'user', 'system', 'code', 'notes', 'canvas', 'chat'
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Refs
  const feedRef = useRef(null);
  const activityRefs = useRef({});

  /**
   * Get activity type icon
   */
  const getActivityIcon = (type) => {
    switch (type) {
      case 'user-join':
        return '👋';
      case 'user-leave':
        return '👋';
      case 'code-change':
        return '💻';
      case 'notes-change':
        return '📝';
      case 'canvas-draw':
        return '🎨';
      case 'chat-message':
        return '💬';
      case 'room-created':
        return '🏠';
      case 'room-deleted':
        return '🗑️';
      case 'user-typing':
        return '⌨️';
      case 'user-drawing':
        return '✏️';
      case 'user-coding':
        return '💻';
      case 'system':
        return '⚙️';
      default:
        return '📌';
    }
  };

  /**
   * Get activity type color
   */
  const getActivityColor = (type) => {
    switch (type) {
      case 'user-join':
        return 'text-green-600 dark:text-green-400';
      case 'user-leave':
        return 'text-red-600 dark:text-red-400';
      case 'code-change':
        return 'text-blue-600 dark:text-blue-400';
      case 'notes-change':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'canvas-draw':
        return 'text-purple-600 dark:text-purple-400';
      case 'chat-message':
        return 'text-indigo-600 dark:text-indigo-400';
      case 'room-created':
        return 'text-green-600 dark:text-green-400';
      case 'room-deleted':
        return 'text-red-600 dark:text-red-400';
      case 'user-typing':
        return 'text-orange-600 dark:text-orange-400';
      case 'user-drawing':
        return 'text-purple-600 dark:text-purple-400';
      case 'user-coding':
        return 'text-blue-600 dark:text-blue-400';
      case 'system':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  /**
   * Format activity timestamp
   */
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  /**
   * Filter activities
   */
  const getFilteredActivities = () => {
    let filtered = activities;

    // Filter by type
    if (filter !== 'all') {
      filtered = filtered.filter(activity => {
        switch (filter) {
          case 'user':
            return ['user-join', 'user-leave', 'user-typing', 'user-drawing', 'user-coding'].includes(activity.type);
          case 'system':
            return activity.type === 'system';
          case 'code':
            return activity.type === 'code-change';
          case 'notes':
            return activity.type === 'notes-change';
          case 'canvas':
            return activity.type === 'canvas-draw';
          case 'chat':
            return activity.type === 'chat-message';
          default:
            return true;
        }
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(activity => 
        activity.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  /**
   * Handle activity selection
   */
  const handleActivitySelect = useCallback((activity) => {
    setSelectedActivity(selectedActivity?.id === activity.id ? null : activity);
    
    if (screenReader) {
      announce(`Selected activity: ${activity.message}`, 'polite');
    }

    // Call parent handler if provided
    if (onActivityClick) {
      onActivityClick(activity);
    }
  }, [selectedActivity, screenReader, announce, onActivityClick]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event) => {
    if (!keyboardNavigation || !isFocused) return;

    const filteredActivities = getFilteredActivities();
    const currentIndex = selectedActivity 
      ? filteredActivities.findIndex(a => a.id === selectedActivity.id)
      : -1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, filteredActivities.length - 1);
        if (filteredActivities[nextIndex]) {
          handleActivitySelect(filteredActivities[nextIndex]);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (filteredActivities[prevIndex]) {
          handleActivitySelect(filteredActivities[prevIndex]);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (selectedActivity) {
          // Handle activity action
          if (screenReader) {
            announce(`Action for activity: ${selectedActivity.message}`, 'polite');
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        setSelectedActivity(null);
        if (screenReader) {
          announce('Activity selection cleared', 'polite');
        }
        break;
    }
  }, [keyboardNavigation, isFocused, selectedActivity, handleActivitySelect, screenReader, announce]);

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (screenReader) {
      announce('Activity feed focused', 'polite');
    }
  }, [screenReader, announce]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (screenReader) {
      announce('Activity feed focus lost', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Get activity status for screen readers
   */
  const getActivityStatus = () => {
    const filtered = getFilteredActivities();
    const recentCount = filtered.filter(a => {
      const diffInMinutes = Math.floor((Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60));
      return diffInMinutes < 5;
    }).length;
    
    return `Activity feed: ${filtered.length} activities, ${recentCount} recent. ${connected ? 'Connected' : 'Disconnected'}.`;
  };

  /**
   * Handle activity action
   */
  const handleActivityAction = (activity, action) => {
    if (screenReader) {
      announce(`${action} for activity: ${activity.message}`, 'polite');
    }
    
    // Handle specific actions here
    switch (action) {
      case 'view-details':
        // View activity details
        break;
      case 'copy-message':
        // Copy activity message
        break;
      case 'reply':
        // Reply to activity
        break;
      case 'delete':
        // Delete activity (if moderator)
        break;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Activity Feed Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Activity Feed
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({getFilteredActivities().length})
          </span>
        </div>

        {/* Filter and Search */}
        <div className="flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input text-sm py-1 px-2"
            aria-label="Filter activities"
          >
            <option value="all">All</option>
            <option value="user">User</option>
            <option value="system">System</option>
            <option value="code">Code</option>
            <option value="notes">Notes</option>
            <option value="canvas">Canvas</option>
            <option value="chat">Chat</option>
          </select>
          
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input text-sm py-1 px-2 w-32"
            aria-label="Search activities"
          />
        </div>
      </div>

      {/* Activity List */}
      <div 
        ref={feedRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        tabIndex={0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        role="list"
        aria-label="Activity feed"
        aria-describedby="activity-help"
      >
        {getFilteredActivities().length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No activities found</p>
          </div>
        ) : (
          getFilteredActivities().map((activity) => {
            const isSelected = selectedActivity?.id === activity.id;
            const isRecent = (Date.now() - new Date(activity.timestamp).getTime()) < 300000; // 5 minutes

            return (
              <div
                key={activity.id}
                ref={(el) => {
                  if (el) activityRefs.current[activity.id] = el;
                }}
                className={`
                  p-3 rounded-lg border cursor-pointer transition-colors duration-200
                  ${isSelected 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                  ${isRecent ? 'ring-1 ring-green-500' : ''}
                `}
                onClick={() => handleActivitySelect(activity)}
                role="listitem"
                tabIndex={0}
                aria-label={`${activity.type} activity: ${activity.message}`}
                aria-selected={isSelected}
              >
                {/* Activity Content */}
                <div className="flex items-start space-x-3">
                  {/* Activity Icon */}
                  <div className="flex-shrink-0">
                    <span 
                      className={`text-lg ${getActivityColor(activity.type)}`}
                      aria-label={`${activity.type} activity`}
                    >
                      {getActivityIcon(activity.type)}
                    </span>
                  </div>

                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.username || 'System'}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                      {isRecent && (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Recent
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {activity.message}
                    </p>

                    {/* Activity Metadata */}
                    {activity.metadata && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {activity.metadata.type && (
                          <span className="mr-2">Type: {activity.metadata.type}</span>
                        )}
                        {activity.metadata.file && (
                          <span className="mr-2">File: {activity.metadata.file}</span>
                        )}
                        {activity.metadata.line && (
                          <span>Line: {activity.metadata.line}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Activity Actions (if selected) */}
                {isSelected && (
                  <div className="mt-2 flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivityAction(activity, 'view-details');
                      }}
                      className="btn btn-outline text-xs py-1 px-2"
                      aria-label={`View details for activity: ${activity.message}`}
                    >
                      Details
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivityAction(activity, 'copy-message');
                      }}
                      className="btn btn-outline text-xs py-1 px-2"
                      aria-label={`Copy message: ${activity.message}`}
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Activity Footer */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{getFilteredActivities().length} activities</span>
          <span>
            {getFilteredActivities().filter(a => {
              const diffInMinutes = Math.floor((Date.now() - new Date(a.timestamp).getTime()) / (1000 * 60));
              return diffInMinutes < 5;
            }).length} recent
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>Click to select</span>
        </div>
      </div>

      {/* Screen Reader Status */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="activity-status"
      >
        {getActivityStatus()}
      </div>

      {/* Keyboard Shortcuts Help */}
      {keyboardNavigation && (
        <div className="sr-only" id="activity-keyboard-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>Arrow Up/Down: Navigate activities</li>
            <li>Enter/Space: Select activity</li>
            <li>Escape: Clear selection</li>
            <li>Tab: Navigate between elements</li>
            <li>Click: Select activity</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
