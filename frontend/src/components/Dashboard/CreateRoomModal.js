/**
 * Create Room Modal Component
 * 
 * Modal for creating new collaborative rooms with:
 * - Room configuration options
 * - Accessibility settings
 * - Form validation
 * - Keyboard navigation
 */

import React, { useState } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * Create Room Modal Component
 * 
 * Provides form for creating new collaborative rooms
 * Includes accessibility features and validation
 */
const CreateRoomModal = ({ onClose, onCreateRoom }) => {
  const { announce, screenReader } = useAccessibility();
  
  // Form state
  const [formData, setFormData] = useState({
    roomName: '',
    description: '',
    maxParticipants: 50,
    settings: {
      allowAnonymous: true,
      allowCodeEditing: true,
      allowNotesEditing: true,
      allowCanvasDrawing: true,
      allowChat: true,
      isPublic: true,
    },
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null,
      }));
    }
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

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.roomName.trim()) {
      newErrors.roomName = 'Room name is required';
    } else if (formData.roomName.length > 100) {
      newErrors.roomName = 'Room name must be less than 100 characters';
    }
    
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    if (formData.maxParticipants < 2 || formData.maxParticipants > 100) {
      newErrors.maxParticipants = 'Max participants must be between 2 and 100';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      if (screenReader) {
        announce('Please fix the form errors before submitting', 'assertive');
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      onCreateRoom(formData);
      
      if (screenReader) {
        announce(`Room "${formData.roomName}" created successfully`, 'polite');
      }
      
    } catch (error) {
      console.error('Error creating room:', error);
      
      if (screenReader) {
        announce('Failed to create room. Please try again.', 'assertive');
      }
    } finally {
      setIsSubmitting(false);
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
              Create New Room
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Room Name */}
            <div>
              <label htmlFor="room-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Name *
              </label>
              <input
                id="room-name"
                type="text"
                value={formData.roomName}
                onChange={(e) => handleInputChange('roomName', e.target.value)}
                className={`input w-full ${errors.roomName ? 'border-red-500' : ''}`}
                placeholder="Enter room name"
                aria-describedby={errors.roomName ? 'room-name-error' : 'room-name-help'}
                maxLength={100}
                required
              />
              {errors.roomName ? (
                <p id="room-name-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.roomName}
                </p>
              ) : (
                <p id="room-name-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Choose a descriptive name for your room
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="room-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="room-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`input w-full ${errors.description ? 'border-red-500' : ''}`}
                placeholder="Enter room description (optional)"
                aria-describedby={errors.description ? 'room-description-error' : 'room-description-help'}
                rows={3}
                maxLength={500}
              />
              {errors.description ? (
                <p id="room-description-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.description}
                </p>
              ) : (
                <p id="room-description-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Describe what this room is for (optional)
                </p>
              )}
            </div>

            {/* Max Participants */}
            <div>
              <label htmlFor="max-participants" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Participants
              </label>
              <input
                id="max-participants"
                type="number"
                value={formData.maxParticipants}
                onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                className={`input w-full ${errors.maxParticipants ? 'border-red-500' : ''}`}
                aria-describedby={errors.maxParticipants ? 'max-participants-error' : 'max-participants-help'}
                min="2"
                max="100"
              />
              {errors.maxParticipants ? (
                <p id="max-participants-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.maxParticipants}
                </p>
              ) : (
                <p id="max-participants-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Maximum number of participants (2-100)
                </p>
              )}
            </div>

            {/* Room Settings */}
            <div>
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                Room Features
              </h3>
              
              <div className="space-y-4">
                {[
                  { key: 'allowCodeEditing', label: 'Code Editing', description: 'Enable collaborative code editing' },
                  { key: 'allowNotesEditing', label: 'Notes Editing', description: 'Enable collaborative note-taking' },
                  { key: 'allowCanvasDrawing', label: 'Canvas Drawing', description: 'Enable collaborative drawing' },
                  { key: 'allowChat', label: 'Chat', description: 'Enable real-time chat' },
                  { key: 'allowAnonymous', label: 'Anonymous Users', description: 'Allow users without accounts to join' },
                  { key: 'isPublic', label: 'Public Room', description: 'Make room discoverable in room list' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {setting.label}
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {setting.description}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.settings[setting.key]}
                      onChange={(e) => handleNestedInputChange('settings', setting.key, e.target.checked)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      aria-describedby={`${setting.key}-help`}
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
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomModal;
