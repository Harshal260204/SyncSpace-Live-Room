/**
 * Blind Mode Context
 * 
 * Provides Blind Mode state management for completely blind users
 * Includes keyboard shortcuts, ARIA announcements, and accessibility features
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

// Blind Mode context
const BlindModeContext = createContext();

// Blind Mode reducer for state management
const blindModeReducer = (state, action) => {
  switch (action.type) {
    case 'TOGGLE_BLIND_MODE':
      return {
        ...state,
        enabled: !state.enabled,
      };
    case 'SET_BLIND_MODE':
      return {
        ...state,
        enabled: action.payload,
      };
    case 'SET_ANNOUNCEMENT':
      return {
        ...state,
        currentAnnouncement: action.payload,
      };
    case 'CLEAR_ANNOUNCEMENT':
      return {
        ...state,
        currentAnnouncement: null,
      };
    case 'INITIALIZE_BLIND_MODE':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};

// Initial Blind Mode state
const initialState = {
  enabled: false,
  currentAnnouncement: null,
  initialized: false,
};

/**
 * Blind Mode Provider Component
 * 
 * Wraps the application to provide Blind Mode context
 * Handles keyboard shortcuts and ARIA announcements
 */
export const BlindModeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(blindModeReducer, initialState);

  // Initialize Blind Mode from localStorage
  useEffect(() => {
    const initializeBlindMode = () => {
      try {
        const savedBlindMode = localStorage.getItem('liveroom-blind-mode');
        const enabled = savedBlindMode ? JSON.parse(savedBlindMode) : false;
        
        dispatch({
          type: 'INITIALIZE_BLIND_MODE',
          payload: {
            enabled,
            initialized: true,
          },
        });
      } catch (error) {
        console.error('Error initializing Blind Mode:', error);
        // Fallback to disabled
        dispatch({
          type: 'INITIALIZE_BLIND_MODE',
          payload: {
            enabled: false,
            initialized: true,
          },
        });
      }
    };

    initializeBlindMode();
  }, []);

  // Save Blind Mode state to localStorage
  useEffect(() => {
    if (state.initialized) {
      try {
        localStorage.setItem('liveroom-blind-mode', JSON.stringify(state.enabled));
      } catch (error) {
        console.error('Error saving Blind Mode state:', error);
      }
    }
  }, [state.enabled, state.initialized]);

  // Function to announce messages to screen readers
  const announceToScreenReader = useCallback((message) => {
    // Clear any existing announcement
    dispatch({ type: 'CLEAR_ANNOUNCEMENT' });
    
    // Set new announcement
    setTimeout(() => {
      dispatch({ type: 'SET_ANNOUNCEMENT', payload: message });
      
      // Clear announcement after it's been read
      setTimeout(() => {
        dispatch({ type: 'CLEAR_ANNOUNCEMENT' });
      }, 1000);
    }, 100);
  }, []);

  // Announce Blind Mode status changes
  useEffect(() => {
    if (state.initialized) {
      const announcement = state.enabled ? 'Blind Mode enabled' : 'Blind Mode disabled';
      announceToScreenReader(announcement);
    }
  }, [state.enabled, state.initialized, announceToScreenReader]);

  // Toggle Blind Mode
  const toggleBlindMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_BLIND_MODE' });
  }, []);

  // Set Blind Mode state
  const setBlindMode = useCallback((enabled) => {
    dispatch({ type: 'SET_BLIND_MODE', payload: enabled });
  }, []);

  // Keyboard shortcut handler (Ctrl+B)
  const handleKeyDown = useCallback((event) => {
    // Check for Ctrl+B (or Cmd+B on Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
      event.preventDefault();
      event.stopPropagation();
      toggleBlindMode();
    }
  }, [toggleBlindMode]);

  useEffect(() => {
    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Blind Mode context value
  const value = {
    // Current Blind Mode state
    enabled: state.enabled,
    initialized: state.initialized,
    currentAnnouncement: state.currentAnnouncement,
    
    // Blind Mode actions
    toggleBlindMode,
    setBlindMode,
    announceToScreenReader,
    
    // Utility functions
    isBlindModeEnabled: () => state.enabled,
    getBlindModeStatus: () => state.enabled ? 'enabled' : 'disabled',
  };

  return (
    <BlindModeContext.Provider value={value}>
      {children}
      
      {/* ARIA Live Region for announcements */}
      <div 
        id="blind-mode-announcements" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        role="status"
        aria-label="Blind Mode announcements"
      >
        {state.currentAnnouncement && (
          <span key={Date.now()}>
            {state.currentAnnouncement}
          </span>
        )}
      </div>
    </BlindModeContext.Provider>
  );
};

/**
 * Custom hook to use Blind Mode context
 * 
 * @returns {Object} Blind Mode context value
 * @throws {Error} If used outside BlindModeProvider
 */
export const useBlindMode = () => {
  const context = useContext(BlindModeContext);
  
  if (!context) {
    throw new Error('useBlindMode must be used within a BlindModeProvider');
  }
  
  return context;
};

export default BlindModeContext;
