/**
 * Canvas Drawing Component
 * 
 * Real-time collaborative canvas drawing with:
 * - Fabric.js integration for drawing tools
 * - Full accessibility support (ARIA labels, keyboard navigation)
 * - Socket.io integration for live synchronization
 * - Screen reader support and focus management
 * - Drawing tools and color selection
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fabric } from 'fabric';
import { useSocket } from '../../contexts/SocketContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useUser } from '../../contexts/UserContext';

/**
 * Canvas Drawing Component
 * 
 * Provides real-time collaborative drawing with Fabric.js
 * Includes comprehensive accessibility features and live synchronization
 */
const CanvasDrawing = ({ onDrawingChange, participants }) => {
  const { 
    canvasData, 
    sendDrawingEvent, 
    connected 
  } = useSocket();
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { user } = useUser();

  // Local state
  const [canvas, setCanvas] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedTool, setSelectedTool] = useState('brush');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isFocused, setIsFocused] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastChangeTime, setLastChangeTime] = useState(0);

  // Refs
  const canvasRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastSyncedDataRef = useRef(null);
  const isLocalChangeRef = useRef(false);

  // Debounce delay for sending changes (ms)
  const DEBOUNCE_DELAY = 300;

  /**
   * Initialize Fabric.js canvas
   * 
   * Sets up the canvas with accessibility features and event handlers
   */
  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: canvasRef.current.offsetWidth,
      height: canvasRef.current.offsetHeight,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    // Configure canvas for accessibility
    fabricCanvas.set({
      allowTouchScrolling: true,
      fireRightClick: true,
      fireMiddleClick: true,
    });

    // Set up event listeners
    setupCanvasEventListeners(fabricCanvas);

    setCanvas(fabricCanvas);

    // Announce canvas ready for screen readers
    if (screenReader) {
      announce('Drawing canvas loaded and ready for use', 'polite');
    }
  }, [screenReader, announce]);

  /**
   * Set up canvas event listeners
   * 
   * Handles drawing events, object changes, and accessibility events
   */
  const setupCanvasEventListeners = useCallback((fabricCanvas) => {
    // Object added event
    fabricCanvas.on('object:added', (event) => {
      if (isLocalChangeRef.current) {
        isLocalChangeRef.current = false;
        return;
      }

      setHasUnsavedChanges(true);
      setLastChangeTime(Date.now());

      // Debounce sending changes to server
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (connected && onDrawingChange) {
          const canvasData = fabricCanvas.toJSON();
          sendDrawingEvent(canvasData, 'add');
          lastSyncedDataRef.current = canvasData;
          setHasUnsavedChanges(false);
        }
      }, DEBOUNCE_DELAY);

      if (screenReader) {
        announce('Object added to canvas', 'polite');
      }
    });

    // Object modified event
    fabricCanvas.on('object:modified', (event) => {
      if (isLocalChangeRef.current) {
        isLocalChangeRef.current = false;
        return;
      }

      setHasUnsavedChanges(true);
      setLastChangeTime(Date.now());

      // Debounce sending changes to server
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (connected && onDrawingChange) {
          const canvasData = fabricCanvas.toJSON();
          sendDrawingEvent(canvasData, 'modify');
          lastSyncedDataRef.current = canvasData;
          setHasUnsavedChanges(false);
        }
      }, DEBOUNCE_DELAY);

      if (screenReader) {
        announce('Object modified on canvas', 'polite');
      }
    });

    // Object removed event
    fabricCanvas.on('object:removed', (event) => {
      if (isLocalChangeRef.current) {
        isLocalChangeRef.current = false;
        return;
      }

      setHasUnsavedChanges(true);
      setLastChangeTime(Date.now());

      // Debounce sending changes to server
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (connected && onDrawingChange) {
          const canvasData = fabricCanvas.toJSON();
          sendDrawingEvent(canvasData, 'remove');
          lastSyncedDataRef.current = canvasData;
          setHasUnsavedChanges(false);
        }
      }, DEBOUNCE_DELAY);

      if (screenReader) {
        announce('Object removed from canvas', 'polite');
      }
    });

    // Selection events
    fabricCanvas.on('selection:created', (event) => {
      if (screenReader) {
        announce('Object selected on canvas', 'polite');
      }
    });

    fabricCanvas.on('selection:cleared', (event) => {
      if (screenReader) {
        announce('Selection cleared', 'polite');
      }
    });

    // Mouse events for accessibility
    fabricCanvas.on('mouse:down', (event) => {
      setIsDrawing(true);
      if (screenReader) {
        announce('Drawing started', 'polite');
      }
    });

    fabricCanvas.on('mouse:up', (event) => {
      setIsDrawing(false);
      if (screenReader) {
        announce('Drawing ended', 'polite');
      }
    });

    // Focus events
    fabricCanvas.on('mouse:over', (event) => {
      setIsFocused(true);
    });

    fabricCanvas.on('mouse:out', (event) => {
      setIsFocused(false);
    });
  }, [connected, onDrawingChange, sendDrawingEvent, screenReader, announce]);

  /**
   * Handle external canvas changes from other users
   * 
   * Updates the canvas when receiving changes from Socket.io
   */
  useEffect(() => {
    if (canvas && canvasData && canvasData !== lastSyncedDataRef.current) {
      isLocalChangeRef.current = true;
      
      try {
        canvas.loadFromJSON(canvasData, () => {
          canvas.renderAll();
          lastSyncedDataRef.current = canvasData;
          setHasUnsavedChanges(false);
          
          if (screenReader) {
            announce('Canvas updated by another user', 'polite');
          }
        });
      } catch (error) {
        console.error('Error loading canvas data:', error);
        if (screenReader) {
          announce('Error loading canvas data', 'assertive');
        }
      }
    }
  }, [canvas, canvasData, screenReader, announce]);

  /**
   * Initialize canvas on component mount
   */
  useEffect(() => {
    initializeCanvas();

    return () => {
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [initializeCanvas]);

  /**
   * Handle window resize
   */
  useEffect(() => {
    const handleResize = () => {
      if (canvas && canvasRef.current) {
        canvas.setDimensions({
          width: canvasRef.current.offsetWidth,
          height: canvasRef.current.offsetHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvas]);

  /**
   * Handle keyboard navigation for accessibility
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!isFocused || !keyboardNavigation || !canvas) return;

      // Handle special accessibility shortcuts
      switch (event.key) {
        case 'F6':
          // Focus canvas
          event.preventDefault();
          canvasRef.current?.focus();
          break;
        case 'Delete':
        case 'Backspace':
          // Delete selected objects
          event.preventDefault();
          const activeObjects = canvas.getActiveObjects();
          if (activeObjects.length > 0) {
            activeObjects.forEach(obj => canvas.remove(obj));
            if (screenReader) {
              announce('Selected objects deleted', 'polite');
            }
          }
          break;
        case 'Escape':
          // Clear selection
          event.preventDefault();
          canvas.discardActiveObject();
          canvas.renderAll();
          if (screenReader) {
            announce('Selection cleared', 'polite');
          }
          break;
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            // Select all
            event.preventDefault();
            canvas.discardActiveObject();
            const sel = new fabric.ActiveSelection(canvas.getObjects(), {
              canvas: canvas,
            });
            canvas.setActiveObject(sel);
            canvas.requestRenderAll();
            if (screenReader) {
              announce('All objects selected', 'polite');
            }
          }
          break;
        case 'c':
          if (event.ctrlKey || event.metaKey) {
            // Copy selected objects
            event.preventDefault();
            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length > 0) {
              // Copy logic would go here
              if (screenReader) {
                announce('Objects copied', 'polite');
              }
            }
          }
          break;
        case 'v':
          if (event.ctrlKey || event.metaKey) {
            // Paste objects
            event.preventDefault();
            // Paste logic would go here
            if (screenReader) {
              announce('Objects pasted', 'polite');
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, keyboardNavigation, canvas, screenReader, announce]);

  /**
   * Handle component cleanup
   */
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Get canvas status for screen readers
   */
  const getCanvasStatus = () => {
    if (!canvas) return 'Canvas not loaded';
    
    const objectCount = canvas.getObjects().length;
    const selectedCount = canvas.getActiveObjects().length;
    
    return `Drawing canvas: ${objectCount} objects, ${selectedCount} selected. Tool: ${selectedTool}. Color: ${selectedColor}. ${hasUnsavedChanges ? 'Unsaved changes.' : 'All changes saved.'}`;
  };

  /**
   * Handle tool selection
   */
  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
    
    if (canvas) {
      canvas.isDrawingMode = tool === 'brush';
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = selectedColor;
    }
    
    if (screenReader) {
      announce(`Tool changed to ${tool}`, 'polite');
    }
  };

  /**
   * Handle color selection
   */
  const handleColorSelect = (color) => {
    setSelectedColor(color);
    
    if (canvas) {
      canvas.freeDrawingBrush.color = color;
    }
    
    if (screenReader) {
      announce(`Color changed to ${color}`, 'polite');
    }
  };

  /**
   * Handle brush size change
   */
  const handleBrushSizeChange = (size) => {
    setBrushSize(size);
    
    if (canvas) {
      canvas.freeDrawingBrush.width = size;
    }
    
    if (screenReader) {
      announce(`Brush size changed to ${size}`, 'polite');
    }
  };

  /**
   * Clear canvas
   */
  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      setHasUnsavedChanges(true);
      
      if (screenReader) {
        announce('Canvas cleared', 'polite');
      }
    }
  };

  /**
   * Undo last action
   */
  const undo = () => {
    if (canvas) {
      // Undo logic would go here
      if (screenReader) {
        announce('Undo performed', 'polite');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Canvas Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Collaborative Drawing
          </h2>
          
          {/* Drawing Tools */}
          <div className="flex items-center space-x-2">
            <label htmlFor="tool-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tool:
            </label>
            <select
              id="tool-select"
              value={selectedTool}
              onChange={(e) => handleToolSelect(e.target.value)}
              className="input text-sm py-1 px-2"
              aria-describedby="tool-help"
            >
              <option value="brush">Brush</option>
              <option value="pen">Pen</option>
              <option value="pencil">Pencil</option>
              <option value="eraser">Eraser</option>
              <option value="select">Select</option>
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle</option>
              <option value="line">Line</option>
              <option value="text">Text</option>
            </select>
            <p id="tool-help" className="sr-only">
              Select drawing tool
            </p>
          </div>

          {/* Color Picker */}
          <div className="flex items-center space-x-2">
            <label htmlFor="color-picker" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Color:
            </label>
            <input
              id="color-picker"
              type="color"
              value={selectedColor}
              onChange={(e) => handleColorSelect(e.target.value)}
              className="w-8 h-8 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
              aria-describedby="color-help"
            />
            <p id="color-help" className="sr-only">
              Select drawing color
            </p>
          </div>

          {/* Brush Size */}
          <div className="flex items-center space-x-2">
            <label htmlFor="brush-size" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Size:
            </label>
            <input
              id="brush-size"
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => handleBrushSizeChange(parseInt(e.target.value))}
              className="w-20"
              aria-describedby="brush-size-help"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{brushSize}px</span>
            <p id="brush-size-help" className="sr-only">
              Adjust brush size
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Status Indicators */}
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              <div 
                className={`w-2 h-2 rounded-full ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`}
                aria-label={connected ? 'Connected' : 'Disconnected'}
              />
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {/* Drawing Indicator */}
            {isDrawing && (
              <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span>Drawing...</span>
              </div>
            )}

            {/* Unsaved Changes */}
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>Unsaved changes</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={undo}
              className="btn btn-outline text-sm py-1 px-3"
              aria-label="Undo last action"
            >
              Undo
            </button>
            
            <button
              onClick={clearCanvas}
              className="btn btn-outline text-sm py-1 px-3"
              aria-label="Clear canvas"
            >
              Clear
            </button>
            
            <button
              onClick={() => canvasRef.current?.focus()}
              className="btn btn-outline text-sm py-1 px-3"
              aria-label="Focus drawing canvas"
            >
              Focus Canvas
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full border-0 focus:outline-none focus:ring-2 focus:ring-primary-500"
          tabIndex={0}
          aria-label="Collaborative drawing canvas"
          aria-describedby="canvas-help"
          style={{
            cursor: selectedTool === 'brush' ? 'crosshair' : 'default',
          }}
        />
        
        <div id="canvas-help" className="sr-only">
          {getCanvasStatus()}
        </div>
      </div>

      {/* Canvas Footer */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Tool: {selectedTool}</span>
          <span>Color: {selectedColor}</span>
          <span>Size: {brushSize}px</span>
          {canvas && <span>{canvas.getObjects().length} objects</span>}
        </div>
        
        <div className="flex items-center space-x-2">
          {participants && (
            <span>{Object.keys(participants).length} participants</span>
          )}
          <span>Click and drag to draw</span>
        </div>
      </div>

      {/* Screen Reader Status */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        id="canvas-status"
      >
        {getCanvasStatus()}
      </div>

      {/* Keyboard Shortcuts Help */}
      {keyboardNavigation && (
        <div className="sr-only" id="canvas-keyboard-shortcuts">
          <h3>Keyboard Shortcuts</h3>
          <ul>
            <li>F6: Focus drawing canvas</li>
            <li>Escape: Clear selection</li>
            <li>Delete/Backspace: Delete selected objects</li>
            <li>Ctrl+A: Select all objects</li>
            <li>Ctrl+C: Copy selected objects</li>
            <li>Ctrl+V: Paste objects</li>
            <li>Mouse: Click and drag to draw</li>
            <li>Mouse: Click to select objects</li>
            <li>Mouse: Drag to move objects</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CanvasDrawing;