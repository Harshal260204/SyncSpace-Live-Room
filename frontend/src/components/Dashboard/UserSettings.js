/**
 * User Settings Component
 * 
 * Provides user settings and preferences management including:
 * - Theme selection (light/dark/auto)
 * - High contrast mode toggle
 * - Font size adjustment
 * - Accessibility preferences
 * - Notification settings
 */

import React, { useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * User Settings Modal Component
 * 
 * Displays user settings in a modal dialog
 * Includes accessibility features and keyboard navigation
 */
const UserSettings = ({ onClose }) => {
  const { user, updatePreferences } = useUser();
  const { theme, setTheme, highContrast, setHighContrast, getThemeDescription } = useTheme();
  const { 
    fontSize, 
    setFontSize, 
    screenReader, 
    setScreenReader, 
    keyboardNavigation, 
    setKeyboardNavigation,
    announceChanges,
    setAnnounceChanges,
    announce 
  } = useAccessibility();

  // Local state for form values
  const [formData, setFormData] = useState({
    theme: theme,
    highContrast: highContrast,
    fontSize: fontSize,
    screenReader: screenReader,
    keyboardNavigation: keyboardNavigation,
    announceChanges: announceChanges,
    cursorColor: user?.preferences?.appearance?.cursorColor || '#3B82F6',
    notifications: {
      chatMessages: user?.preferences?.notifications?.chatMessages ?? true,
      userJoinLeave: user?.preferences?.notifications?.userJoinLeave ?? true,
      codeChanges: user?.preferences?.notifications?.codeChanges ?? false,
      systemAnnouncements: user?.preferences?.notifications?.systemAnnouncements ?? true,
    },
  });

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle nested object changes
  const handleNestedInputChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    try {
      // Update theme context
      setTheme(formData.theme);
      setHighContrast(formData.highContrast);
      
      // Update accessibility context
      setFontSize(formData.fontSize);
      setScreenReader(formData.screenReader);
      setKeyboardNavigation(formData.keyboardNavigation);
      setAnnounceChanges(formData.announceChanges);
      
      // Update user preferences
      updatePreferences({
        accessibility: {
          screenReader: formData.screenReader,
          highContrast: formData.highContrast,
          fontSize: formData.fontSize,
          announceChanges: formData.announceChanges,
          keyboardNavigation: formData.keyboardNavigation,
        },
        appearance: {
          theme: formData.theme,
          cursorColor: formData.cursorColor,
        },
        notifications: formData.notifications,
      });
      
      announce('Settings saved successfully', 'polite');
      onClose();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      announce('Failed to save settings. Please try again.', 'assertive');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Set up keyboard navigation
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Settings
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Theme Settings */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Appearance
              </h3>
              
              <div className="space-y-4">
                {/* Theme Selection */}
                <div>
                  <label htmlFor="theme-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Theme
                  </label>
                  <select
                    id="theme-select"
                    value={formData.theme}
                    onChange={(e) => handleInputChange('theme', e.target.value)}
                    className="input w-full"
                    aria-describedby="theme-help"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                  <p id="theme-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Current: {getThemeDescription()}
                  </p>
                </div>

                {/* High Contrast Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="high-contrast" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      High Contrast Mode
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Increases contrast for better visibility
                    </p>
                  </div>
                  <input
                    id="high-contrast"
                    type="checkbox"
                    checked={formData.highContrast}
                    onChange={(e) => handleInputChange('highContrast', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    aria-describedby="high-contrast-help"
                  />
                </div>
                <p id="high-contrast-help" className="text-sm text-gray-500 dark:text-gray-400">
                  Enables high contrast colors for better accessibility
                </p>

                {/* Cursor Color */}
                <div>
                  <label htmlFor="cursor-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cursor Color
                  </label>
                  <input
                    id="cursor-color"
                    type="color"
                    value={formData.cursorColor}
                    onChange={(e) => handleInputChange('cursorColor', e.target.value)}
                    className="h-10 w-20 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                    aria-describedby="cursor-color-help"
                  />
                  <p id="cursor-color-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Color for your cursor in collaborative sessions
                  </p>
                </div>
              </div>
            </div>

            {/* Accessibility Settings */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Accessibility
              </h3>
              
              <div className="space-y-4">
                {/* Font Size */}
                <div>
                  <label htmlFor="font-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Font Size
                  </label>
                  <select
                    id="font-size"
                    value={formData.fontSize}
                    onChange={(e) => handleInputChange('fontSize', e.target.value)}
                    className="input w-full"
                    aria-describedby="font-size-help"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                  <p id="font-size-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Adjusts text size throughout the application
                  </p>
                </div>

                {/* Screen Reader Support */}
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="screen-reader" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Screen Reader Support
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Optimizes interface for screen readers
                    </p>
                  </div>
                  <input
                    id="screen-reader"
                    type="checkbox"
                    checked={formData.screenReader}
                    onChange={(e) => handleInputChange('screenReader', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    aria-describedby="screen-reader-help"
                  />
                </div>
                <p id="screen-reader-help" className="text-sm text-gray-500 dark:text-gray-400">
                  Enables screen reader optimizations and live announcements
                </p>

                {/* Keyboard Navigation */}
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="keyboard-nav" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enhanced Keyboard Navigation
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Improves keyboard navigation experience
                    </p>
                  </div>
                  <input
                    id="keyboard-nav"
                    type="checkbox"
                    checked={formData.keyboardNavigation}
                    onChange={(e) => handleInputChange('keyboardNavigation', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    aria-describedby="keyboard-nav-help"
                  />
                </div>
                <p id="keyboard-nav-help" className="text-sm text-gray-500 dark:text-gray-400">
                  Enhances keyboard navigation and focus management
                </p>

                {/* Live Announcements */}
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="announcements" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Live Announcements
                    </label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Announces changes and updates
                    </p>
                  </div>
                  <input
                    id="announcements"
                    type="checkbox"
                    checked={formData.announceChanges}
                    onChange={(e) => handleInputChange('announceChanges', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    aria-describedby="announcements-help"
                  />
                </div>
                <p id="announcements-help" className="text-sm text-gray-500 dark:text-gray-400">
                  Provides live announcements for important changes
                </p>
              </div>
            </div>

            {/* Notification Settings */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Notifications
              </h3>
              
              <div className="space-y-4">
                {Object.entries(formData.notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <label htmlFor={`notification-${key}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {getNotificationDescription(key)}
                      </p>
                    </div>
                    <input
                      id={`notification-${key}`}
                      type="checkbox"
                      checked={value}
                      onChange={(e) => handleNestedInputChange('notifications', key, e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/**
 * Get notification description
 * 
 * @param {string} key - Notification key
 * @returns {string} Description text
 */
const getNotificationDescription = (key) => {
  const descriptions = {
    chatMessages: 'Show notifications for new chat messages',
    userJoinLeave: 'Show notifications when users join or leave',
    codeChanges: 'Show notifications for code changes',
    systemAnnouncements: 'Show system announcements and updates',
  };
  
  return descriptions[key] || 'Notification setting';
};

export default UserSettings;
