/**
 * Loading Spinner Component
 * 
 * Reusable loading spinner with accessibility features
 * Supports different sizes and provides screen reader announcements
 */

import React from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * Loading Spinner Component
 * 
 * Displays a loading spinner with proper accessibility support
 * 
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner ('small', 'medium', 'large')
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.message - Message to announce to screen readers
 * @param {boolean} props.centered - Whether to center the spinner
 */
const LoadingSpinner = ({ 
  size = 'medium', 
  className = '', 
  message = 'Loading...',
  centered = false 
}) => {
  const { screenReader, announce } = useAccessibility();

  // Size configurations
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  // Announce loading to screen readers
  React.useEffect(() => {
    if (screenReader && message) {
      announce(message, 'polite');
    }
  }, [screenReader, message, announce]);

  const spinnerClasses = `
    spinner border-2 border-gray-300 border-t-primary-600
    ${sizeClasses[size]}
    ${className}
  `;

  const containerClasses = `
    ${centered ? 'flex items-center justify-center' : ''}
  `;

  return (
    <div className={containerClasses}>
      <div 
        className={spinnerClasses}
        role="status"
        aria-label={message}
      >
        <span className="sr-only">{message}</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
