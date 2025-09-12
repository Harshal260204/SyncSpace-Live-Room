/**
 * Chat Panel Component
 * 
 * Real-time chat interface for collaborative workspace
 * Supports messages, reactions, and user presence
 */

import React, { useState, useEffect, useRef } from 'react';

const ChatPanel = ({ onSendMessage, participants, compact = false }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle message send
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage('');
      setIsTyping(false);
    }
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (value.trim()) {
      setIsTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    } else {
      setIsTyping(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Sample messages for demonstration
  useEffect(() => {
    const sampleMessages = [
      {
        id: 1,
        userId: 'user1',
        username: 'Alice',
        message: 'Welcome to the collaborative workspace!',
        timestamp: new Date(Date.now() - 300000),
        type: 'system',
      },
      {
        id: 2,
        userId: 'user2',
        username: 'Bob',
        message: 'Thanks! This looks great.',
        timestamp: new Date(Date.now() - 240000),
        type: 'user',
      },
      {
        id: 3,
        userId: 'user1',
        username: 'Alice',
        message: 'Let\'s start working on the project together.',
        timestamp: new Date(Date.now() - 180000),
        type: 'user',
      },
    ];
    setMessages(sampleMessages);
  }, []);

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-800 ${compact ? 'h-full' : 'h-full'}`}>
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          💬 Chat
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {Object.keys(participants).length} participant{Object.keys(participants).length !== 1 ? 's' : ''} online
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'system' ? 'justify-center' : 'justify-start'}`}
          >
            {msg.type === 'system' ? (
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-2 rounded-lg text-sm">
                {msg.message}
              </div>
            ) : (
              <div className="max-w-xs lg:max-w-md">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {msg.username}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 rounded-lg">
                  {msg.message}
                </div>
              </div>
            )}
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-2 rounded-lg text-sm">
              Someone is typing...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <div className="border-t border-gray-200 dark:border-gray-600 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-md transition-colors disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
