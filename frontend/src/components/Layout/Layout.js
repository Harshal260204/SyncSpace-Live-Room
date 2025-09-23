/**
 * Layout Component
 * 
 * Main layout wrapper providing:
 * - Consistent page structure
 * - Accessibility features
 * - Theme and font size application
 * - Skip links and navigation
 */

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * Layout Component
 * 
 * Provides the main layout structure for all pages
 * Applies theme, accessibility, and responsive design
 */
const Layout = ({ children }) => {
  const { 
    getThemeClass, 
    getGlassmorphismClass, 
    getAnimationsClass, 
    getAccessibilityClass,
    glassmorphism,
    animations 
  } = useTheme();
  const { fontSize, screenReader } = useAccessibility();

  return (
    <div 
      className={`
        min-h-screen bg-gray-50 dark:bg-gray-900 transition-all duration-300
        ${getThemeClass()}
        ${getGlassmorphismClass()}
        ${getAnimationsClass()}
        ${getAccessibilityClass()}
        font-${fontSize}
        ${screenReader ? 'screen-reader-optimized' : ''}
      `}
      role="document"
      aria-label="Live Room Application"
    >
      {/* Skip links for keyboard navigation - hidden by default, visible on focus */}
      <div className="skip-links">
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
          aria-label="Skip to main content"
        >
          Skip to main content
        </a>
        <a 
          href="#navigation" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-32 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
          aria-label="Skip to navigation"
        >
          Skip to navigation
        </a>
        <a 
          href="#footer" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-60 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:shadow-lg"
          aria-label="Skip to footer"
        >
          Skip to footer
        </a>
      </div>

      {/* Main layout container */}
      <div className="flex flex-col min-h-screen">
        {/* Main content area */}
        <main 
          id="main-content" 
          className="flex-1"
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>

        {/* Footer */}
        <footer 
          id="footer" 
          className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all duration-300"
          role="contentinfo"
          aria-label="Footer"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium">
                  SyncSpace Live Room
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Real-time collaborative workspace
                </p>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-500">
                <span>Theme: {getThemeClass() || 'light'}</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

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
};

export default Layout;
