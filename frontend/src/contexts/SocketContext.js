/**
 * Socket Context
 * 
 * Provides Socket.io client management with robust connection handling,
 * event management, and real-time collaboration features
 */

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
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
  const maxReconnectAttempts = 5;

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = () => {
      try {
        const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
        
        socketRef.current = io(serverUrl, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        // Connection event handlers
        socketRef.current.on('connect', () => {
          console.log('🔌 Socket connected');
          dispatch({ type: 'CONNECT' });
          reconnectAttempts.current = 0;
          
          // Clear any existing reconnect timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason);
          dispatch({ type: 'DISCONNECT' });
          
          // Show reconnection message for unexpected disconnections
          if (reason !== 'io client disconnect') {
            toast.error('Connection lost. Attempting to reconnect...');
          }
        });

        socketRef.current.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error);
          dispatch({
            type: 'SET_ERROR',
            payload: 'Failed to connect to server',
          });
          
          reconnectAttempts.current++;
          
          if (reconnectAttempts.current >= maxReconnectAttempts) {
            toast.error('Unable to connect to server. Please check your connection.');
          }
        });

        // Room event handlers
        socketRef.current.on('roomJoined', (data) => {
          console.log('🏠 Joined room:', data.roomId);
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
          console.log('👤 User joined:', data.username);
          dispatch({
            type: 'ADD_PARTICIPANT',
            payload: data,
          });
          
          toast.success(`${data.username} joined the room`);
        });

        socketRef.current.on('userLeft', (data) => {
          console.log('👋 User left:', data.username);
          dispatch({
            type: 'REMOVE_PARTICIPANT',
            payload: { userId: data.userId },
          });
          
          toast.success(`${data.username} left the room`);
        });

        socketRef.current.on('userDisconnected', (data) => {
          console.log('🔌 User disconnected:', data.username);
          dispatch({
            type: 'REMOVE_PARTICIPANT',
            payload: { userId: data.userId },
          });
          
          toast.success(`${data.username} disconnected`);
        });

        // Collaboration event handlers
        socketRef.current.on('code-changed', (data) => {
          console.log('📝 Code changed by:', data.username);
          console.log('📝 Code change metadata:', data.metadata);
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
          console.log('📝 Notes changed by:', data.username);
          console.log('📝 Notes change metadata:', data.metadata);
          dispatch({
            type: 'SET_NOTES_CONTENT',
            payload: {
              content: data.content,
              metadata: data.metadata, // Include metadata for Blind Mode
            },
          });
        });

        socketRef.current.on('drawing-updated', (data) => {
          console.log('🎨 Drawing updated by:', data.username);
          dispatch({
            type: 'SET_CANVAS_DATA',
            payload: data.drawingData,
          });
        });

        socketRef.current.on('chat-message', (data) => {
          console.log('💬 Chat message from:', data.username);
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            payload: data,
          });
        });

        socketRef.current.on('chatHistory', (messages) => {
          console.log('💬 Chat history loaded:', messages.length, 'messages');
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
          console.error('❌ Socket error:', error);
          toast.error(error.message || 'An error occurred');
        });

        // Pong response for health checks
        socketRef.current.on('pong', (data) => {
          console.log('🏓 Pong received:', data.timestamp);
        });

      } catch (error) {
        console.error('❌ Error initializing socket:', error);
        dispatch({
          type: 'SET_ERROR',
          payload: 'Failed to initialize connection',
        });
      }
    };

    initializeSocket();

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, []);

  // Socket connection methods
  const connect = () => {
    if (socketRef.current && !state.connected) {
      dispatch({ type: 'CONNECTING' });
      socketRef.current.connect();
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // Room management methods
  const joinRoom = (roomId, username, preferences = {}) => {
    if (socketRef.current && state.connected) {
      socketRef.current.emit('joinRoom', {
        roomId,
        username,
        preferences,
      });
    } else {
      toast.error('Not connected to server');
    }
  };

  const leaveRoom = () => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('leaveRoom');
      dispatch({ type: 'CLEAR_ROOM' });
      dispatch({ type: 'CLEAR_CHAT_MESSAGES' });
    }
  };

  // Collaboration methods
  const sendCodeChange = (content, language, cursorPosition) => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('code-change', {
        content,
        language,
        cursorPosition,
      });
    }
  };

  const sendNoteChange = (content) => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('note-change', {
        content,
      });
    }
  };

  const sendDrawingEvent = (drawingData, action) => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('draw-event', {
        drawingData,
        action,
      });
    }
  };

  const sendChatMessage = (message, messageType = 'text') => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('chat-message', {
        message,
        messageType,
      });
    }
  };

  const sendPresenceUpdate = (cursorPosition, isActive = true) => {
    if (socketRef.current && state.currentRoom) {
      socketRef.current.emit('presence-update', {
        cursorPosition,
        isActive,
      });
    }
  };

  // Health check
  const ping = () => {
    if (socketRef.current && state.connected) {
      socketRef.current.emit('ping');
    }
  };

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
