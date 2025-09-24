/**
 * Chat Panel Component
 * 
 * Real-time chat with:
 * - Accessible notifications for new messages
 * - Visual alerts that duplicate audio cues
 * - Live user activity feed and presence indicators
 * - ARIA attributes for dynamic announcements
 * - Focus management and keyboard navigation
 * - Real-time typing indicators
 * - Message history and search
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useSocket } from '../../contexts/SocketContext';
import { useUser } from '../../contexts/UserContext';
import { useBlindMode } from '../../contexts/BlindModeContext';

/**
 * Chat Panel Component
 * 
 * Provides real-time chat functionality with comprehensive accessibility
 * Includes notifications, activity feed, and presence indicators
 */
const ChatPanel = ({ 
  roomId, 
  roomData, 
  participants, 
  onRoomUpdate,
  onSendMessage,
  compact = false,
  isVisible = true 
}) => {
  const { announce, screenReader } = useAccessibility();
  const { connected, sendEvent, chatMessages, sendChatMessage } = useSocket();
  const { user } = useUser();
  const { enabled: blindModeEnabled, announceToScreenReader } = useBlindMode();

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Activity feed state
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityFilter, setActivityFilter] = useState('all'); // all, messages, joins, leaves, drawing, typing

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [notificationSettings] = useState({
    soundEnabled: true,
    visualEnabled: true,
    joinLeaveEnabled: true,
    typingEnabled: true,
    drawingEnabled: true,
    messageEnabled: true
  });

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(true);
  const [filteredMessages, setFilteredMessages] = useState([]);
  
  // Blind Mode state
  const [lastMessage, setLastMessage] = useState(null);
  const [currentAnnouncement, setCurrentAnnouncement] = useState(null);

  // Refs with proper cleanup
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);
  const announcementTimeoutRef = useRef(null);
  const lastReadRef = useRef(Date.now());
  const cleanupRefs = useRef([]);

  // Constants
  const TYPING_TIMEOUT = 3000; // 3 seconds
  const NOTIFICATION_DURATION = 5000; // 5 seconds
  const MAX_MESSAGES = 1000; // Maximum messages to keep in memory

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    // Clear all timeouts
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
      announcementTimeoutRef.current = null;
    }
    
    // Clear all cleanup refs
    cleanupRefs.current.forEach(cleanup => {
      if (cleanup) {
        cleanup();
      }
    });
    cleanupRefs.current = [];
    
    // Clear audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * Announce message for Blind Mode
   * 
   * @param {Object} messageData - Message data
   * @param {string} type - Announcement type (message, join, leave, typing)
   */
  const announceForBlindMode = useCallback((messageData, type = 'message') => {
    if (!blindModeEnabled) return;
    
    let announcement = '';
    
    switch (type) {
      case 'message':
        announcement = `Message from ${messageData.username}: ${messageData.text}`;
        break;
      case 'join':
        announcement = `${messageData.username} joined the room`;
        break;
      case 'leave':
        announcement = `${messageData.username} left the room`;
        break;
      case 'typing':
        announcement = `${messageData.username} is typing`;
        break;
      default:
        announcement = `${messageData.username}: ${messageData.text || messageData.description}`;
    }
    
    // Clear any existing announcement
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
    
    // Set new announcement
    setCurrentAnnouncement(announcement);
    
    // Announce the message
    announceToScreenReader(announcement);
    
    // Update message history
    if (type === 'message') {
      setLastMessage(messageData);
    }
    
    // Clear announcement after a delay
    announcementTimeoutRef.current = setTimeout(() => {
      setCurrentAnnouncement(null);
    }, 3000);
  }, [blindModeEnabled, announceToScreenReader]);

  /**
   * Initialize chat from room data and socket context
   */
  useEffect(() => {
    if (roomData?.chat) {
      setMessages(roomData.chat);
    }
  }, [roomData?.chat]);

  /**
   * Add activity to feed
   */
  const addActivity = useCallback((activity) => {
    setRecentActivities(prev => {
      // Check if this activity already exists to prevent duplicates
      const exists = prev.some(existing => 
        existing.type === activity.type &&
        existing.userId === activity.userId &&
        existing.timestamp === activity.timestamp
      );
      
      if (exists) {
        return prev;
      }
      
      const updated = [...prev, activity];
      return updated.slice(-10); // Keep only last 10 for recent activities
    });
  }, []);

  /**
   * Show notification
   */
  const showNotification = useCallback((notification) => {
    const notificationId = `notif-${Date.now()}-${Math.random()}`;
    const newNotification = {
      ...notification,
      id: notificationId,
      timestamp: Date.now()
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, notification.duration || NOTIFICATION_DURATION);
  }, []);

  /**
   * Update messages from socket context
   */
  useEffect(() => {
    if (chatMessages && chatMessages.length > 0) {
      // Only process if we have new messages
      const previousMessageCount = messages.length;
      const currentMessageCount = chatMessages.length;
      
      setMessages(chatMessages);
      
      // Only handle notifications for truly new messages
      if (currentMessageCount > previousMessageCount) {
        const newMessages = chatMessages.slice(previousMessageCount);
        
        newMessages.forEach(newMessage => {
          if (newMessage.userId !== user?.userId) {
            // Add to activity feed
            addActivity({
              type: 'message',
              description: `${newMessage.username} sent a message`,
              details: newMessage.text || newMessage.message,
              timestamp: Date.now(),
              userId: newMessage.userId,
              username: newMessage.username
            });

            // Show notification if not focused
            if (!isFocused) {
              showNotification({
                type: 'message',
                title: 'New Message',
                message: `${newMessage.username}: ${newMessage.text || newMessage.message}`,
                duration: NOTIFICATION_DURATION
              });
            }

            // Announce for Blind Mode
            announceForBlindMode(newMessage, 'message');

            // Announce to screen readers (fallback)
            if (screenReader && !blindModeEnabled) {
              announce(`New message from ${newMessage.username}: ${newMessage.text || newMessage.message}`, 'polite');
            }
          }
        });
      }
      
      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [chatMessages, user?.userId, isFocused, addActivity, showNotification, announceForBlindMode, screenReader, announce, blindModeEnabled, messages.length]);


  /**
   * Handle socket events for typing indicators
   */
  useEffect(() => {
    if (!connected || !sendEvent) return;

    const handleTypingStart = (data) => {
      if (data.userId !== user?.userId) {
        setTypingUsers(prev => ({
          ...prev,
          [data.userId]: {
            username: data.username,
            timestamp: Date.now()
          }
        }));
      }
    };

    const handleTypingStop = (data) => {
      if (data.userId !== user?.userId) {
        setTypingUsers(prev => {
          const newTypingUsers = { ...prev };
          delete newTypingUsers[data.userId];
          return newTypingUsers;
        });
      }
    };

    // Note: Socket events are handled by SocketContext
    // This is just for local typing state management
    
    return () => {
      // Cleanup if needed
    };
  }, [connected, sendEvent, user?.userId]);






  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((e) => {
    // Ctrl+Shift+M: Read last message
    if (e.ctrlKey && e.shiftKey && e.key === 'm') {
      e.preventDefault();
      if (blindModeEnabled && lastMessage) {
        announceToScreenReader(`Last message: ${lastMessage.username}: ${lastMessage.text}`);
      } else if (blindModeEnabled) {
        announceToScreenReader('No recent messages to announce');
      }
    }
  }, [blindModeEnabled, lastMessage, announceToScreenReader]);

  /**
   * Add keyboard event listener for shortcuts
   */
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Initialize audio context for notifications
   */
  useEffect(() => {
    if (notificationSettings.soundEnabled) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn('Audio context not supported:', error);
      }
    }
  }, [notificationSettings.soundEnabled]);

  /**
   * Update filtered messages when messages change
   */
  useEffect(() => {
    setFilteredMessages(messages);
  }, [messages]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);





  /**
   * Send message
   */
  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !connected) return;

    const messageText = newMessage.trim();
    
    // Clear input first
    setNewMessage('');

    // Use onSendMessage prop if provided, otherwise use SocketContext
    if (onSendMessage) {
      onSendMessage(messageText, 'text');
    } else {
      sendChatMessage(messageText, 'text');
    }

    // Stop typing indicator
    setIsTyping(false);
    if (sendEvent) {
      sendEvent('typing-stop', {
        roomId,
        userId: user?.userId
      });
    }
  }, [newMessage, connected, onSendMessage, sendChatMessage, sendEvent, user, roomId]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e) => {
    setNewMessage(e.target.value);

    // Start typing indicator
    if (!isTyping && connected && sendEvent) {
      setIsTyping(true);
      sendEvent('typing-start', {
        roomId,
        userId: user?.userId,
        username: user?.username
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (sendEvent) {
        sendEvent('typing-stop', {
          roomId,
          userId: user?.userId
        });
      }
    }, TYPING_TIMEOUT);
  }, [isTyping, connected, sendEvent, user, roomId]);

  /**
   * Handle key press
   */
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  /**
   * Handle focus
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setUnreadCount(0);
    lastReadRef.current = Date.now();
  }, []);

  /**
   * Handle blur
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  /**
   * Update unread count when messages change
   */
  useEffect(() => {
    if (!isFocused && messages.length > 0) {
      const unreadMessages = messages.filter(msg => 
        msg.userId !== user?.userId && 
        msg.timestamp > (lastReadRef.current || 0)
      );
      setUnreadCount(unreadMessages.length);
    } else if (isFocused) {
      // Reset unread count when focused
      setUnreadCount(0);
    }
  }, [messages, isFocused, user?.userId]);


  /**
   * Render message
   */
  const renderMessage = useCallback((message) => {
    const isOwnMessage = message.userId === user?.userId;
    const messageTime = new Date(message.timestamp).toLocaleTimeString();

    return (
      <div
        key={message.id}
        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-2`}
        role="listitem"
      >
        <div
          className={`max-w-xs px-3 py-2 rounded-lg ${
            isOwnMessage
              ? 'bg-primary-500 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
          }`}
          style={isOwnMessage ? {} : { borderLeft: `4px solid ${message.color}` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium opacity-75">
              {message.username}
            </span>
            <span className="text-xs opacity-75">
              {messageTime}
            </span>
          </div>
          <p className="text-sm">{message.text || message.message}</p>
        </div>
      </div>
    );
  }, [user]);

  /**
   * Render typing indicator
   */
  const renderTypingIndicator = useCallback(() => {
    const typingUsersList = Object.values(typingUsers);
    if (typingUsersList.length === 0) return null;

    return (
      <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {typingUsersList.map((typingUser, index) => (
            <span key={typingUser.username}>
              {typingUser.username} is typing
              {index < typingUsersList.length - 1 ? ', ' : ''}
            </span>
          ))}
        </span>
      </div>
    );
  }, [typingUsers]);

  /**
   * Render activity item
   */
  const renderActivityItem = useCallback((activity) => {
    const activityTime = new Date(activity.timestamp).toLocaleTimeString();
    const activityIcons = {
      message: '💬',
      join: '👋',
      leave: '👋',
      typing: '⌨️',
      drawing: '🎨'
    };

    return (
      <div
        key={`${activity.timestamp}-${activity.userId}`}
        className="flex items-start space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
        role="listitem"
      >
        <span className="text-sm">{activityIcons[activity.type] || '📝'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-gray-100">
            {activity.description}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {activityTime}
          </p>
        </div>
      </div>
    );
  }, []);

  /**
   * Render notification
   */
  const renderNotification = useCallback((notification) => {
    const notificationIcons = {
      message: '💬',
      join: '👋',
      leave: '👋',
      typing: '⌨️',
      drawing: '🎨'
    };

    return (
      <div
        key={notification.id}
        className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm z-50"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start space-x-2">
          <span className="text-lg">{notificationIcons[notification.type] || '📝'}</span>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {notification.message}
            </p>
          </div>
        </div>
      </div>
    );
  }, []);

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 min-h-0">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Chat
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowActivityFeed(!showActivityFeed)}
            className="btn btn-sm btn-outline"
            aria-label="Toggle activity feed"
            title="Toggle activity feed"
          >
            📊
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn btn-sm btn-outline"
            aria-label="Notification settings"
            title="Notification settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Activity Feed */}
      {showActivityFeed && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="p-2 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Recent Activity
              </h3>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                aria-label="Filter activities"
              >
                <option value="all">All</option>
                <option value="message">Messages</option>
                <option value="join">Joins</option>
                <option value="leave">Leaves</option>
                <option value="typing">Typing</option>
                <option value="drawing">Drawing</option>
              </select>
            </div>
            <div className="max-h-32 overflow-y-auto">
              {recentActivities.slice(-5).map(renderActivityItem)}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0"
        onFocus={handleFocus}
        onBlur={handleBlur}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {filteredMessages.map(renderMessage)}
        {renderTypingIndicator()}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer - Message Input and Status */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
        {/* Message Input */}
        <div className="p-3">
          <div className="flex space-x-2">
            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100"
              aria-label="Message input"
              aria-describedby="message-help"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !connected}
              className="btn btn-primary"
              aria-label="Send message"
              title="Send message (Enter)"
            >
              Send
            </button>
          </div>
          <div id="message-help" className="sr-only">
            Press Enter to send message, Shift+Enter for new line
            {blindModeEnabled && (
              <span>Press Ctrl+Shift+M to read last message</span>
            )}
          </div>
        </div>

        {/* Notifications */}
        {notifications.map(renderNotification)}

        {/* Screen Reader Status */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {unreadCount > 0 && `${unreadCount} unread messages`}
          {Object.keys(typingUsers).length > 0 && `${Object.keys(typingUsers).length} users typing`}
        </div>

        {/* Blind Mode Announcements */}
        {blindModeEnabled && (
          <div 
            className="sr-only" 
            aria-live="polite" 
            aria-atomic="true"
            id="chat-announcements"
            role="status"
            aria-label="Chat announcements"
          >
            {currentAnnouncement && (
              <span key={Date.now()}>
                {currentAnnouncement}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;