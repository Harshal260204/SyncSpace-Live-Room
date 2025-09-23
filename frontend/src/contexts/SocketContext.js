/**
 * Socket Context
 * 
 * Provides Socket.io client management with robust connection handling,
 * event management, and real-time collaboration features
 */

import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// Socket context
const SocketContext = createContext();

// Socket reducer for state management
const socketReducer = (state, action) => {
  switch (action.type) {
    case 'CONNECT':
      return {
        ...state,
        connected: true,
        connecting: false,
        error: null,
      };
    case 'DISCONNECT':
      return {
        ...state,
        connected: false,
        connecting: false,
        error: null,
      };
    case 'CONNECTING':
      return {
        ...state,
        connecting: true,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        connecting: false,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_ROOM':
      return {
        ...state,
        currentRoom: action.payload,
      };
    case 'CLEAR_ROOM':
      return {
        ...state,
        currentRoom: null,
      };
    case 'ADD_PARTICIPANT':
      return {
        ...state,
        participants: {
          ...state.participants,
          [action.payload.userId]: action.payload,
        },
      };
    case 'REMOVE_PARTICIPANT':
      const newParticipants = { ...state.participants };
      delete newParticipants[action.payload.userId];
      return {
        ...state,
        participants: newParticipants,
      };
    case 'UPDATE_PARTICIPANT':
      return {
        ...state,
        participants: {
          ...state.participants,
          [action.payload.userId]: {
            ...state.participants[action.payload.userId],
            ...action.payload,
          },
        },
      };
    case 'SET_ROOM_DATA':
      return {
        ...state,
        roomData: action.payload,
      };
    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload].slice(-100), // Keep last 100 messages
      };
    case 'CLEAR_CHAT_MESSAGES':
      return {
        ...state,
        chatMessages: [],
      };
    case 'SET_CODE_CONTENT':
      return {
        ...state,
        codeContent: action.payload.content,
        codeLanguage: action.payload.language,
        codeMetadata: action.payload.metadata || null,
      };
    case 'SET_NOTES_CONTENT':
      return {
        ...state,
        notesContent: typeof action.payload === 'string' ? action.payload : action.payload.content,
        notesMetadata: typeof action.payload === 'object' ? action.payload.metadata : null,
      };
    case 'SET_CANVAS_DATA':
      return {
        ...state,
        canvasData: action.payload,
      };
    default:
      return state;
  }
};

// Initial socket state
const initialState = {
  connected: false,
  connecting: false,
  error: null,
  currentRoom: null,
  participants: {},
  roomData: null,
  chatMessages: [],
  codeContent: '',
  codeLanguage: 'javascript',
  codeMetadata: null,
  notesContent: '',
  notesMetadata: null,
  canvasData: {},
};

/**
 * Socket Provider Component
 * 
 * Wraps the application to provide socket context
 * Handles Socket.io connection and real-time events
 */
export const SocketProvider = ({ children }) => {
  const [state, dispatch] = useReducer(socketReducer, initialState);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const cleanupRefs = useRef([]);
  const maxReconnectAttempts = 5;

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear all cleanup refs
    cleanupRefs.current.forEach(cleanup => {
      if (cleanup) {
        cleanup();
      }
    });
    cleanupRefs.current = [];
    
    // Remove all socket event listeners and disconnect
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    // Reset state
    dispatch({ type: 'DISCONNECT' });
  }, []);

  // Attach event handlers to socket
  const attachEventHandlers = useCallback(() => {
    if (!socketRef.current) return;

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('Socket connected successfully');
      dispatch({ type: 'CONNECT' });
      reconnectAttempts.current = 0;
      
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      dispatch({ type: 'DISCONNECT' });
      
      // Show reconnection message for unexpected disconnections
      if (reason !== 'io client disconnect') {
        toast.error('Connection lost. Attempting to reconnect...');
      }
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: error.message || 'Failed to connect to server',
      });
      
      reconnectAttempts.current++;
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        toast.error('Unable to connect to server. Please check your connection and try refreshing the page.');
      }
    });

    // Room event handlers
    socketRef.current.on('roomJoined', (data) => {
      console.log('🎉 roomJoined event received:', data);
      dispatch({ type: 'SET_ROOM', payload: data.roomId });
      dispatch({ type: 'SET_ROOM_DATA', payload: data });
      
      // Update participants
      if (data.participants) {
        data.participants.forEach(participant => {
          dispatch({
            type: 'ADD_PARTICIPANT',
            payload: participant,
          });
        });
      }
      
      // Update collaboration content
      if (data.codeContent) {
        dispatch({
          type: 'SET_CODE_CONTENT',
          payload: {
            content: data.codeContent,
            language: data.codeLanguage || 'javascript',
          },
        });
      }
      
      if (data.notesContent) {
        dispatch({ type: 'SET_NOTES_CONTENT', payload: data.notesContent });
      }
      
      if (data.canvasData) {
        dispatch({ type: 'SET_CANVAS_DATA', payload: data.canvasData });
      }
      
      toast.success(`Joined room: ${data.roomName}`);
    });

    socketRef.current.on('userJoined', (data) => {
      dispatch({
        type: 'ADD_PARTICIPANT',
        payload: data,
      });
      
      toast.success(`${data.username} joined the room`);
    });

    socketRef.current.on('userLeft', (data) => {
      dispatch({
        type: 'REMOVE_PARTICIPANT',
        payload: { userId: data.userId },
      });
      
      toast.success(`${data.username} left the room`);
    });

    socketRef.current.on('userDisconnected', (data) => {
      dispatch({
        type: 'REMOVE_PARTICIPANT',
        payload: { userId: data.userId },
      });
      
      toast.success(`${data.username} disconnected`);
    });

    // Collaboration event handlers
    socketRef.current.on('code-changed', (data) => {
      dispatch({
        type: 'SET_CODE_CONTENT',
        payload: {
          content: data.content,
          language: data.language,
          metadata: data.metadata, // Include metadata for Blind Mode
        },
      });
    });

    socketRef.current.on('note-changed', (data) => {
      dispatch({
        type: 'SET_NOTES_CONTENT',
        payload: {
          content: data.content,
          metadata: data.metadata, // Include metadata for Blind Mode
        },
      });
    });

    socketRef.current.on('drawing-updated', (data) => {
      dispatch({
        type: 'SET_CANVAS_DATA',
        payload: data.drawingData,
      });
    });

    socketRef.current.on('chat-message', (data) => {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: data,
      });
    });

    socketRef.current.on('chatHistory', (messages) => {
      dispatch({
        type: 'CLEAR_CHAT_MESSAGES',
      });
      messages.forEach(message => {
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          payload: message,
        });
      });
    });

    socketRef.current.on('presence-updated', (data) => {
      dispatch({
        type: 'UPDATE_PARTICIPANT',
        payload: data,
      });
    });

    // Error handling
    socketRef.current.on('error', (error) => {
      toast.error(error.message || 'An error occurred');
    });

    // Pong response for health checks
    socketRef.current.on('pong', (data) => {
      // Health check response received
    });
  }, [dispatch]);

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = () => {
      try {
        const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
        console.log('Connecting to server:', serverUrl);
        
        socketRef.current = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        // Attach event handlers
        attachEventHandlers();

      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to initialize connection',
        });
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return cleanup;
  }, [attachEventHandlers, cleanup]);

  // Socket connection methods
  const connect = useCallback(() => {
    if (!socketRef.current) {
      // Reinitialize socket if it doesn't exist
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
      socketRef.current = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
      
      // Re-attach event handlers
      attachEventHandlers();
    }
    
    if (!state.connected && !state.connecting) {
      dispatch({ type: 'CONNECTING' });
      socketRef.current.connect();
    }
  }, [state.connected, state.connecting, attachEventHandlers]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  // Room management methods
  const joinRoom = useCallback((roomId, username, preferences = {}) => {
    console.log('📡 joinRoom called:', { roomId, username, connected: state.connected, socketExists: !!socketRef.current });
    if (socketRef.current && state.connected) {
      socketRef.current.emit('joinRoom', {
        roomId,
        username,
        preferences,
      });
      console.log('📡 joinRoom event emitted');
    } else {
      console.log('❌ Cannot join room - not connected or socket not available');
      toast.error('Not connected to server');
    }
  }, [state.connected]);

  const leaveRoom = useCallback(() => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('leaveRoom');
      dispatch({ type: 'CLEAR_ROOM' });
      dispatch({ type: 'CLEAR_CHAT_MESSAGES' });
    }
  }, [state.currentRoom]);

  // Collaboration methods
  const sendCodeChange = useCallback((content, language, cursorPosition) => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('code-change', {
        content,
        language,
        cursorPosition,
      });
    }
  }, [state.currentRoom]);

  const sendNoteChange = useCallback((content) => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('note-change', {
        content,
      });
    }
  }, [state.currentRoom]);

  const sendDrawingEvent = useCallback((drawingData, action) => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('draw-event', {
        drawingData,
        action,
      });
    }
  }, [state.currentRoom]);

  const sendChatMessage = useCallback((message, messageType = 'text') => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('chat-message', {
        message,
        messageType,
      });
    }
  }, [state.currentRoom]);

  const sendPresenceUpdate = useCallback((cursorPosition, isActive = true) => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('presence-update', {
        cursorPosition,
        isActive,
      });
    }
  }, [state.currentRoom]);

  // Health check
  const ping = useCallback(() => {
    if (socketRef.current && state.connected) {
      socketRef.current.emit('ping');
    }
  }, [state.connected]);

  // Socket context value
  const value = {
    // Socket state
    connected: state.connected,
    connecting: state.connecting,
    error: state.error,
    currentRoom: state.currentRoom,
    participants: state.participants,
    roomData: state.roomData,
    chatMessages: state.chatMessages,
    codeContent: state.codeContent,
    codeLanguage: state.codeLanguage,
    codeMetadata: state.codeMetadata,
    notesContent: state.notesContent,
    notesMetadata: state.notesMetadata,
    canvasData: state.canvasData,
    
    // Socket actions
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    
    // Collaboration actions
    sendCodeChange,
    sendNoteChange,
    sendDrawingEvent,
    sendChatMessage,
    sendPresenceUpdate,
    ping,
    
    // Utility methods
    getParticipantCount: () => Object.keys(state.participants).length,
    getParticipant: (userId) => state.participants[userId],
    isInRoom: () => !!state.currentRoom,
    clearError: () => dispatch({ type: 'CLEAR_ERROR' }),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Custom hook to use socket context
 * 
 * @returns {Object} Socket context value
 * @throws {Error} If used outside SocketProvider
 */
export const useSocket = () => {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
};

export default SocketContext;