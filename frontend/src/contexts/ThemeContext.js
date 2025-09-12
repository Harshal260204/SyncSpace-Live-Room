/**
 * Theme Context
 * 
 * Provides theme management including light/dark mode,
 * high contrast mode, and accessibility preferences
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Theme context
const ThemeContext = createContext();

// Theme reducer for state management
const themeReducer = (state, action) => {
  switch (action.type) {
    case 'SET_THEME':
      return {
        ...state,
        theme: action.payload,
      };
    case 'TOGGLE_THEME':
      return {
        ...state,
        theme: state.theme === 'light' ? 'dark' : 'light',
      };
    case 'SET_HIGH_CONTRAST':
      return {
        ...state,
        highContrast: action.payload,
      };
    case 'TOGGLE_HIGH_CONTRAST':
      return {
        ...state,
        highContrast: !state.highContrast,
      };
    case 'SET_SYSTEM_THEME':
      return {
        ...state,
        systemTheme: action.payload,
      };
    case 'INITIALIZE_THEME':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
};

// Initial theme state
const initialState = {
  theme: 'light', // 'light', 'dark', 'auto'
  highContrast: false,
  systemTheme: 'light', // Detected system theme
  initialized: false,
};

/**
 * Theme Provider Component
 * 
 * Wraps the application to provide theme context
 * Handles theme persistence and system theme detection
 */
export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Initialize theme from localStorage and system preferences
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Get saved theme preferences
        const savedTheme = localStorage.getItem('liveroom-theme');
        const savedHighContrast = localStorage.getItem('liveroom-high-contrast');
        
        // Detect system theme preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
          ? 'dark' 
          : 'light';
        
        // Detect system high contrast preference
        const systemHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        
        // Initialize theme state
        const theme = savedTheme || 'auto';
        const highContrast = savedHighContrast 
          ? JSON.parse(savedHighContrast) 
          : systemHighContrast;
        
        dispatch({
          type: 'INITIALIZE_THEME',
          payload: {
            theme,
            highContrast,
            systemTheme,
            initialized: true,
          },
        });
      } catch (error) {
        console.error('Error initializing theme:', error);
        // Fallback to system theme
        dispatch({
          type: 'INITIALIZE_THEME',
          payload: {
            theme: 'auto',
            highContrast: false,
            systemTheme: 'light',
            initialized: true,
          },
        });
      }
    };

    initializeTheme();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      dispatch({
        type: 'SET_SYSTEM_THEME',
        payload: newSystemTheme,
      });
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Listen for system high contrast changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handleHighContrastChange = (e) => {
      if (state.theme === 'auto') {
        dispatch({
          type: 'SET_HIGH_CONTRAST',
          payload: e.matches,
        });
      }
    };

    mediaQuery.addEventListener('change', handleHighContrastChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleHighContrastChange);
    };
  }, [state.theme]);

  // Save theme preferences to localStorage
  useEffect(() => {
    if (state.initialized) {
      try {
        localStorage.setItem('liveroom-theme', state.theme);
        localStorage.setItem('liveroom-high-contrast', JSON.stringify(state.highContrast));
      } catch (error) {
        console.error('Error saving theme preferences:', error);
      }
    }
  }, [state.theme, state.highContrast, state.initialized]);

  // Theme context value
  const value = {
    // Current theme state
    theme: state.theme,
    highContrast: state.highContrast,
    systemTheme: state.systemTheme,
    initialized: state.initialized,
    
    // Computed values
    effectiveTheme: state.theme === 'auto' ? state.systemTheme : state.theme,
    isDark: state.theme === 'auto' ? state.systemTheme === 'dark' : state.theme === 'dark',
    
    // Theme actions
    setTheme: (theme) => dispatch({ type: 'SET_THEME', payload: theme }),
    toggleTheme: () => dispatch({ type: 'TOGGLE_THEME' }),
    setHighContrast: (enabled) => dispatch({ type: 'SET_HIGH_CONTRAST', payload: enabled }),
    toggleHighContrast: () => dispatch({ type: 'TOGGLE_HIGH_CONTRAST' }),
    
    // Utility functions
    getThemeClass: () => {
      if (state.highContrast) return 'hc-mode';
      if (state.theme === 'auto') return state.systemTheme === 'dark' ? 'dark' : '';
      return state.theme === 'dark' ? 'dark' : '';
    },
    
    getThemeDescription: () => {
      if (state.highContrast) return 'High contrast mode';
      if (state.theme === 'auto') return `Auto (${state.systemTheme})`;
      return state.theme === 'dark' ? 'Dark mode' : 'Light mode';
    },
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook to use theme context
 * 
 * @returns {Object} Theme context value
 * @throws {Error} If used outside ThemeProvider
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default ThemeContext;
