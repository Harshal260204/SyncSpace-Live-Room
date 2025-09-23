/**
 * Accessibility Controls Component
 * 
 * Comprehensive accessibility controls including:
 * - High contrast mode toggle
 * - Font size adjustment controls
 * - Keyboard shortcuts documentation
 * - Screen reader announcements
 * - Focus management
 * - ARIA live regions
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useBlindMode } from '../../contexts/BlindModeContext';

/**
 * Accessibility Controls Component
 * 
 * Provides comprehensive accessibility controls and settings
 * Includes high contrast mode, font sizing, and keyboard shortcuts
 */
const AccessibilityControls = ({ 
  isVisible = true,
  onToggleHighContrast,
  onFontSizeChange,
  onKeyboardShortcuts
}) => {
  const { 
    fontSize, 
    setFontSize, 
    screenReader, 
    setScreenReader, 
    keyboardNavigation, 
    setKeyboardNavigation,
    announce 
  } = useAccessibility();
  
  const { 
    highContrast, 
    setHighContrast
  } = useTheme();

  const { 
    enabled: blindModeEnabled, 
    toggleBlindMode,
    announceToScreenReader 
  } = useBlindMode();

  // Local state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showAccessibilityHelp, setShowAccessibilityHelp] = useState(false);
  const [currentFocus, setCurrentFocus] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  // Refs
  const controlsRef = useRef(null);
  const shortcutsRef = useRef(null);
  const helpRef = useRef(null);

  // Font size options
  const fontSizes = useMemo(() => [
    { value: 'small', label: 'Small', size: '0.875rem' },
    { value: 'medium', label: 'Medium', size: '1rem' },
    { value: 'large', label: 'Large', size: '1.125rem' },
    { value: 'xlarge', label: 'Extra Large', size: '1.25rem' },
    { value: 'xxlarge', label: 'XX Large', size: '1.5rem' }
  ], []);

  // Keyboard shortcuts configuration
  const keyboardShortcuts = {
    navigation: [
      { key: 'Tab', description: 'Navigate between interactive elements' },
      { key: 'Shift+Tab', description: 'Navigate backwards' },
      { key: 'Enter', description: 'Activate buttons and links' },
      { key: 'Space', description: 'Activate buttons and checkboxes' },
      { key: 'Escape', description: 'Close modals and menus' },
      { key: 'Arrow Keys', description: 'Navigate within lists and menus' }
    ],
    workspace: [
      { key: 'Ctrl+1', description: 'Switch to Code tab' },
      { key: 'Ctrl+2', description: 'Switch to Notes tab' },
      { key: 'Ctrl+3', description: 'Switch to Canvas tab' },
      { key: 'Ctrl+4', description: 'Switch to Chat tab' },
      { key: 'Ctrl+F', description: 'Toggle fullscreen mode' },
      { key: 'Ctrl+T', description: 'Toggle theme (light/dark)' }
    ],
    chat: [
      { key: 'Ctrl+Enter', description: 'Send message' },
      { key: 'Shift+Enter', description: 'New line in message' },
      { key: 'Ctrl+K', description: 'Focus chat input' },
      { key: 'Ctrl+L', description: 'Clear chat input' }
    ],
    drawing: [
      { key: 'P', description: 'Pen tool' },
      { key: 'B', description: 'Brush tool' },
      { key: 'E', description: 'Eraser tool' },
      { key: 'R', description: 'Rectangle tool' },
      { key: 'C', description: 'Circle tool' },
      { key: 'Ctrl+Z', description: 'Undo' },
      { key: 'Ctrl+Shift+Z', description: 'Redo' },
      { key: 'Ctrl+S', description: 'Save canvas' }
    ],
    code: [
      { key: 'Ctrl+B', description: 'Bold text' },
      { key: 'Ctrl+I', description: 'Italic text' },
      { key: 'Ctrl+U', description: 'Underline text' },
      { key: 'Ctrl+S', description: 'Save notes' },
      { key: 'Ctrl+A', description: 'Select all' }
    ],
    accessibility: [
      { key: 'Ctrl+Shift+H', description: 'Toggle high contrast mode' },
      { key: 'Ctrl+Plus', description: 'Increase font size' },
      { key: 'Ctrl+Minus', description: 'Decrease font size' },
      { key: 'Ctrl+0', description: 'Reset font size' },
      { key: 'Ctrl+Shift+S', description: 'Toggle screen reader mode' },
      { key: 'Ctrl+Shift+K', description: 'Toggle keyboard navigation' },
      { key: 'Ctrl+Shift+B', description: 'Toggle Blind Mode' }
    ],
    blindMode: [
      { key: 'Ctrl+1', description: 'Switch to Code tab' },
      { key: 'Ctrl+2', description: 'Switch to Notes tab' },
      { key: 'Ctrl+3', description: 'Switch to Canvas Log' },
      { key: 'Ctrl+4', description: 'Switch to Chat tab' },
      { key: 'Ctrl+Shift+D', description: 'Read last code change' },
      { key: 'Ctrl+Shift+N', description: 'Read last note update' },
      { key: 'Ctrl+Shift+C', description: 'Read last canvas action' },
      { key: 'Ctrl+Shift+M', description: 'Read last message' }
    ]
  };

  /**
   * Handle high contrast toggle
   */
  const handleHighContrastToggle = useCallback(() => {
    const newHighContrast = !highContrast;
    setHighContrast(newHighContrast);
    
    if (onToggleHighContrast) {
      onToggleHighContrast(newHighContrast);
    }

    // Announce change
    const message = newHighContrast ? 'High contrast mode enabled' : 'High contrast mode disabled';
    announce(message, 'polite');
    
    // Add to announcements
    setAnnouncements(prev => [...prev, {
      id: Date.now(),
      message,
      timestamp: Date.now()
    }]);
  }, [highContrast, setHighContrast, onToggleHighContrast, announce]);

  /**
   * Handle font size change
   */
  const handleFontSizeChange = useCallback((newFontSize) => {
    setFontSize(newFontSize);
    
    if (onFontSizeChange) {
      onFontSizeChange(newFontSize);
    }

    // Announce change
    const fontSizeLabel = fontSizes.find(fs => fs.value === newFontSize)?.label || newFontSize;
    const message = `Font size changed to ${fontSizeLabel}`;
    announce(message, 'polite');
    
    // Add to announcements
    setAnnouncements(prev => [...prev, {
      id: Date.now(),
      message,
      timestamp: Date.now()
    }]);
  }, [setFontSize, onFontSizeChange, announce, fontSizes]);

  /**
   * Handle screen reader toggle
   */
  const handleScreenReaderToggle = useCallback(() => {
    const newScreenReader = !screenReader;
    setScreenReader(newScreenReader);
    
    // Announce change
    const message = newScreenReader ? 'Screen reader mode enabled' : 'Screen reader mode disabled';
    announce(message, 'polite');
    
    // Add to announcements
    setAnnouncements(prev => [...prev, {
      id: Date.now(),
      message,
      timestamp: Date.now()
    }]);
  }, [screenReader, setScreenReader, announce]);

  /**
   * Handle keyboard navigation toggle
   */
  const handleKeyboardNavigationToggle = useCallback(() => {
    const newKeyboardNavigation = !keyboardNavigation;
    setKeyboardNavigation(newKeyboardNavigation);
    
    // Announce change
    const message = newKeyboardNavigation ? 'Keyboard navigation enabled' : 'Keyboard navigation disabled';
    announce(message, 'polite');
    
    // Add to announcements
    setAnnouncements(prev => [...prev, {
      id: Date.now(),
      message,
      timestamp: Date.now()
    }]);
  }, [keyboardNavigation, setKeyboardNavigation, announce]);

  /**
   * Handle Blind Mode toggle
   */
  const handleBlindModeToggle = useCallback(() => {
    toggleBlindMode();
    
    // Announce change
    const message = !blindModeEnabled ? 'Blind Mode enabled' : 'Blind Mode disabled';
    announce(message, 'polite');
    
    // Announce to screen reader
    announceToScreenReader(message);
    
    // Add to announcements
    setAnnouncements(prev => [...prev, {
      id: Date.now(),
      message,
      timestamp: Date.now()
    }]);

    // If enabling Blind Mode, provide instructions
    if (!blindModeEnabled) {
      setTimeout(() => {
        const instructions = 'Use Ctrl+1 Code, Ctrl+2 Notes, Ctrl+3 Canvas Log, Ctrl+4 Chat.';
        announceToScreenReader(instructions);
        announce(instructions, 'polite');
      }, 1000);
    }
  }, [blindModeEnabled, toggleBlindMode, announce, announceToScreenReader]);


  /**
   * Handle focus management
   */
  const handleFocus = useCallback((element) => {
    setCurrentFocus(element);
    
    if (screenReader) {
      const elementName = element.getAttribute('aria-label') || element.textContent || 'element';
      announce(`Focused on ${elementName}`, 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Render font size controls
   */
  const renderFontSizeControls = () => {
    return (
      <div className="space-y-2">
        <label htmlFor="font-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Font Size
        </label>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const currentIndex = fontSizes.findIndex(fs => fs.value === fontSize);
              if (currentIndex > 0) {
                handleFontSizeChange(fontSizes[currentIndex - 1].value);
              }
            }}
            disabled={fontSize === fontSizes[0].value}
            className="btn btn-sm btn-outline"
            aria-label="Decrease font size"
            title="Decrease font size (Ctrl+-)"
            onFocus={(e) => handleFocus(e.target)}
          >
            A-
          </button>
          
          <select
            id="font-size"
            value={fontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
            aria-label="Select font size"
            onFocus={(e) => handleFocus(e.target)}
          >
            {fontSizes.map((fs) => (
              <option key={fs.value} value={fs.value}>
                {fs.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => {
              const currentIndex = fontSizes.findIndex(fs => fs.value === fontSize);
              if (currentIndex < fontSizes.length - 1) {
                handleFontSizeChange(fontSizes[currentIndex + 1].value);
              }
            }}
            disabled={fontSize === fontSizes[fontSizes.length - 1].value}
            className="btn btn-sm btn-outline"
            aria-label="Increase font size"
            title="Increase font size (Ctrl++)"
            onFocus={(e) => handleFocus(e.target)}
          >
            A+
          </button>
        </div>
      </div>
    );
  };

  /**
   * Render accessibility toggles
   */
  const renderAccessibilityToggles = () => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="high-contrast" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            High Contrast Mode
          </label>
          <button
            id="high-contrast"
            onClick={handleHighContrastToggle}
            className={`btn btn-sm ${highContrast ? 'btn-primary' : 'btn-outline'}`}
            aria-label="Toggle high contrast mode"
            title="Toggle high contrast mode (Ctrl+Shift+H)"
            onFocus={(e) => handleFocus(e.target)}
          >
            {highContrast ? '🔆' : '🌙'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="screen-reader" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Screen Reader Mode
          </label>
          <button
            id="screen-reader"
            onClick={handleScreenReaderToggle}
            className={`btn btn-sm ${screenReader ? 'btn-primary' : 'btn-outline'}`}
            aria-label="Toggle screen reader mode"
            title="Toggle screen reader mode (Ctrl+Shift+S)"
            onFocus={(e) => handleFocus(e.target)}
          >
            {screenReader ? '🔊' : '🔇'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="keyboard-nav" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Keyboard Navigation
          </label>
          <button
            id="keyboard-nav"
            onClick={handleKeyboardNavigationToggle}
            className={`btn btn-sm ${keyboardNavigation ? 'btn-primary' : 'btn-outline'}`}
            aria-label="Toggle keyboard navigation"
            title="Toggle keyboard navigation (Ctrl+Shift+K)"
            onFocus={(e) => handleFocus(e.target)}
          >
            {keyboardNavigation ? '⌨️' : '🖱️'}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="blind-mode" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Blind Mode
          </label>
          <button
            id="blind-mode"
            onClick={handleBlindModeToggle}
            className={`btn btn-sm ${blindModeEnabled ? 'btn-primary' : 'btn-outline'}`}
            aria-label="Toggle Blind Mode"
            title="Toggle Blind Mode (Ctrl+Shift+B)"
            onFocus={(e) => handleFocus(e.target)}
          >
            {blindModeEnabled ? '👁️‍🗨️' : '👁️'}
          </button>
        </div>
      </div>
    );
  };

  /**
   * Render keyboard shortcuts
   */
  const renderKeyboardShortcuts = () => {
    if (!showKeyboardShortcuts) return null;

    return (
      <div
        ref={shortcutsRef}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        role="dialog"
        aria-labelledby="shortcuts-title"
        aria-modal="true"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="shortcuts-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="btn btn-sm btn-outline"
                aria-label="Close keyboard shortcuts"
                title="Close keyboard shortcuts (Escape)"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(keyboardShortcuts).map(([category, shortcuts]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {category.replace(/([A-Z])/g, ' $1').trim()}
                  </h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {shortcut.description}
                        </span>
                        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs rounded">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Quick Access
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Press <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">F1</kbd> for accessibility help or <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded">F2</kbd> for keyboard shortcuts.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render accessibility help
   */
  const renderAccessibilityHelp = () => {
    if (!showAccessibilityHelp) return null;

    return (
      <div
        ref={helpRef}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        role="dialog"
        aria-labelledby="help-title"
        aria-modal="true"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="help-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Accessibility Help
              </h2>
              <button
                onClick={() => setShowAccessibilityHelp(false)}
                className="btn btn-sm btn-outline"
                aria-label="Close accessibility help"
                title="Close accessibility help (Escape)"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Screen Reader Support
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• All interactive elements have proper ARIA labels</li>
                  <li>• Live regions announce changes and updates</li>
                  <li>• Focus management ensures proper navigation</li>
                  <li>• Semantic HTML structure for better understanding</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Keyboard Navigation
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Tab to navigate between elements</li>
                  <li>• Enter or Space to activate buttons</li>
                  <li>• Arrow keys to navigate within lists</li>
                  <li>• Escape to close modals and menus</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  High Contrast Mode
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Increases contrast between text and background</li>
                  <li>• Improves readability for users with visual impairments</li>
                  <li>• Can be toggled with Ctrl+Shift+H</li>
                  <li>• Settings are saved and persist across sessions</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Font Size Adjustment
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Multiple font size options available</li>
                  <li>• Use Ctrl+Plus to increase size</li>
                  <li>• Use Ctrl+Minus to decrease size</li>
                  <li>• Use Ctrl+0 to reset to default size</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Blind Mode
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Provides enhanced announcements for completely blind users</li>
                  <li>• Use Ctrl+1 for Code, Ctrl+2 for Notes, Ctrl+3 for Canvas Log, Ctrl+4 for Chat</li>
                  <li>• Use Ctrl+Shift+D to read last code change</li>
                  <li>• Use Ctrl+Shift+N to read last note update</li>
                  <li>• Use Ctrl+Shift+C to read last canvas action</li>
                  <li>• Use Ctrl+Shift+M to read last message</li>
                  <li>• Toggle with Ctrl+Shift+B or the Blind Mode button</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Testing Recommendations
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>• Test with NVDA (Windows) or VoiceOver (Mac)</li>
                  <li>• Test keyboard-only navigation</li>
                  <li>• Test with high contrast mode enabled</li>
                  <li>• Test with different font sizes</li>
                  <li>• Test with screen reader mode enabled</li>
                  <li>• Test with Blind Mode enabled for enhanced announcements</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div
      ref={controlsRef}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
      role="region"
      aria-label="Accessibility controls"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Accessibility Controls
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAccessibilityHelp(true)}
            className="btn btn-sm btn-outline"
            aria-label="Show accessibility help"
            title="Show accessibility help (F1)"
            onFocus={(e) => handleFocus(e.target)}
          >
            ❓ Help
          </button>
          <button
            onClick={() => setShowKeyboardShortcuts(true)}
            className="btn btn-sm btn-outline"
            aria-label="Show keyboard shortcuts"
            title="Show keyboard shortcuts (F2)"
            onFocus={(e) => handleFocus(e.target)}
          >
            ⌨️ Shortcuts
          </button>
        </div>
      </div>

      {/* Font Size Controls */}
      {renderFontSizeControls()}

      {/* Accessibility Toggles */}
      {renderAccessibilityToggles()}

      {/* Current Settings Display */}
      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Current Settings
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
          <div>Font Size: {fontSizes.find(fs => fs.value === fontSize)?.label}</div>
          <div>High Contrast: {highContrast ? 'On' : 'Off'}</div>
          <div>Screen Reader: {screenReader ? 'On' : 'Off'}</div>
          <div>Keyboard Nav: {keyboardNavigation ? 'On' : 'Off'}</div>
          <div>Blind Mode: {blindModeEnabled ? 'On' : 'Off'}</div>
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {renderKeyboardShortcuts()}

      {/* Accessibility Help Modal */}
      {renderAccessibilityHelp()}

      {/* Live Announcements */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="accessibility-announcements"
      >
        {announcements.map(announcement => (
          <div key={announcement.id}>
            {announcement.message}
          </div>
        ))}
      </div>

      {/* Focus Indicator */}
      {currentFocus && (
        <div className="sr-only" aria-live="polite">
          Focused on: {currentFocus.getAttribute('aria-label') || currentFocus.textContent}
        </div>
      )}
    </div>
  );
};

export default AccessibilityControls;
