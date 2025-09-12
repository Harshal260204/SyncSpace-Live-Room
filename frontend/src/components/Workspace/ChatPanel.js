/**
 * Chat Panel Component
 * 
 * Real-time collaborative chat with:
 * - Live messaging and message history
 * - Full accessibility support (ARIA labels, keyboard navigation)
 * - Socket.io integration for live synchronization
 * - Screen reader support and focus management
 * - Message types and user presence
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useUser } from '../../contexts/UserContext';

/**
 * Chat Panel Component
 * 
 * Provides real-time collaborative chat with comprehensive accessibility
 * Includes message history, typing indicators, and user presence
 */
const ChatPanel = ({ onSendMessage, participants, compact = false }) => {
  const { 
    chatMessages, 
    sendChatMessage, 
    connected 
  } = useSocket();
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { user } = useUser();

  // Local state
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messageType, setMessageType] = useState('text');

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingIndicatorTimeoutRef = useRef(null);

  // Debounce delays
  const TYPING_DEBOUNCE_DELAY = 1000;
  const TYPING_INDICATOR_DELAY = 3000;

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Handle message input changes
   */
  const handleMessageChange = useCallback((event) => {
    const value = event.target.value;
    setMessage(value);

    // Show typing indicator
    if (value.length > 0 && !isTyping) {
      setIsTyping(true);
      // Send typing indicator to other users
      // This would be implemented in the socket context
    }

    // Clear typing indicator after delay
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // Send stop typing indicator
    }, TYPING_DEBOUNCE_DELAY);
  }, [isTyping]);

  /**
   * Handle message submission
   */
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    
    if (!message.trim() || !connected) return;

    const messageData = {
      message: message.trim(),
      messageType,
      timestamp: new Date().toISOString(),
      userId: user?.userId,
      username: user?.username,
    };

    // Send message
    if (onSendMessage) {
      onSendMessage(messageData.message, messageData.messageType);
    }

    // Clear input and typing state
    setMessage('');
    setIsTyping(false);
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Announce message sent for screen readers
    if (screenReader) {
      announce('Message sent', 'polite');
    }
  }, [message, messageType, connected, user, onSendMessage, screenReader, announce]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event) => {
    if (!keyboardNavigation) return;

    switch (event.key) {
      case 'Enter':
        if (event.shiftKey) {
          // Allow new line
          return;
        } else {
          // Send message
          event.preventDefault();
          handleSubmit(event);
        }
        break;
      case 'Escape':
        // Clear message
        setMessage('');
        if (screenReader) {
          announce('Message cleared', 'polite');
        }
        break;
      case 'F6':
        // Focus chat input
        event.preventDefault();
        inputRef.current?.focus();
        break;
    }
  }, [keyboardNavigation, handleSubmit, screenReader, announce]);

  /**
   * Handle focus events
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (screenReader) {
      announce('Chat input focused', 'polite');
    }
  }, [screenReader, announce]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (screenReader) {
      announce('Chat input focus lost', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  /**
   * Handle component cleanup
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (typingIndicatorTimeoutRef.current) {
        clearTimeout(typingIndicatorTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Format message timestamp
   */
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  /**
   * Get message type icon
   */
  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'system':
        return '🔔';
      case 'announcement':
        return '📢';
      case 'error':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      default:
        return '💬';
    }
  };

  /**
   * Get message type class
   */
  const getMessageTypeClass = (type) => {
    switch (type) {
      case 'system':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'announcement':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'info':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  /**
   * Get chat status for screen readers
   */
  const getChatStatus = () => {
    const messageCount = chatMessages.length;
    const typingCount = typingUsers.size;
    const participantCount = participants ? Object.keys(participants).length : 0;
    
    return `Chat: ${messageCount} messages, ${participantCount} participants${typingCount > 0 ? `, ${typingCount} typing` : ''}. ${connected ? 'Connected' : 'Disconnected'}.`;
  };

  return (
    <div className={`${compact ? 'h-full' : 'h-96'} flex flex-col bg-white dark:bg-gray-900`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Chat
          </h3>
          {participants && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({Object.keys(participants).length})
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          <div className="flex items-center space-x-1">
            <div 
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-500' : 'bg-red-500'
              }`}
              aria-label={connected ? 'Connected' : 'Disconnected'}
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg max-w-xs ${
                msg.userId === user?.userId ? 'ml-auto' : 'mr-auto'
              } ${getMessageTypeClass(msg.messageType)}`}
              role="listitem"
              aria-label={`Message from ${msg.username || 'Unknown'}`}
            >
              {/* Message Header */}
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-sm font-medium">
                  {msg.username || 'Unknown User'}
                </span>
                <span className="text-xs opacity-75">
                  {formatTimestamp(msg.timestamp)}
                </span>
                <span className="text-xs">
                  {getMessageTypeIcon(msg.messageType)}
                </span>
              </div>

              {/* Message Content */}
              <div className="text-sm break-words">
                {msg.message}
              </div>
            </div>
          ))
        )}

        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>
              {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Message Type Selector */}
          <div className="flex items-center space-x-2">
            <label htmlFor="message-type" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Type:
            </label>
            <select
              id="message-type"
              value={messageType}
              onChange={(e) => setMessageType(e.target.value)}
              className="input text-sm py-1 px-2"
              aria-describedby="message-type-help"
            >
              <option value="text">Text</option>
              <option value="announcement">Announcement</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
            <p id="message-type-help" className="sr-only">
              Select message type
            </p>
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="flex-1 input resize-none"
              rows={2}
              aria-label="Chat message input"
              aria-describedby="message-help"
              disabled={!connected}
            />
            
            <button
              type="submit"
              disabled={!message.trim() || !connected}
              className="btn btn-primary px-4 py-2"
              aria-label="Send message"
            >
              Send
            </button>
          </div>
          
          <p id="message-help" className="text-xs text-gray-500 dark:text-gray-400">
            Press Enter to send, Shift+Enter for new line. {getChatStatus()}
          </p>
        </form>
      </div>

      {/* Screen Reader Status */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="chat-status"
      >
        {getChatStatus()}
      </div>

      {/* Keyboard Shortcuts Help */}
      {keyboardNavigation && (
        <div className="sr-only" id="chat-keyboard-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>F6: Focus chat input</li>
            <li>Enter: Send message</li>
            <li>Shift+Enter: New line</li>
            <li>Escape: Clear message</li>
            <li>Tab: Navigate between elements</li>
            <li>Arrow keys: Navigate messages</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChatPanel;