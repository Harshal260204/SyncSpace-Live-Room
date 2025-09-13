/**
 * Participants List Component
 * 
 * Real-time participant management with:
 * - Live user presence and status
 * - Full accessibility support (ARIA labels, keyboard navigation)
 * - User information and activity indicators
 * - Screen reader support and focus management
 * - User actions and interactions
 */

import React, { useState, useRef, useCallback } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useUser } from '../../contexts/UserContext';
import { useSocket } from '../../contexts/SocketContext';

/**
 * Participants List Component
 * 
 * Displays real-time participant information with comprehensive accessibility
 * Includes user presence, activity indicators, and interaction features
 */
const ParticipantsList = ({ participants }) => {
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { user } = useUser();
  const { connected } = useSocket();

  // Local state
  const [selectedUser, setSelectedUser] = useState(null);
  const [isFocused, setIsFocused] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name', 'activity', 'joinTime'

  // Refs
  const listRef = useRef(null);
  const userRefs = useRef({});

  /**
   * Get user activity status
   */
  const getUserActivityStatus = (participant) => {
    const now = Date.now();
    const lastActivity = new Date(participant.lastActivityAt).getTime();
    const timeDiff = now - lastActivity;

    if (timeDiff < 30000) { // 30 seconds
      return { status: 'active', text: 'Active now' };
    } else if (timeDiff < 300000) { // 5 minutes
      return { status: 'recent', text: 'Active recently' };
    } else if (timeDiff < 1800000) { // 30 minutes
      return { status: 'away', text: 'Away' };
    } else {
      return { status: 'inactive', text: 'Inactive' };
    }
  };

  /**
   * Get user activity color
   */
  const getActivityColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'recent':
        return 'bg-yellow-500';
      case 'away':
        return 'bg-orange-500';
      case 'inactive':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  /**
   * Format join time
   */
  const formatJoinTime = (joinTime) => {
    const date = new Date(joinTime);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  /**
   * Sort participants
   */
  const getSortedParticipants = useCallback(() => {
    const participantsArray = Object.values(participants);
    
    return participantsArray.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.username.localeCompare(b.username);
        case 'activity':
          return new Date(b.lastActivityAt) - new Date(a.lastActivityAt);
        case 'joinTime':
          return new Date(b.joinedAt) - new Date(a.joinedAt);
        default:
          return 0;
      }
    });
  }, [participants, sortBy]);

  /**
   * Handle user selection
   */
  const handleUserSelect = useCallback((participant) => {
    setSelectedUser(selectedUser?.userId === participant.userId ? null : participant);
    
    if (screenReader) {
      const activity = getUserActivityStatus(participant);
      announce(`Selected ${participant.username}, ${activity.text}`, 'polite');
    }
  }, [selectedUser, screenReader, announce]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event) => {
    if (!keyboardNavigation || !isFocused) return;

    const participantsArray = getSortedParticipants();
    const currentIndex = selectedUser 
      ? participantsArray.findIndex(p => p.userId === selectedUser.userId)
      : -1;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, participantsArray.length - 1);
        if (participantsArray[nextIndex]) {
          handleUserSelect(participantsArray[nextIndex]);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        if (participantsArray[prevIndex]) {
          handleUserSelect(participantsArray[prevIndex]);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (selectedUser) {
          // Handle user action
          if (screenReader) {
            announce(`Action for ${selectedUser.username}`, 'polite');
          }
        }
        break;
      case 'Escape':
        event.preventDefault();
        setSelectedUser(null);
        if (screenReader) {
          announce('User selection cleared', 'polite');
        }
        break;
      default:
        // No action for this key
        break;
    }
  }, [keyboardNavigation, isFocused, selectedUser, handleUserSelect, screenReader, announce, getSortedParticipants]);

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (screenReader) {
      announce('Participants list focused', 'polite');
    }
  }, [screenReader, announce]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (screenReader) {
      announce('Participants list focus lost', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Get participants status for screen readers
   */
  const getParticipantsStatus = () => {
    const count = Object.keys(participants).length;
    const activeCount = Object.values(participants).filter(p => {
      const activity = getUserActivityStatus(p);
      return activity.status === 'active';
    }).length;
    
    return `Participants: ${count} total, ${activeCount} active. ${connected ? 'Connected' : 'Disconnected'}.`;
  };

  /**
   * Handle user interaction
   */
  const handleUserAction = (participant, action) => {
    if (screenReader) {
      announce(`${action} for ${participant.username}`, 'polite');
    }
    
    // Handle specific actions here
    switch (action) {
      case 'view-profile':
        // View user profile
        break;
      case 'send-message':
        // Send private message
        break;
      case 'mute':
        // Mute user
        break;
      case 'kick':
        // Kick user (if moderator)
        break;
      default:
        // Unknown action
        break;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Participants Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Participants
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({Object.keys(participants).length})
          </span>
        </div>

        {/* Sort Options */}
        <div className="flex items-center space-x-2">
          <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort:
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input text-sm py-1 px-2"
            aria-describedby="sort-help"
          >
            <option value="name">Name</option>
            <option value="activity">Activity</option>
            <option value="joinTime">Join Time</option>
          </select>
          <p id="sort-help" className="sr-only">
            Sort participants by
          </p>
        </div>
      </div>

      {/* Participants List */}
      <div 
        ref={listRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        role="list"
        aria-label="Participants list"
        aria-describedby="participants-help"
      >
        <button
          className="sr-only"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-label="Participants list navigation"
        >
          Navigate participants list
        </button>
        {Object.keys(participants).length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No participants yet</p>
          </div>
        ) : (
          getSortedParticipants().map((participant) => {
            const activity = getUserActivityStatus(participant);
            const isCurrentUser = participant.userId === user?.userId;
            const isSelected = selectedUser?.userId === participant.userId;

            return (
              <button
                key={participant.userId}
                ref={(el) => {
                  if (el) userRefs.current[participant.userId] = el;
                }}
                className={`
                  w-full p-3 rounded-lg border cursor-pointer transition-colors duration-200 text-left
                  ${isSelected 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                  ${isCurrentUser ? 'ring-2 ring-primary-500' : ''}
                `}
                onClick={() => handleUserSelect(participant)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleUserSelect(participant);
                  }
                }}
                aria-label={`${participant.username}, ${activity.text}${isCurrentUser ? ', you' : ''}`}
                aria-pressed={isSelected}
              >
                {/* User Info */}
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {participant.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Activity Indicator */}
                    <div 
                      className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${getActivityColor(activity.status)}`}
                      aria-label={activity.text}
                    />
                  </div>

                  {/* User Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {participant.username}
                        {isCurrentUser && (
                          <span className="text-xs text-primary-600 dark:text-primary-400 ml-1">
                            (You)
                          </span>
                        )}
                      </h4>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{activity.text}</span>
                      <span>•</span>
                      <span>Joined {formatJoinTime(participant.joinedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* User Actions (if selected) */}
                {isSelected && (
                  <div className="mt-2 flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserAction(participant, 'view-profile');
                      }}
                      className="btn btn-outline text-xs py-1 px-2"
                      aria-label={`View profile of ${participant.username}`}
                    >
                      Profile
                    </button>
                    
                    {!isCurrentUser && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUserAction(participant, 'send-message');
                        }}
                        className="btn btn-outline text-xs py-1 px-2"
                        aria-label={`Send message to ${participant.username}`}
                      >
                        Message
                      </button>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Participants Footer */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>{Object.keys(participants).length} participants</span>
          <span>
            {Object.values(participants).filter(p => {
              const activity = getUserActivityStatus(p);
              return activity.status === 'active';
            }).length} active
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
        id="participants-status"
      >
        {getParticipantsStatus()}
      </div>

      {/* Keyboard Shortcuts Help */}
      {keyboardNavigation && (
        <div className="sr-only" id="participants-keyboard-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>Arrow Up/Down: Navigate participants</li>
            <li>Enter/Space: Select participant</li>
            <li>Escape: Clear selection</li>
            <li>Tab: Navigate between elements</li>
            <li>Click: Select participant</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ParticipantsList;