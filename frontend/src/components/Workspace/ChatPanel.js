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

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useSocket } from '../../contexts/SocketContext';
import { useUser } from '../../contexts/UserContext';

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
  isVisible = true 
}) => {
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { socket, connected, sendEvent } = useSocket();
  const { user } = useUser();

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Activity feed state
  const [activities, setActivities] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityFilter, setActivityFilter] = useState('all'); // all, messages, joins, leaves, drawing, typing

  // Notification state
  const [notifications, setNotifications] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMessages, setFilteredMessages] = useState([]);

  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  const audioContextRef = useRef(null);

  // Constants
  const TYPING_TIMEOUT = 3000; // 3 seconds
  const NOTIFICATION_DURATION = 5000; // 5 seconds
  const MAX_MESSAGES = 1000; // Maximum messages to keep in memory
  const MAX_ACTIVITIES = 500; // Maximum activities to keep in memory

  /**
   * Initialize chat from room data
   */
  useEffect(() => {
    if (roomData?.chat) {
      setMessages(roomData.chat);
    }
  }, [roomData?.chat]);

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
   * Filter messages based on search term
   */
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredMessages(messages);
    } else {
      const filtered = messages.filter(message =>
        message.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  }, [messages, searchTerm]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /**
   * Handle new message
   */
  const handleNewMessage = useCallback((messageData) => {
    const newMessage = {
      id: messageData.id || `msg-${Date.now()}-${Math.random()}`,
      text: messageData.text,
      username: messageData.username,
      userId: messageData.userId,
      timestamp: messageData.timestamp || Date.now(),
      type: messageData.type || 'message',
      color: messageData.color || '#000000'
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      return updated.slice(-MAX_MESSAGES); // Keep only last MAX_MESSAGES
    });

    // Add to activity feed
    addActivity({
      type: 'message',
      description: `${messageData.username} sent a message`,
      details: messageData.text,
      timestamp: Date.now(),
      userId: messageData.userId,
      username: messageData.username
    });

    // Show notification if not focused or from other user
    if (!isFocused || messageData.userId !== user?.userId) {
      showNotification({
        type: 'message',
        title: 'New Message',
        message: `${messageData.username}: ${messageData.text}`,
        duration: NOTIFICATION_DURATION
      });
    }

    // Announce to screen readers
    if (screenReader) {
      announce(`New message from ${messageData.username}: ${messageData.text}`, 'polite');
    }
  }, [isFocused, user, screenReader, announce]);

  /**
   * Handle user join
   */
  const handleUserJoin = useCallback((userData) => {
    const activity = {
      type: 'join',
      description: `${userData.username} joined the room`,
      details: `User joined at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      userId: userData.userId,
      username: userData.username
    };

    addActivity(activity);

    // Show notification
    if (notificationSettings.joinLeaveEnabled) {
      showNotification({
        type: 'join',
        title: 'User Joined',
        message: `${userData.username} joined the room`,
        duration: NOTIFICATION_DURATION
      });
    }

    // Announce to screen readers
    if (screenReader) {
      announce(`${userData.username} joined the room`, 'polite');
    }

    // Play join sound
    if (notificationSettings.soundEnabled) {
      playNotificationSound('join');
    }
  }, [notificationSettings, screenReader, announce]);

  /**
   * Handle user leave
   */
  const handleUserLeave = useCallback((userData) => {
    const activity = {
      type: 'leave',
      description: `${userData.username} left the room`,
      details: `User left at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      userId: userData.userId,
      username: userData.username
    };

    addActivity(activity);

    // Show notification
    if (notificationSettings.joinLeaveEnabled) {
      showNotification({
        type: 'leave',
        title: 'User Left',
        message: `${userData.username} left the room`,
        duration: NOTIFICATION_DURATION
      });
    }

    // Announce to screen readers
    if (screenReader) {
      announce(`${userData.username} left the room`, 'polite');
    }

    // Play leave sound
    if (notificationSettings.soundEnabled) {
      playNotificationSound('leave');
    }
  }, [notificationSettings, screenReader, announce]);

  /**
   * Handle typing start
   */
  const handleTypingStart = useCallback((userData) => {
    setTypingUsers(prev => ({
      ...prev,
      [userData.userId]: {
        username: userData.username,
        timestamp: Date.now()
      }
    }));

    // Add to activity feed
    addActivity({
      type: 'typing',
      description: `${userData.username} is typing`,
      details: `Started typing at ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      userId: userData.userId,
      username: userData.username
    });

    // Show notification if enabled
    if (notificationSettings.typingEnabled && userData.userId !== user?.userId) {
      showNotification({
        type: 'typing',
        title: 'User Typing',
        message: `${userData.username} is typing...`,
        duration: 2000
      });
    }
  }, [notificationSettings, user]);

  /**
   * Handle typing stop
   */
  const handleTypingStop = useCallback((userData) => {
    setTypingUsers(prev => {
      const newTypingUsers = { ...prev };
      delete newTypingUsers[userData.userId];
      return newTypingUsers;
    });
  }, []);

  /**
   * Handle drawing event
   */
  const handleDrawingEvent = useCallback((eventData) => {
    const activity = {
      type: 'drawing',
      description: `${eventData.username} drew something`,
      details: `Used ${eventData.tool} tool`,
      timestamp: Date.now(),
      userId: eventData.userId,
      username: eventData.username
    };

    addActivity(activity);

    // Show notification if enabled
    if (notificationSettings.drawingEnabled && eventData.userId !== user?.userId) {
      showNotification({
        type: 'drawing',
        title: 'Drawing Activity',
        message: `${eventData.username} drew something`,
        duration: NOTIFICATION_DURATION
      });
    }

    // Announce to screen readers
    if (screenReader) {
      announce(`${eventData.username} drew something`, 'polite');
    }
  }, [notificationSettings, user, screenReader, announce]);

  /**
   * Add activity to feed
   */
  const addActivity = useCallback((activity) => {
    setActivities(prev => {
      const updated = [...prev, activity];
      return updated.slice(-MAX_ACTIVITIES); // Keep only last MAX_ACTIVITIES
    });

    setRecentActivities(prev => {
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
   * Play notification sound
   */
  const playNotificationSound = useCallback((type) => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies for different notification types
    const frequencies = {
      message: [800, 600],
      join: [1000, 800, 600],
      leave: [600, 400, 200],
      typing: [400],
      drawing: [1200, 1000]
    };

    const freq = frequencies[type] || [800];
    let currentTime = audioContext.currentTime;

    freq.forEach((frequency, index) => {
      oscillator.frequency.setValueAtTime(frequency, currentTime);
      gainNode.gain.setValueAtTime(0.1, currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.2);
      currentTime += 0.2;
    });

    oscillator.start();
    oscillator.stop(currentTime);
  }, []);

  /**
   * Send message
   */
  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !connected || !sendEvent) return;

    const messageData = {
      id: `msg-${Date.now()}-${Math.random()}`,
      text: newMessage.trim(),
      username: user?.username || 'Anonymous',
      userId: user?.userId,
      timestamp: Date.now(),
      type: 'message',
      color: user?.preferences?.cursorColor || '#000000'
    };

    // Send to server
    sendEvent('chat-message', {
      roomId,
      message: messageData
    });

    // Add to local messages immediately
    handleNewMessage(messageData);

    // Clear input
    setNewMessage('');

    // Stop typing indicator
    setIsTyping(false);
    if (sendEvent) {
      sendEvent('typing-stop', {
        roomId,
        userId: user?.userId
      });
    }
  }, [newMessage, connected, sendEvent, user, roomId, handleNewMessage]);

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
  }, []);

  /**
   * Handle blur
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  /**
   * Filter activities
   */
  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return activities;
    return activities.filter(activity => activity.type === activityFilter);
  }, [activities, activityFilter]);

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
          <p className="text-sm">{message.text}</p>
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
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
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
        className="flex-1 overflow-y-auto p-3 space-y-2"
        onFocus={handleFocus}
        onBlur={handleBlur}
        tabIndex={0}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {filteredMessages.map(renderMessage)}
        {renderTypingIndicator()}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
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
        </div>
      </div>

      {/* Notifications */}
      {notifications.map(renderNotification)}

      {/* Screen Reader Status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {unreadCount > 0 && `${unreadCount} unread messages`}
        {Object.keys(typingUsers).length > 0 && `${Object.keys(typingUsers).length} users typing`}
      </div>
    </div>
  );
};

export default ChatPanel;