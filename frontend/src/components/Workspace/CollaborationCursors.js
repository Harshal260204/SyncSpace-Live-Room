/**
 * Collaboration Cursors Component
 * 
 * Shows real-time cursors of other participants
 * Provides visual feedback for collaborative editing
 */

import React, { useState, useEffect } from 'react';

const CollaborationCursors = ({ participants, currentUserId }) => {
  const [cursors, setCursors] = useState({});

  // Update cursors when participants change
  useEffect(() => {
    const newCursors = {};
    
    Object.entries(participants).forEach(([userId, participant]) => {
      if (userId !== currentUserId && participant.cursor) {
        newCursors[userId] = {
          ...participant.cursor,
          username: participant.username,
          color: participant.color || getRandomColor(userId),
          isActive: participant.isActive || false,
        };
      }
    });

    setCursors(newCursors);
  }, [participants, currentUserId]);

  // Generate consistent color for user
  const getRandomColor = (userId) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // Get cursor position with smooth animation
  const getCursorStyle = (cursor) => {
    return {
      position: 'absolute',
      left: `${cursor.x}px`,
      top: `${cursor.y}px`,
      transform: 'translate(-2px, -2px)',
      pointerEvents: 'none',
      zIndex: 1000,
      transition: 'all 0.1s ease-out',
    };
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Object.entries(cursors).map(([userId, cursor]) => (
        <div
          key={userId}
          style={getCursorStyle(cursor)}
          className={`transition-opacity duration-300 ${
            cursor.isActive ? 'opacity-100' : 'opacity-50'
          }`}
        >
          {/* Cursor pointer */}
          <div
            className="w-4 h-4 transform rotate-45"
            style={{
              backgroundColor: cursor.color,
              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            }}
          />
          
          {/* Cursor label */}
          <div
            className="absolute top-6 left-2 px-2 py-1 rounded text-xs text-white whitespace-nowrap shadow-lg"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.username}
          </div>
          
          {/* Cursor trail */}
          {cursor.isActive && (
            <div
              className="absolute w-2 h-2 rounded-full animate-ping"
              style={{
                backgroundColor: cursor.color,
                left: '6px',
                top: '6px',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default CollaborationCursors;
