/**
 * Live Room Frontend Entry Point
 * 
 * Main entry point for the React application
 * Sets up routing, context providers, and accessibility features
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ReactAnnouncer } from 'react-announcer';

// Import context providers
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './contexts/SocketContext';
import { UserProvider } from './contexts/UserContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';

// Import main App component
import App from './App';

// Import global styles
import './index.css';

/**
 * Create root element and render the application
 * Includes all necessary context providers for state management
 */
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    {/* Browser Router for client-side routing */}
    <BrowserRouter>
      {/* Theme Provider for dark/light mode and high contrast */}
      <ThemeProvider>
        {/* Accessibility Provider for screen reader and keyboard navigation */}
        <AccessibilityProvider>
          {/* User Provider for user state and preferences */}
          <UserProvider>
            {/* Socket Provider for real-time communication */}
            <SocketProvider>
              {/* Main Application Component */}
              <App />
              
              {/* Toast notifications for user feedback */}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'var(--toast-bg)',
                    color: 'var(--toast-text)',
                    border: '1px solid var(--toast-border)',
                  },
                  success: {
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#ffffff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#ffffff',
                    },
                  },
                }}
              />
              
              {/* Screen reader announcements */}
              <ReactAnnouncer />
            </SocketProvider>
          </UserProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
