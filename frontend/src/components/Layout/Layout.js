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
        min-h-screen transition-all duration-500 ease-out
        ${getThemeClass()}
        ${getGlassmorphismClass()}
        ${getAnimationsClass()}
        ${getAccessibilityClass()}
        font-${fontSize}
        ${screenReader ? 'screen-reader-optimized' : ''}
        ${glassmorphism ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900' : ''}
      `}
      role="document"
      aria-label="Live Room Application"
      style={{
        backgroundImage: glassmorphism 
          ? 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%)'
          : undefined
      }}
    >
      {/* Skip links for keyboard navigation */}
      <div className="skip-links">
        <a 
          href="#main-content" 
          className="skip-link focus-visible-ring glass-card"
          aria-label="Skip to main content"
        >
          Skip to main content
        </a>
        <a 
          href="#navigation" 
          className="skip-link focus-visible-ring glass-card"
          aria-label="Skip to navigation"
        >
          Skip to navigation
        </a>
        <a 
          href="#footer" 
          className="skip-link focus-visible-ring glass-card"
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
          className={`
            ${glassmorphism 
              ? 'glass-card border-t border-white/20 backdrop-blur-xl' 
              : 'bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700'
            }
            transition-all duration-300
          `}
          role="contentinfo"
          aria-label="Footer"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p className="font-medium">
                  SyncSpace Live Room - Real-time collaborative workspace
                </p>
                <p className="mt-1 text-xs opacity-75">
                  Built with accessibility and modern design in mind
                </p>
              </div>
              
              <div className="mt-4 md:mt-0 text-sm text-gray-500 dark:text-gray-500">
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${glassmorphism ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                    Theme: {getThemeClass() || 'light'}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${animations ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    Animations: {animations ? 'on' : 'off'}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${glassmorphism ? 'bg-purple-400' : 'bg-gray-400'}`}></div>
                    Glass: {glassmorphism ? 'on' : 'off'}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${screenReader ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                    {screenReader ? 'Screen Reader' : 'Standard'} Mode
                  </span>
                </div>
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
