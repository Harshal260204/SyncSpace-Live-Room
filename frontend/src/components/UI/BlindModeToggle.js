/**
 * Blind Mode Toggle Component
 * 
 * A toggle button component for enabling/disabling Blind Mode
 * Includes keyboard shortcuts and accessibility features
 */

import React from 'react';
import { useBlindMode } from '../../contexts/BlindModeContext';

/**
 * Blind Mode Toggle Component
 * 
 * Provides a visual toggle for Blind Mode with proper accessibility
 * Shows current state and provides keyboard shortcut information
 */
const BlindModeToggle = ({ className = '', showShortcut = true }) => {
  const { enabled, toggleBlindMode, getBlindModeStatus } = useBlindMode();

  const handleToggle = () => {
    toggleBlindMode();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleBlindMode();
    }
  };

  return (
    <div className={`blind-mode-toggle ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${enabled 
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }
          ${enabled ? 'blind-mode-active' : 'blind-mode-inactive'}
        `}
        aria-pressed={enabled}
        aria-label={`Blind Mode is ${getBlindModeStatus()}. Click to toggle.`}
        title={`Blind Mode is ${getBlindModeStatus()}. Press Ctrl+B to toggle.`}
      >
        {/* Toggle Icon */}
        <div className="flex items-center justify-center w-5 h-5">
          {enabled ? (
            <svg 
              className="w-5 h-5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
          ) : (
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          )}
        </div>

        {/* Toggle Text */}
        <span className="font-medium">
          Blind Mode
        </span>

        {/* Status Indicator */}
        <span 
          className={`
            text-xs px-2 py-1 rounded-full font-medium
            ${enabled 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600'
            }
          `}
          aria-hidden="true"
        >
          {enabled ? 'ON' : 'OFF'}
        </span>
      </button>

      {/* Keyboard Shortcut Info */}
      {showShortcut && (
        <div className="mt-2 text-xs text-gray-500">
          <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">
            Ctrl+B
          </kbd>
          {' '}to toggle
        </div>
      )}

      {/* Screen Reader Status Announcement */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
      >
        Blind Mode is {getBlindModeStatus()}
      </div>
    </div>
  );
};

export default BlindModeToggle;
