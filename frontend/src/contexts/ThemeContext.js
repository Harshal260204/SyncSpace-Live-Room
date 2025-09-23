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
    case 'SET_GLASSMORPHISM':
      return {
        ...state,
        glassmorphism: action.payload,
      };
    case 'TOGGLE_GLASSMORPHISM':
      return {
        ...state,
        glassmorphism: !state.glassmorphism,
      };
    case 'SET_ANIMATIONS':
      return {
        ...state,
        animations: action.payload,
      };
    case 'TOGGLE_ANIMATIONS':
      return {
        ...state,
        animations: !state.animations,
      };
    case 'SET_REDUCED_MOTION':
      return {
        ...state,
        reducedMotion: action.payload,
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
  glassmorphism: true, // Enable glassmorphism effects
  animations: true, // Enable animations
  reducedMotion: false, // System reduced motion preference
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
        const savedGlassmorphism = localStorage.getItem('liveroom-glassmorphism');
        const savedAnimations = localStorage.getItem('liveroom-animations');
        
        // Detect system theme preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
          ? 'dark' 
          : 'light';
        
        // Detect system high contrast preference
        const systemHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        
        // Detect system reduced motion preference
        const systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        
        // Initialize theme state
        const theme = savedTheme || 'auto';
        const highContrast = savedHighContrast 
          ? JSON.parse(savedHighContrast) 
          : systemHighContrast;
        const glassmorphism = savedGlassmorphism 
          ? JSON.parse(savedGlassmorphism) 
          : true;
        const animations = savedAnimations 
          ? JSON.parse(savedAnimations) 
          : !systemReducedMotion;
        
        dispatch({
          type: 'INITIALIZE_THEME',
          payload: {
            theme,
            highContrast,
            glassmorphism,
            animations,
            reducedMotion: systemReducedMotion,
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
            glassmorphism: true,
            animations: true,
            reducedMotion: false,
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

  // Listen for system reduced motion changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleReducedMotionChange = (e) => {
      dispatch({
        type: 'SET_REDUCED_MOTION',
        payload: e.matches,
      });
      
      // Auto-disable animations if reduced motion is preferred
      if (e.matches) {
        dispatch({
          type: 'SET_ANIMATIONS',
          payload: false,
        });
      }
    };

    mediaQuery.addEventListener('change', handleReducedMotionChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleReducedMotionChange);
    };
  }, []);

  // Save theme preferences to localStorage
  useEffect(() => {
    if (state.initialized) {
      try {
        localStorage.setItem('liveroom-theme', state.theme);
        localStorage.setItem('liveroom-high-contrast', JSON.stringify(state.highContrast));
        localStorage.setItem('liveroom-glassmorphism', JSON.stringify(state.glassmorphism));
        localStorage.setItem('liveroom-animations', JSON.stringify(state.animations));
      } catch (error) {
        console.error('Error saving theme preferences:', error);
      }
    }
  }, [state.theme, state.highContrast, state.glassmorphism, state.animations, state.initialized]);

  // Theme context value
  const value = {
    // Current theme state
    theme: state.theme,
    highContrast: state.highContrast,
    glassmorphism: state.glassmorphism,
    animations: state.animations,
    reducedMotion: state.reducedMotion,
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
    setGlassmorphism: (enabled) => dispatch({ type: 'SET_GLASSMORPHISM', payload: enabled }),
    toggleGlassmorphism: () => dispatch({ type: 'TOGGLE_GLASSMORPHISM' }),
    setAnimations: (enabled) => dispatch({ type: 'SET_ANIMATIONS', payload: enabled }),
    toggleAnimations: () => dispatch({ type: 'TOGGLE_ANIMATIONS' }),
    
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
    
    getGlassmorphismClass: () => {
      return state.glassmorphism ? 'glassmorphism-enabled' : 'glassmorphism-disabled';
    },
    
    getAnimationsClass: () => {
      return state.animations && !state.reducedMotion ? 'animations-enabled' : 'animations-disabled';
    },
    
    getAccessibilityClass: () => {
      const classes = [];
      if (state.highContrast) classes.push('hc-mode');
      if (state.glassmorphism) classes.push('glassmorphism-enabled');
      if (state.animations && !state.reducedMotion) classes.push('animations-enabled');
      if (state.reducedMotion) classes.push('reduced-motion');
      return classes.join(' ');
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
