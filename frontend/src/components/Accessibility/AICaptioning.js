/**
 * AI Captioning Component
 * 
 * Integration with free AI captioning tools for:
 * - Automatic image descriptions
 * - Sketch and drawing descriptions
 * - Real-time captioning
 * - Accessibility enhancement
 * - Multiple AI service support
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * AI Captioning Component
 * 
 * Provides AI-powered captioning and description services
 * Integrates with free AI tools for accessibility enhancement
 */
const AICaptioning = ({ 
  canvasData,
  imageData,
  onDescriptionGenerated,
  isEnabled = true 
}) => {
  const { announce, screenReader } = useAccessibility();

  // AI service state
  const [isProcessing, setIsProcessing] = useState(false);
  const [descriptions, setDescriptions] = useState([]);
  const [selectedService, setSelectedService] = useState('huggingface');
  const [apiKey, setApiKey] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);

  // Captioning state
  const [autoCaption, setAutoCaption] = useState(true);
  const [captionLanguage, setCaptionLanguage] = useState('en');
  const [captionConfidence, setCaptionConfidence] = useState(0.7);

  // Refs
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  // AI service configurations
  const aiServices = {
    huggingface: {
      name: 'Hugging Face',
      free: true,
      endpoint: 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base',
      description: 'Free image captioning using BLIP model'
    },
    google: {
      name: 'Google Vision API',
      free: true,
      endpoint: 'https://vision.googleapis.com/v1/images:annotate',
      description: 'Google Cloud Vision API (free tier available)'
    },
    azure: {
      name: 'Azure Computer Vision',
      free: true,
      endpoint: 'https://[region].cognitiveservices.azure.com/vision/v3.2/describe',
      description: 'Microsoft Azure Computer Vision (free tier available)'
    },
    local: {
      name: 'Local AI Model',
      free: true,
      endpoint: 'http://localhost:8000/api/caption',
      description: 'Local AI model (requires local setup)'
    }
  };

  /**
   * Initialize AI captioning
   */
  useEffect(() => {
    if (isEnabled) {
      // Load saved API key
      const savedApiKey = localStorage.getItem('ai-captioning-api-key');
      if (savedApiKey) {
        setApiKey(savedApiKey);
        setIsConfigured(true);
      }

      // Set up canvas observer for auto-captioning
      if (autoCaption && canvasData) {
        generateCanvasDescription();
      }
    }
  }, [isEnabled, autoCaption, canvasData]);

  /**
   * Generate description for canvas content
   */
  const generateCanvasDescription = useCallback(async () => {
    if (!isEnabled || !canvasData || isProcessing) return;

    setIsProcessing(true);

    try {
      // Convert canvas to image
      const imageDataUrl = await canvasToImage(canvasData);
      
      // Generate description using selected AI service
      const description = await generateImageDescription(imageDataUrl);
      
      if (description) {
        const newDescription = {
          id: `desc-${Date.now()}-${Math.random()}`,
          type: 'canvas',
          content: description.text,
          confidence: description.confidence || 0.8,
          timestamp: Date.now(),
          service: selectedService,
          language: captionLanguage
        };

        setDescriptions(prev => [...prev, newDescription]);

        // Announce to screen readers
        if (screenReader) {
          announce(`Canvas description: ${description.text}`, 'polite');
        }

        // Callback to parent
        if (onDescriptionGenerated) {
          onDescriptionGenerated(newDescription);
        }
      }
    } catch (error) {
      console.error('Error generating canvas description:', error);
      
      if (screenReader) {
        announce('Error generating canvas description', 'polite');
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isEnabled, canvasData, isProcessing, selectedService, captionLanguage, screenReader, announce, onDescriptionGenerated]);

  /**
   * Generate description for uploaded image
   */
  const generateImageDescription = useCallback(async (imageDataUrl) => {
    if (!isConfigured) {
      throw new Error('AI service not configured');
    }

    const service = aiServices[selectedService];
    if (!service) {
      throw new Error('Invalid AI service selected');
    }

    // Convert data URL to blob
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();

    // Prepare request based on service
    let requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    // Add API key if required
    if (apiKey) {
      if (selectedService === 'huggingface') {
        requestOptions.headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (selectedService === 'google') {
        requestOptions.headers['X-API-Key'] = apiKey;
      } else if (selectedService === 'azure') {
        requestOptions.headers['Ocp-Apim-Subscription-Key'] = apiKey;
      }
    }

    // Prepare request body based on service
    let requestBody;
    if (selectedService === 'huggingface') {
      requestBody = {
        inputs: imageDataUrl
      };
    } else if (selectedService === 'google') {
      requestBody = {
        requests: [{
          image: {
            content: imageDataUrl.split(',')[1] // Remove data:image/...;base64, prefix
          },
          features: [{
            type: 'LABEL_DETECTION',
            maxResults: 10
          }]
        }]
      };
    } else if (selectedService === 'azure') {
      requestBody = blob;
      requestOptions.headers['Content-Type'] = 'application/octet-stream';
    }

    // Make API request
    const response = await fetch(service.endpoint, {
      ...requestOptions,
      body: selectedService === 'azure' ? blob : JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    // Parse response based on service
    return parseAIResponse(result, selectedService);
  }, [selectedService, apiKey, isConfigured, aiServices]);

  /**
   * Parse AI service response
   */
  const parseAIResponse = useCallback((response, service) => {
    switch (service) {
      case 'huggingface':
        if (Array.isArray(response) && response.length > 0) {
          return {
            text: response[0].generated_text || 'No description available',
            confidence: 0.8
          };
        }
        break;
      
      case 'google':
        if (response.responses && response.responses[0] && response.responses[0].labelAnnotations) {
          const labels = response.responses[0].labelAnnotations;
          const description = labels.map(label => label.description).join(', ');
          return {
            text: description || 'No description available',
            confidence: labels[0]?.score || 0.8
          };
        }
        break;
      
      case 'azure':
        if (response.description && response.description.captions) {
          const caption = response.description.captions[0];
          return {
            text: caption.text || 'No description available',
            confidence: caption.confidence || 0.8
          };
        }
        break;
      
      case 'local':
        if (response.description) {
          return {
            text: response.description,
            confidence: response.confidence || 0.8
          };
        }
        break;
    }

    return {
      text: 'No description available',
      confidence: 0.0
    };
  }, []);

  /**
   * Convert canvas data to image
   */
  const canvasToImage = useCallback(async (canvasData) => {
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 800;
        canvas.height = 600;
        
        // Load canvas data
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = canvasData;
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  /**
   * Handle API key configuration
   */
  const handleApiKeyChange = useCallback((newApiKey) => {
    setApiKey(newApiKey);
    localStorage.setItem('ai-captioning-api-key', newApiKey);
    setIsConfigured(!!newApiKey);
  }, []);

  /**
   * Handle service selection
   */
  const handleServiceChange = useCallback((service) => {
    setSelectedService(service);
    localStorage.setItem('ai-captioning-service', service);
  }, []);

  /**
   * Manual description generation
   */
  const handleGenerateDescription = useCallback(() => {
    if (canvasData) {
      generateCanvasDescription();
    }
  }, [canvasData, generateCanvasDescription]);

  /**
   * Clear descriptions
   */
  const handleClearDescriptions = useCallback(() => {
    setDescriptions([]);
    
    if (screenReader) {
      announce('Descriptions cleared', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Render service configuration
   */
  const renderServiceConfiguration = () => {
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="ai-service" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            AI Service
          </label>
          <select
            id="ai-service"
            value={selectedService}
            onChange={(e) => handleServiceChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
            aria-label="Select AI service"
          >
            {Object.entries(aiServices).map(([key, service]) => (
              <option key={key} value={key}>
                {service.name} - {service.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            API Key (Optional)
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="Enter API key for better performance"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-gray-100"
            aria-label="API key input"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Some services work without API keys, but performance may be limited
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoCaption}
              onChange={(e) => setAutoCaption(e.target.checked)}
              className="mr-2"
              aria-label="Enable auto-captioning"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-captioning</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isConfigured}
              disabled
              className="mr-2"
              aria-label="Service configured"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Configured</span>
          </label>
        </div>
      </div>
    );
  };

  /**
   * Render description controls
   */
  const renderDescriptionControls = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            AI Descriptions
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleGenerateDescription}
              disabled={!isConfigured || isProcessing || !canvasData}
              className="btn btn-sm btn-primary"
              aria-label="Generate description"
              title="Generate description for current canvas"
            >
              {isProcessing ? '🔄 Processing...' : '🤖 Generate'}
            </button>
            <button
              onClick={handleClearDescriptions}
              disabled={descriptions.length === 0}
              className="btn btn-sm btn-outline"
              aria-label="Clear descriptions"
              title="Clear all descriptions"
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {descriptions.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {descriptions.map((description) => (
              <div
                key={description.id}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {description.type === 'canvas' ? 'Canvas' : 'Image'} Description
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(description.confidence * 100)}% confidence
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(description.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {description.content}
                </p>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Generated by {aiServices[description.service]?.name || description.service}
                </div>
              </div>
            ))}
          </div>
        )}

        {descriptions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">🤖</p>
            <p>No descriptions generated yet</p>
            <p className="text-sm mt-1">Click "Generate" to create AI descriptions</p>
          </div>
        )}
      </div>
    );
  };

  if (!isEnabled) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          AI Captioning
        </h2>
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isConfigured ? 'Ready' : 'Not Configured'}
          </span>
        </div>
      </div>

      {/* Service Configuration */}
      {renderServiceConfiguration()}

      {/* Description Controls */}
      {renderDescriptionControls()}

      {/* Help Text */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          How to Use
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Select an AI service from the dropdown</li>
          <li>• Optionally enter an API key for better performance</li>
          <li>• Enable auto-captioning for automatic descriptions</li>
          <li>• Click "Generate" to create descriptions manually</li>
          <li>• Descriptions are announced to screen readers</li>
        </ul>
      </div>

      {/* Screen Reader Announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isProcessing && 'Generating AI description...'}
        {descriptions.length > 0 && `Generated ${descriptions.length} descriptions`}
      </div>
    </div>
  );
};

export default AICaptioning;
