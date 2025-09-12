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
  const { getThemeClass } = useTheme();
  const { fontSize, screenReader } = useAccessibility();

  return (
    <div 
      className={`
        min-h-screen transition-colors duration-300
        ${getThemeClass()}
        font-${fontSize}
        ${screenReader ? 'screen-reader-optimized' : ''}
      `}
      role="document"
      aria-label="Live Room Application"
    >
      {/* Skip links for keyboard navigation */}
      <div className="skip-links">
        <a 
          href="#main-content" 
          className="skip-link focus-visible-ring"
          aria-label="Skip to main content"
        >
          Skip to main content
        </a>
        <a 
          href="#navigation" 
          className="skip-link focus-visible-ring"
          aria-label="Skip to navigation"
        >
          Skip to navigation
        </a>
        <a 
          href="#footer" 
          className="skip-link focus-visible-ring"
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
          className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          role="contentinfo"
          aria-label="Footer"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>
                  Live Room - Real-time collaborative workspace
                </p>
                <p className="mt-1">
                  Built with accessibility in mind
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 text-sm text-gray-500 dark:text-gray-500">
                <p>
                  Theme: {getThemeClass()} | Font: {fontSize} | 
                  {screenReader ? ' Screen Reader' : ' Standard'} Mode
                </p>
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
