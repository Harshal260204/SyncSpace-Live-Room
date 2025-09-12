/**
 * Accessibility Context
 * 
 * Provides accessibility features including screen reader support,
 * keyboard navigation, font sizing, and live announcements
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Accessibility context
const AccessibilityContext = createContext();

// Accessibility reducer for state management
const accessibilityReducer = (state, action) => {
  switch (action.type) {
    case 'SET_SCREEN_READER':
      return {
        ...state,
        screenReader: action.payload,
      };
    case 'SET_FONT_SIZE':
      return {
        ...state,
        fontSize: action.payload,
      };
    case 'SET_KEYBOARD_NAVIGATION':
      return {
        ...state,
        keyboardNavigation: action.payload,
      };
    case 'SET_ANNOUNCE_CHANGES':
      return {
        ...state,
        announceChanges: action.payload,
      };
    case 'SET_REDUCED_MOTION':
      return {
        ...state,
        reducedMotion: action.payload,
      };
    case 'INITIALIZE_ACCESSIBILITY':
      return {
        ...state,
        ...action.payload,
      };
    case 'ANNOUNCE':
      return {
        ...state,
        announcements: [
          ...state.announcements,
          {
            id: Date.now(),
            message: action.payload.message,
            priority: action.payload.priority || 'polite',
            timestamp: new Date(),
          },
        ].slice(-10), // Keep only last 10 announcements
      };
    case 'CLEAR_ANNOUNCEMENTS':
      return {
        ...state,
        announcements: [],
      };
    default:
      return state;
  }
};

// Initial accessibility state
const initialState = {
  screenReader: false,
  fontSize: 'medium', // 'small', 'medium', 'large'
  keyboardNavigation: true,
  announceChanges: true,
  reducedMotion: false,
  announcements: [],
  initialized: false,
};

/**
 * Accessibility Provider Component
 * 
 * Wraps the application to provide accessibility context
 * Handles accessibility preferences and live announcements
 */
export const AccessibilityProvider = ({ children }) => {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState);

  // Initialize accessibility preferences
  useEffect(() => {
    const initializeAccessibility = () => {
      try {
        // Get saved accessibility preferences
        const savedScreenReader = localStorage.getItem('liveroom-screen-reader');
        const savedFontSize = localStorage.getItem('liveroom-font-size');
        const savedKeyboardNav = localStorage.getItem('liveroom-keyboard-nav');
        const savedAnnounceChanges = localStorage.getItem('liveroom-announce-changes');
        
        // Detect system preferences
        const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Initialize accessibility state
        const screenReader = savedScreenReader ? JSON.parse(savedScreenReader) : false;
        const fontSize = savedFontSize || 'medium';
        const keyboardNavigation = savedKeyboardNav ? JSON.parse(savedKeyboardNav) : true;
        const announceChanges = savedAnnounceChanges ? JSON.parse(savedAnnounceChanges) : true;
        
        dispatch({
          type: 'INITIALIZE_ACCESSIBILITY',
          payload: {
            screenReader,
            fontSize,
            keyboardNavigation,
            announceChanges,
            reducedMotion: systemReducedMotion,
            initialized: true,
          },
        });
      } catch (error) {
        console.error('Error initializing accessibility preferences:', error);
        // Fallback to default values
        dispatch({
          type: 'INITIALIZE_ACCESSIBILITY',
          payload: {
            screenReader: false,
            fontSize: 'medium',
            keyboardNavigation: true,
            announceChanges: true,
            reducedMotion: false,
            initialized: true,
          },
        });
      }
    };

    initializeAccessibility();
  }, []);

  // Listen for system reduced motion changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleReducedMotionChange = (e) => {
      dispatch({
        type: 'SET_REDUCED_MOTION',
        payload: e.matches,
      });
    };

    mediaQuery.addEventListener('change', handleReducedMotionChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleReducedMotionChange);
    };
  }, []);

  // Save accessibility preferences to localStorage
  useEffect(() => {
    if (state.initialized) {
      try {
        localStorage.setItem('liveroom-screen-reader', JSON.stringify(state.screenReader));
        localStorage.setItem('liveroom-font-size', state.fontSize);
        localStorage.setItem('liveroom-keyboard-nav', JSON.stringify(state.keyboardNavigation));
        localStorage.setItem('liveroom-announce-changes', JSON.stringify(state.announceChanges));
      } catch (error) {
        console.error('Error saving accessibility preferences:', error);
      }
    }
  }, [state.screenReader, state.fontSize, state.keyboardNavigation, state.announceChanges, state.initialized]);

  // Apply accessibility settings to document
  useEffect(() => {
    if (state.initialized) {
      const root = document.documentElement;
      
      // Apply font size class
      root.classList.remove('font-small', 'font-base', 'font-large');
      root.classList.add(`font-${state.fontSize}`);
      
      // Apply reduced motion class
      if (state.reducedMotion) {
        root.classList.add('reduce-motion');
      } else {
        root.classList.remove('reduce-motion');
      }
      
      // Apply keyboard navigation class
      if (state.keyboardNavigation) {
        root.classList.add('keyboard-nav');
      } else {
        root.classList.remove('keyboard-nav');
      }
    }
  }, [state.fontSize, state.reducedMotion, state.keyboardNavigation, state.initialized]);

  // Live announcement system
  const announce = (message, priority = 'polite') => {
    if (state.announceChanges) {
      dispatch({
        type: 'ANNOUNCE',
        payload: { message, priority },
      });
      
      // Also use the browser's built-in announcement
      if (state.screenReader) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
      }
    }
  };

  // Accessibility context value
  const value = {
    // Current accessibility state
    screenReader: state.screenReader,
    fontSize: state.fontSize,
    keyboardNavigation: state.keyboardNavigation,
    announceChanges: state.announceChanges,
    reducedMotion: state.reducedMotion,
    announcements: state.announcements,
    initialized: state.initialized,
    
    // Accessibility actions
    setScreenReader: (enabled) => dispatch({ type: 'SET_SCREEN_READER', payload: enabled }),
    setFontSize: (size) => dispatch({ type: 'SET_FONT_SIZE', payload: size }),
    setKeyboardNavigation: (enabled) => dispatch({ type: 'SET_KEYBOARD_NAVIGATION', payload: enabled }),
    setAnnounceChanges: (enabled) => dispatch({ type: 'SET_ANNOUNCE_CHANGES', payload: enabled }),
    
    // Utility functions
    announce,
    clearAnnouncements: () => dispatch({ type: 'CLEAR_ANNOUNCEMENTS' }),
    
    // Font size utilities
    getFontSizeClass: () => `font-${state.fontSize}`,
    getFontSizeDescription: () => {
      const sizes = {
        small: 'Small',
        medium: 'Medium',
        large: 'Large',
      };
      return sizes[state.fontSize] || 'Medium';
    },
    
    // Accessibility helpers
    isAccessible: () => state.screenReader || state.keyboardNavigation,
    getAccessibilityDescription: () => {
      const features = [];
      if (state.screenReader) features.push('Screen reader');
      if (state.keyboardNavigation) features.push('Keyboard navigation');
      if (state.announceChanges) features.push('Live announcements');
      if (state.reducedMotion) features.push('Reduced motion');
      return features.length > 0 ? features.join(', ') : 'Standard';
    },
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

/**
 * Custom hook to use accessibility context
 * 
 * @returns {Object} Accessibility context value
 * @throws {Error} If used outside AccessibilityProvider
 */
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  
  return context;
};

export default AccessibilityContext;
