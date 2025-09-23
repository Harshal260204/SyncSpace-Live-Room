/**
 * User Context
 * 
 * Provides user state management including authentication,
 * preferences, and session handling
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { userAPI } from '../services/api';

// User context
const UserContext = createContext();

// User reducer for state management
const userReducer = (state, action) => {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
      };
    case 'CLEAR_USER':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
      };
    case 'UPDATE_USER_PREFERENCES':
      return {
        ...state,
        user: {
          ...state.user,
          preferences: {
            ...state.user.preferences,
            ...action.payload,
          },
        },
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_CURRENT_ROOM':
      return {
        ...state,
        currentRoom: action.payload,
      };
    case 'CLEAR_CURRENT_ROOM':
      return {
        ...state,
        currentRoom: null,
      };
    default:
      return state;
  }
};

// Initial user state
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  currentRoom: null,
};

/**
 * User Provider Component
 * 
 * Wraps the application to provide user context
 * Handles user authentication and session management
 */
export const UserProvider = ({ children }) => {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const cleanupRefs = useRef([]);

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    // Clear all cleanup refs
    cleanupRefs.current.forEach(cleanup => {
      if (cleanup) {
        cleanup();
      }
    });
    cleanupRefs.current = [];
    
    // Clear user state
    dispatch({ type: 'CLEAR_USER' });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Initialize user from localStorage with proper error handling
  useEffect(() => {
    const initializeUser = () => {
      try {
        const savedUser = localStorage.getItem('liveroom-user');
        const savedSessionId = localStorage.getItem('liveroom-session-id');
        
        if (savedUser && savedSessionId) {
          const user = JSON.parse(savedUser);
          
          // Validate user data structure
          if (user && user.userId && user.username && user.sessionId) {
            dispatch({
              type: 'SET_USER',
              payload: {
                ...user,
                sessionId: savedSessionId,
              },
            });
          } else {
            throw new Error('Invalid user data structure');
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        // Clear invalid data
        localStorage.removeItem('liveroom-user');
        localStorage.removeItem('liveroom-session-id');
        dispatch({ type: 'CLEAR_USER' });
      }
    };

    initializeUser();
  }, []);

  // Save user to localStorage when it changes with proper error handling
  useEffect(() => {
    if (state.user) {
      try {
        // Validate user data before saving
        if (state.user.userId && state.user.username && state.user.sessionId) {
          localStorage.setItem('liveroom-user', JSON.stringify(state.user));
          localStorage.setItem('liveroom-session-id', state.user.sessionId);
        } else {
          console.warn('Invalid user data, not saving to localStorage');
        }
      } catch (error) {
        console.error('Error saving user data:', error);
        // Clear corrupted data
        localStorage.removeItem('liveroom-user');
        localStorage.removeItem('liveroom-session-id');
      }
    }
  }, [state.user]);

  // Create anonymous user
  const createUser = async (username, preferences = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const sessionId = uuidv4();
      
      const userData = {
        username: username.trim(),
        sessionId,
        preferences: {
          accessibility: {
            screenReader: false,
            highContrast: false,
            fontSize: 'medium',
            announceChanges: true,
            keyboardNavigation: true,
          },
          appearance: {
            theme: 'auto',
            cursorColor: '#3B82F6',
          },
          notifications: {
            chatMessages: true,
            userJoinLeave: true,
            codeChanges: false,
            systemAnnouncements: true,
          },
          ...preferences,
        },
      };

      // Create user via API
      const createdUser = await userAPI.createUser(userData);
      
      // Store user in localStorage for persistence
      localStorage.setItem('liveroom-user', JSON.stringify(createdUser));
      
      dispatch({
        type: 'SET_USER',
        payload: createdUser,
      });

      return createdUser;
    } catch (error) {
      console.error('Error creating user:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: 'Failed to create user session',
      });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Update user preferences
  const updatePreferences = (newPreferences) => {
    if (state.user) {
      dispatch({
        type: 'UPDATE_USER_PREFERENCES',
        payload: newPreferences,
      });
    }
  };

  // Update user activity
  const updateActivity = () => {
    if (state.user) {
      const updatedUser = {
        ...state.user,
        lastSeen: new Date().toISOString(),
      };
      dispatch({
        type: 'SET_USER',
        payload: updatedUser,
      });
    }
  };

  // Join room
  const joinRoom = useCallback((roomId) => {
    dispatch({
      type: 'SET_CURRENT_ROOM',
      payload: roomId,
    });
    
    if (state.user) {
      const updatedUser = {
        ...state.user,
        currentRoom: roomId,
        lastSeen: new Date().toISOString(),
      };
      dispatch({
        type: 'SET_USER',
        payload: updatedUser,
      });
    }
  }, [state.user]);

  // Leave room
  const leaveRoom = useCallback(() => {
    dispatch({
      type: 'CLEAR_CURRENT_ROOM',
    });
    
    if (state.user) {
      const updatedUser = {
        ...state.user,
        currentRoom: null,
        lastSeen: new Date().toISOString(),
      };
      dispatch({
        type: 'SET_USER',
        payload: updatedUser,
      });
    }
  }, [state.user]);

  // Logout user
  const logout = () => {
    dispatch({ type: 'CLEAR_USER' });
    dispatch({ type: 'CLEAR_CURRENT_ROOM' });
    
    // Clear localStorage
    localStorage.removeItem('liveroom-user');
    localStorage.removeItem('liveroom-session-id');
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // User context value
  const value = {
    // Current user state
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    currentRoom: state.currentRoom,
    
    // User actions
    createUser,
    updatePreferences,
    updateActivity,
    joinRoom,
    leaveRoom,
    logout,
    clearError,
    
    // User utilities
    getUsername: () => state.user?.username || 'Guest',
    getUserId: () => state.user?.userId || null,
    getSessionId: () => state.user?.sessionId || null,
    getPreferences: () => state.user?.preferences || {},
    
    // Room utilities
    isInRoom: () => !!state.currentRoom,
    getCurrentRoomId: () => state.currentRoom,
    
    // Accessibility utilities
    getAccessibilityPreferences: () => state.user?.preferences?.accessibility || {},
    getAppearancePreferences: () => state.user?.preferences?.appearance || {},
    getNotificationPreferences: () => state.user?.preferences?.notifications || {},
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * Custom hook to use user context
 * 
 * @returns {Object} User context value
 * @throws {Error} If used outside UserProvider
 */
export const useUser = () => {
  const context = useContext(UserContext);
  
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
};

export default UserContext;
