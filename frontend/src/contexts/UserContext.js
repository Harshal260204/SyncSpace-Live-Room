/**
 * User Context
 * 
 * Provides user state management including authentication,
 * preferences, and session handling
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

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

  // Initialize user from localStorage
  useEffect(() => {
    const initializeUser = () => {
      try {
        const savedUser = localStorage.getItem('liveroom-user');
        const savedSessionId = localStorage.getItem('liveroom-session-id');
        
        if (savedUser && savedSessionId) {
          const user = JSON.parse(savedUser);
          dispatch({
            type: 'SET_USER',
            payload: {
              ...user,
              sessionId: savedSessionId,
            },
          });
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        // Clear invalid data
        localStorage.removeItem('liveroom-user');
        localStorage.removeItem('liveroom-session-id');
      }
    };

    initializeUser();
  }, []);

  // Save user to localStorage when it changes
  useEffect(() => {
    if (state.user) {
      try {
        localStorage.setItem('liveroom-user', JSON.stringify(state.user));
        localStorage.setItem('liveroom-session-id', state.user.sessionId);
      } catch (error) {
        console.error('Error saving user data:', error);
      }
    }
  }, [state.user]);

  // Create anonymous user
  const createUser = async (username, preferences = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const sessionId = uuidv4();
      const userId = uuidv4();
      
      const user = {
        userId,
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
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      };

      dispatch({
        type: 'SET_USER',
        payload: user,
      });

      return user;
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
  const joinRoom = (roomId) => {
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
  };

  // Leave room
  const leaveRoom = () => {
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
  };

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
