/**
 * Live Room Main App Component
 * 
 * Main application component that handles routing and provides
 * the overall layout structure with accessibility features
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';
import { useAccessibility } from './contexts/AccessibilityContext';
import { useBlindMode } from './contexts/BlindModeContext';

// Import page components
import Dashboard from './pages/Dashboard';
import RoomWorkspace from './pages/RoomWorkspace';
import NotFound from './pages/NotFound';

// Import layout components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/UI/LoadingSpinner';

/**
 * Main App Component
 * 
 * Handles routing between Dashboard and Room workspace
 * Applies theme and accessibility settings globally
 * Provides fallback for loading states and error boundaries
 */
function App() {
  const { theme, highContrast } = useTheme();
  const { fontSize } = useAccessibility();
  const { enabled: blindModeEnabled, initialized: blindModeInitialized } = useBlindMode();

  // Apply theme classes to document
  React.useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('dark', 'hc-mode', 'blind-mode');
    
    // Apply current theme
    if (highContrast) {
      root.classList.add('hc-mode');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    }
    
    // Apply Blind Mode class
    if (blindModeEnabled && blindModeInitialized) {
      root.classList.add('blind-mode');
    }
    
    // Apply font size class
    root.classList.remove('font-small', 'font-base', 'font-large');
    root.classList.add(`font-${fontSize}`);
    
  }, [theme, highContrast, fontSize, blindModeEnabled, blindModeInitialized]);

  // Apply accessibility attributes
  React.useEffect(() => {
    const root = document.documentElement;
    
    // Set color scheme for better browser support
    root.style.colorScheme = highContrast ? 'none' : theme === 'dark' ? 'dark' : 'light';
    
    // Set high contrast mode for screen readers
    if (highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }
    
    // Set Blind Mode for screen readers and assistive technologies
    if (blindModeEnabled && blindModeInitialized) {
      root.setAttribute('data-blind-mode', 'true');
    } else {
      root.removeAttribute('data-blind-mode');
    }
    
  }, [theme, highContrast, blindModeEnabled, blindModeInitialized]);

  return (
    <div 
      className={`
        min-h-screen transition-colors duration-300
        ${highContrast ? 'hc-mode' : ''}
        ${theme === 'dark' ? 'dark' : ''}
        ${blindModeEnabled && blindModeInitialized ? 'blind-mode' : ''}
        font-${fontSize}
      `}
      role="application"
      aria-label="Live Room Collaborative Workspace"
      data-blind-mode={blindModeEnabled && blindModeInitialized ? 'true' : 'false'}
    >
      {/* Skip link for keyboard navigation */}
      <a 
        href="#main-content" 
        className="skip-link focus-visible-ring"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>

      {/* Main application layout */}
      <Layout>
        <main id="main-content" role="main" aria-label="Main content">
          <React.Suspense 
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="large" />
                <span className="sr-only">Loading application...</span>
              </div>
            }
          >
            <Routes>
              {/* Dashboard route - room list, join, create */}
              <Route 
                path="/" 
                element={<Dashboard />} 
              />
              
              {/* Room workspace route - collaborative workspace */}
              <Route 
                path="/room/:roomId" 
                element={<RoomWorkspace />} 
              />
              
              {/* Redirect old routes to new structure */}
              <Route 
                path="/dashboard" 
                element={<Navigate to="/" replace />} 
              />
              
              {/* 404 Not Found page */}
              <Route 
                path="*" 
                element={<NotFound />} 
              />
            </Routes>
          </React.Suspense>
        </main>
      </Layout>

      {/* Screen reader announcements */}
      <div 
        id="announcements" 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        role="status"
        aria-label="Screen reader announcements"
      >
        {/* Dynamic announcements will be inserted here */}
      </div>

      {/* Focus trap for modals */}
      <div 
        id="focus-trap" 
        tabIndex="-1" 
        className="sr-only"
        aria-hidden="true"
      >
        {/* Focus trap for modal dialogs */}
      </div>
    </div>
  );
}

export default App;
