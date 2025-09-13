/**
 * Canvas Drawing Component
 * 
 * Collaborative whiteboard with:
 * - Mouse, touch, and keyboard input support
 * - Web Speech API voice commands (toggleable)
 * - Textual description logging for screen readers
 * - Real-time synchronization via Socket.io
 * - Full accessibility support (ARIA roles, keyboard navigation)
 * - Drawing tools and shapes
 * - User presence and cursor tracking
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useSocket } from '../../contexts/SocketContext';
import { useUser } from '../../contexts/UserContext';

/**
 * Canvas Drawing Component
 * 
 * Provides collaborative whiteboard functionality with comprehensive accessibility
 * Includes voice commands, textual descriptions, and real-time synchronization
 */
const CanvasDrawing = ({ 
  roomId, 
  roomData, 
  participants, 
  onRoomUpdate 
}) => {
  const { announce, screenReader, keyboardNavigation } = useAccessibility();
  const { socket, connected, sendEvent } = useSocket();
  const { user } = useUser();

  // Canvas and drawing state
  const [canvas, setCanvas] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);
  const [currentOpacity, setCurrentOpacity] = useState(1);
  const [isEraser, setIsEraser] = useState(false);

  // Drawing tools configuration
  const [tools, setTools] = useState({
    pen: { name: 'Pen', icon: '✏️', shortcut: 'p' },
    brush: { name: 'Brush', icon: '🖌️', shortcut: 'b' },
    marker: { name: 'Marker', icon: '🖍️', shortcut: 'm' },
    eraser: { name: 'Eraser', icon: '🧹', shortcut: 'e' },
    rectangle: { name: 'Rectangle', icon: '⬜', shortcut: 'r' },
    circle: { name: 'Circle', icon: '⭕', shortcut: 'c' },
    line: { name: 'Line', icon: '📏', shortcut: 'l' },
    text: { name: 'Text', icon: '📝', shortcut: 't' },
    select: { name: 'Select', icon: '👆', shortcut: 's' }
  });

  // Color palette
  const [colors] = useState([
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
  ]);

  // Stroke width options
  const [strokeWidths] = useState([1, 2, 4, 8, 16, 32]);

  // Voice commands state
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [voiceCommandHistory, setVoiceCommandHistory] = useState([]);

  // Textual descriptions for accessibility
  const [drawingDescriptions, setDrawingDescriptions] = useState([]);
  const [currentDescription, setCurrentDescription] = useState('');
  const [descriptionLog, setDescriptionLog] = useState([]);

  // User presence and cursor tracking
  const [userCursors, setUserCursors] = useState({});
  const [userSelections, setUserSelections] = useState({});
  const [activeUsers, setActiveUsers] = useState({});

  // Drawing history and undo/redo
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Canvas settings
  const [canvasSettings, setCanvasSettings] = useState({
    backgroundColor: '#FFFFFF',
    gridEnabled: false,
    snapToGrid: false,
    gridSize: 20,
    zoom: 1,
    panX: 0,
    panY: 0
  });

  // Refs
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const lastPointRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef([]);
  const voiceTimeoutRef = useRef(null);

  // Drawing constants
  const MIN_STROKE_WIDTH = 1;
  const MAX_STROKE_WIDTH = 50;
  const MIN_OPACITY = 0.1;
  const MAX_OPACITY = 1.0;

  /**
   * Initialize Fabric.js canvas
   */
  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Fabric.js canvas
    const fabricCanvas = new window.fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: canvasSettings.backgroundColor,
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      skipTargetFind: false,
      skipOffscreen: false
    });

    // Configure canvas settings
    fabricCanvas.freeDrawingBrush.width = currentStrokeWidth;
    fabricCanvas.freeDrawingBrush.color = currentColor;
    fabricCanvas.freeDrawingBrush.opacity = currentOpacity;

    setCanvas(fabricCanvas);

    // Load existing canvas data
    if (roomData?.canvas) {
      fabricCanvas.loadFromJSON(roomData.canvas, () => {
        fabricCanvas.renderAll();
        generateCanvasDescription();
      });
    }

    // Cleanup function
    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, []);

  /**
   * Initialize Web Speech API
   */
  useEffect(() => {
    if (!voiceCommandsEnabled) return;

    // Check for speech recognition support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      setVoiceCommandsEnabled(false);
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      if (screenReader) {
        announce('Voice commands activated', 'polite');
      }
    };

    recognition.onresult = (event) => {
      const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      processVoiceCommand(command);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (screenReader) {
        announce('Voice command error', 'polite');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    setSpeechRecognition(recognition);

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [voiceCommandsEnabled, screenReader, announce]);

  /**
   * Process voice commands
   */
  const processVoiceCommand = useCallback((command) => {
    const commandLower = command.toLowerCase();
    
    // Tool selection commands
    if (commandLower.includes('pen') || commandLower.includes('pencil')) {
      setCurrentTool('pen');
      announce('Switched to pen tool', 'polite');
    } else if (commandLower.includes('brush')) {
      setCurrentTool('brush');
      announce('Switched to brush tool', 'polite');
    } else if (commandLower.includes('marker')) {
      setCurrentTool('marker');
      announce('Switched to marker tool', 'polite');
    } else if (commandLower.includes('eraser')) {
      setCurrentTool('eraser');
      announce('Switched to eraser tool', 'polite');
    } else if (commandLower.includes('rectangle') || commandLower.includes('rect')) {
      setCurrentTool('rectangle');
      announce('Switched to rectangle tool', 'polite');
    } else if (commandLower.includes('circle')) {
      setCurrentTool('circle');
      announce('Switched to circle tool', 'polite');
    } else if (commandLower.includes('line')) {
      setCurrentTool('line');
      announce('Switched to line tool', 'polite');
    } else if (commandLower.includes('text')) {
      setCurrentTool('text');
      announce('Switched to text tool', 'polite');
    } else if (commandLower.includes('select')) {
      setCurrentTool('select');
      announce('Switched to select tool', 'polite');
    }
    
    // Color commands
    else if (commandLower.includes('red')) {
      setCurrentColor('#FF0000');
      announce('Changed color to red', 'polite');
    } else if (commandLower.includes('blue')) {
      setCurrentColor('#0000FF');
      announce('Changed color to blue', 'polite');
    } else if (commandLower.includes('green')) {
      setCurrentColor('#00FF00');
      announce('Changed color to green', 'polite');
    } else if (commandLower.includes('black')) {
      setCurrentColor('#000000');
      announce('Changed color to black', 'polite');
    } else if (commandLower.includes('white')) {
      setCurrentColor('#FFFFFF');
      announce('Changed color to white', 'polite');
    }
    
    // Action commands
    else if (commandLower.includes('undo')) {
      handleUndo();
    } else if (commandLower.includes('redo')) {
      handleRedo();
    } else if (commandLower.includes('clear') || commandLower.includes('clear all')) {
      handleClearCanvas();
    } else if (commandLower.includes('save')) {
      handleSaveCanvas();
    }
    
    // Add command to history
    setVoiceCommandHistory(prev => [...prev, {
      command,
      timestamp: Date.now(),
      processed: true
    }]);
  }, [screenReader, announce]);

  /**
   * Start voice recognition
   */
  const startVoiceRecognition = useCallback(() => {
    if (speechRecognition && !isListening) {
      speechRecognition.start();
    }
  }, [speechRecognition, isListening]);

  /**
   * Stop voice recognition
   */
  const stopVoiceRecognition = useCallback(() => {
    if (speechRecognition && isListening) {
      speechRecognition.stop();
    }
  }, [speechRecognition, isListening]);

  /**
   * Toggle voice commands
   */
  const toggleVoiceCommands = useCallback(() => {
    setVoiceCommandsEnabled(prev => {
      const newValue = !prev;
      if (newValue) {
        startVoiceRecognition();
      } else {
        stopVoiceRecognition();
      }
      return newValue;
    });
  }, [startVoiceRecognition, stopVoiceRecognition]);

  /**
   * Generate textual description of canvas content
   */
  const generateCanvasDescription = useCallback(() => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const descriptions = [];

    objects.forEach((obj, index) => {
      let description = '';
      
      if (obj.type === 'rect') {
        description = `Rectangle ${index + 1}: ${obj.width}x${obj.height} pixels, color ${obj.fill}, position (${Math.round(obj.left)}, ${Math.round(obj.top)})`;
      } else if (obj.type === 'circle') {
        description = `Circle ${index + 1}: radius ${Math.round(obj.radius)} pixels, color ${obj.fill}, position (${Math.round(obj.left)}, ${Math.round(obj.top)})`;
      } else if (obj.type === 'line') {
        description = `Line ${index + 1}: from (${Math.round(obj.x1)}, ${Math.round(obj.y1)}) to (${Math.round(obj.x2)}, ${Math.round(obj.y2)}), color ${obj.stroke}`;
      } else if (obj.type === 'text') {
        description = `Text ${index + 1}: "${obj.text}", color ${obj.fill}, position (${Math.round(obj.left)}, ${Math.round(obj.top)})`;
      } else if (obj.type === 'path') {
        description = `Drawing ${index + 1}: ${obj.path.length} points, color ${obj.stroke}, width ${obj.strokeWidth}`;
      } else {
        description = `Object ${index + 1}: ${obj.type}, color ${obj.fill || obj.stroke}, position (${Math.round(obj.left)}, ${Math.round(obj.top)})`;
      }
      
      descriptions.push(description);
    });

    setDrawingDescriptions(descriptions);
    
    // Update description log
    const logEntry = {
      timestamp: Date.now(),
      action: 'canvas_updated',
      description: `Canvas now contains ${objects.length} objects`,
      details: descriptions
    };
    
    setDescriptionLog(prev => [...prev, logEntry]);
    
    if (screenReader) {
      announce(`Canvas updated: ${objects.length} objects`, 'polite');
    }
  }, [canvas, screenReader, announce]);

  /**
   * Handle drawing start
   */
  const handleDrawingStart = useCallback((event) => {
    if (!canvas) return;

    const pointer = canvas.getPointer(event.e);
    isDrawingRef.current = true;
    setIsDrawing(true);
    currentPathRef.current = [];

    // Update user presence
    if (user && connected) {
      const cursorData = {
        userId: user.userId,
        username: user.username,
        x: pointer.x,
        y: pointer.y,
        timestamp: Date.now()
      };
      
      setUserCursors(prev => ({
        ...prev,
        [user.userId]: cursorData
      }));

      if (sendEvent) {
        sendEvent('cursor-update', {
          roomId,
          cursor: cursorData
        });
      }
    }

    // Start drawing based on current tool
    if (currentTool === 'pen' || currentTool === 'brush' || currentTool === 'marker') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = currentStrokeWidth;
      canvas.freeDrawingBrush.color = currentColor;
      canvas.freeDrawingBrush.opacity = currentOpacity;
    } else if (currentTool === 'eraser') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = currentStrokeWidth;
      canvas.freeDrawingBrush.color = canvasSettings.backgroundColor;
      canvas.freeDrawingBrush.opacity = 1;
    } else {
      canvas.isDrawingMode = false;
    }

    lastPointRef.current = pointer;
  }, [canvas, currentTool, currentStrokeWidth, currentColor, currentOpacity, canvasSettings.backgroundColor, user, connected, sendEvent, roomId]);

  /**
   * Handle drawing move
   */
  const handleDrawingMove = useCallback((event) => {
    if (!canvas || !isDrawingRef.current) return;

    const pointer = canvas.getPointer(event.e);
    currentPathRef.current.push(pointer);

    // Update user cursor
    if (user && connected) {
      const cursorData = {
        userId: user.userId,
        username: user.username,
        x: pointer.x,
        y: pointer.y,
        timestamp: Date.now()
      };
      
      setUserCursors(prev => ({
        ...prev,
        [user.userId]: cursorData
      }));

      if (sendEvent) {
        sendEvent('cursor-update', {
          roomId,
          cursor: cursorData
        });
      }
    }

    lastPointRef.current = pointer;
  }, [canvas, user, connected, sendEvent, roomId]);

  /**
   * Handle drawing end
   */
  const handleDrawingEnd = useCallback((event) => {
    if (!canvas || !isDrawingRef.current) return;

    isDrawingRef.current = false;
    setIsDrawing(false);

    // Save to history
    const canvasState = canvas.toJSON();
    setDrawingHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(canvasState);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => prev + 1);
    setCanUndo(true);
    setCanRedo(false);

    // Generate description
    generateCanvasDescription();

    // Send drawing event
    if (connected && sendEvent) {
      sendEvent('draw-event', {
        roomId,
        action: 'drawing_complete',
        canvasData: canvasState,
        tool: currentTool,
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        timestamp: Date.now()
      });
    }

    // Update room data
    if (onRoomUpdate) {
      onRoomUpdate({ canvas: canvasState });
    }
  }, [canvas, connected, sendEvent, roomId, currentTool, currentColor, currentStrokeWidth, onRoomUpdate, generateCanvasDescription, historyIndex]);

  /**
   * Handle tool change
   */
  const handleToolChange = useCallback((tool) => {
    setCurrentTool(tool);
    setIsEraser(tool === 'eraser');
    
    if (canvas) {
      if (tool === 'pen' || tool === 'brush' || tool === 'marker' || tool === 'eraser') {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = currentStrokeWidth;
        canvas.freeDrawingBrush.color = tool === 'eraser' ? canvasSettings.backgroundColor : currentColor;
        canvas.freeDrawingBrush.opacity = currentOpacity;
      } else {
        canvas.isDrawingMode = false;
      }
    }

    if (screenReader) {
      announce(`Switched to ${tools[tool]?.name || tool} tool`, 'polite');
    }
  }, [canvas, currentStrokeWidth, currentColor, currentOpacity, canvasSettings.backgroundColor, tools, screenReader, announce]);

  /**
   * Handle color change
   */
  const handleColorChange = useCallback((color) => {
    setCurrentColor(color);
    
    if (canvas && canvas.isDrawingMode) {
      canvas.freeDrawingBrush.color = color;
    }

    if (screenReader) {
      announce(`Changed color to ${color}`, 'polite');
    }
  }, [canvas, screenReader, announce]);

  /**
   * Handle stroke width change
   */
  const handleStrokeWidthChange = useCallback((width) => {
    setCurrentStrokeWidth(width);
    
    if (canvas && canvas.isDrawingMode) {
      canvas.freeDrawingBrush.width = width;
    }

    if (screenReader) {
      announce(`Changed stroke width to ${width}`, 'polite');
    }
  }, [canvas, screenReader, announce]);

  /**
   * Handle undo
   */
  const handleUndo = useCallback(() => {
    if (!canvas || !canUndo) return;

    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      canvas.loadFromJSON(drawingHistory[newIndex], () => {
        canvas.renderAll();
        generateCanvasDescription();
      });
      setCanUndo(newIndex > 0);
      setCanRedo(true);
    }

    if (screenReader) {
      announce('Undid last action', 'polite');
    }
  }, [canvas, canUndo, historyIndex, drawingHistory, generateCanvasDescription, screenReader, announce]);

  /**
   * Handle redo
   */
  const handleRedo = useCallback(() => {
    if (!canvas || !canRedo) return;

    if (historyIndex < drawingHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      canvas.loadFromJSON(drawingHistory[newIndex], () => {
        canvas.renderAll();
        generateCanvasDescription();
      });
      setCanRedo(newIndex < drawingHistory.length - 1);
      setCanUndo(true);
    }

    if (screenReader) {
      announce('Redid last action', 'polite');
    }
  }, [canvas, canRedo, historyIndex, drawingHistory, generateCanvasDescription, screenReader, announce]);

  /**
   * Handle clear canvas
   */
  const handleClearCanvas = useCallback(() => {
    if (!canvas) return;

    canvas.clear();
    setDrawingHistory([]);
    setHistoryIndex(-1);
    setCanUndo(false);
    setCanRedo(false);
    setDrawingDescriptions([]);
    setDescriptionLog(prev => [...prev, {
      timestamp: Date.now(),
      action: 'canvas_cleared',
      description: 'Canvas cleared',
      details: []
    }]);

    if (screenReader) {
      announce('Canvas cleared', 'polite');
    }
  }, [canvas, screenReader, announce]);

  /**
   * Handle save canvas
   */
  const handleSaveCanvas = useCallback(() => {
    if (!canvas) return;

    const canvasState = canvas.toJSON();
    
    if (onRoomUpdate) {
      onRoomUpdate({ canvas: canvasState });
    }

    if (screenReader) {
      announce('Canvas saved', 'polite');
    }
  }, [canvas, onRoomUpdate, screenReader, announce]);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((event) => {
    if (!keyboardNavigation) return;

    // Prevent default for our shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          break;
        case 's':
          event.preventDefault();
          handleSaveCanvas();
          break;
        case 'a':
          event.preventDefault();
          handleClearCanvas();
          break;
      }
    }

    // Tool shortcuts
    switch (event.key) {
      case 'p':
        handleToolChange('pen');
        break;
      case 'b':
        handleToolChange('brush');
        break;
      case 'm':
        handleToolChange('marker');
        break;
      case 'e':
        handleToolChange('eraser');
        break;
      case 'r':
        handleToolChange('rectangle');
        break;
      case 'c':
        handleToolChange('circle');
        break;
      case 'l':
        handleToolChange('line');
        break;
      case 't':
        handleToolChange('text');
        break;
      case 's':
        handleToolChange('select');
        break;
    }
  }, [keyboardNavigation, handleRedo, handleUndo, handleSaveCanvas, handleClearCanvas, handleToolChange]);

  /**
   * Render tool palette
   */
  const renderToolPalette = () => {
    return (
      <div className="flex flex-wrap gap-2 p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {Object.entries(tools).map(([key, tool]) => (
          <button
            key={key}
            onClick={() => handleToolChange(key)}
            className={`btn btn-sm ${currentTool === key ? 'btn-primary' : 'btn-outline'}`}
            aria-label={`${tool.name} tool (${tool.shortcut})`}
            title={`${tool.name} tool (${tool.shortcut})`}
          >
            <span className="mr-1">{tool.icon}</span>
            {tool.name}
          </button>
        ))}
      </div>
    );
  };

  /**
   * Render color palette
   */
  const renderColorPalette = () => {
    return (
      <div className="flex flex-wrap gap-1 p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => handleColorChange(color)}
            className={`w-8 h-8 rounded border-2 ${currentColor === color ? 'border-gray-800 dark:border-gray-200' : 'border-gray-300 dark:border-gray-600'}`}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
            title={`Select color ${color}`}
          />
        ))}
      </div>
    );
  };

  /**
   * Render stroke width controls
   */
  const renderStrokeWidthControls = () => {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <label htmlFor="stroke-width" className="text-sm font-medium">
          Stroke Width:
        </label>
        <input
          id="stroke-width"
          type="range"
          min={MIN_STROKE_WIDTH}
          max={MAX_STROKE_WIDTH}
          value={currentStrokeWidth}
          onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
          className="w-20"
          aria-label="Stroke width"
        />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {currentStrokeWidth}px
        </span>
      </div>
    );
  };

  /**
   * Render voice commands controls
   */
  const renderVoiceCommandsControls = () => {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleVoiceCommands}
          className={`btn btn-sm ${voiceCommandsEnabled ? 'btn-primary' : 'btn-outline'}`}
          aria-label="Toggle voice commands"
          title="Toggle voice commands"
        >
          🎤 Voice Commands
        </button>
        
        {voiceCommandsEnabled && (
          <button
            onClick={isListening ? stopVoiceRecognition : startVoiceRecognition}
            className={`btn btn-sm ${isListening ? 'btn-danger' : 'btn-success'}`}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? '🔴 Stop' : '🟢 Listen'}
          </button>
        )}
        
        {isListening && (
          <span className="text-sm text-green-600 dark:text-green-400">
            Listening...
          </span>
        )}
      </div>
    );
  };

  /**
   * Render drawing descriptions
   */
  const renderDrawingDescriptions = () => {
    return (
      <div className="p-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium mb-2">Canvas Description</h3>
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          {drawingDescriptions.length > 0 ? (
            drawingDescriptions.map((description, index) => (
              <div key={index}>{description}</div>
            ))
          ) : (
            <div>Canvas is empty</div>
          )}
        </div>
      </div>
    );
  };

  /**
   * Render canvas footer
   */
  const renderCanvasFooter = () => {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Tool: {tools[currentTool]?.name || currentTool}</span>
          <span>Color: {currentColor}</span>
          <span>Width: {currentStrokeWidth}px</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="btn btn-xs btn-outline"
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="btn btn-xs btn-outline"
            aria-label="Redo (Ctrl+Shift+Z)"
            title="Redo (Ctrl+Shift+Z)"
          >
            ↷ Redo
          </button>
          
          <button
            onClick={handleClearCanvas}
            className="btn btn-xs btn-outline"
            aria-label="Clear canvas (Ctrl+A)"
            title="Clear canvas (Ctrl+A)"
          >
            🗑️ Clear
          </button>
          
          <button
            onClick={handleSaveCanvas}
            className="btn btn-xs btn-primary"
            aria-label="Save canvas (Ctrl+S)"
            title="Save canvas (Ctrl+S)"
          >
            💾 Save
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Tool Palette */}
      {renderToolPalette()}

      {/* Color Palette */}
      {renderColorPalette()}

      {/* Stroke Width Controls */}
      {renderStrokeWidthControls()}

      {/* Voice Commands Controls */}
      {renderVoiceCommandsControls()}

      {/* Canvas Container */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={containerRef}
          className="h-full w-full relative"
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="application"
          aria-label="Drawing canvas"
          aria-describedby="canvas-help"
        >
          <canvas
            ref={canvasRef}
            className="border border-gray-300 dark:border-gray-600"
            onMouseDown={handleDrawingStart}
            onMouseMove={handleDrawingMove}
            onMouseUp={handleDrawingEnd}
            onTouchStart={handleDrawingStart}
            onTouchMove={handleDrawingMove}
            onTouchEnd={handleDrawingEnd}
            aria-label="Drawing canvas"
            role="img"
          />
        </div>
      </div>

      {/* Drawing Descriptions */}
      {renderDrawingDescriptions()}

      {/* Canvas Footer */}
      {renderCanvasFooter()}

      {/* Screen Reader Help */}
      <div className="sr-only" id="canvas-help">
        <h3>Canvas Controls</h3>
        <ul>
          <li>P: Pen tool</li>
          <li>B: Brush tool</li>
          <li>M: Marker tool</li>
          <li>E: Eraser tool</li>
          <li>R: Rectangle tool</li>
          <li>C: Circle tool</li>
          <li>L: Line tool</li>
          <li>T: Text tool</li>
          <li>S: Select tool</li>
          <li>Ctrl+Z: Undo</li>
          <li>Ctrl+Shift+Z: Redo</li>
          <li>Ctrl+S: Save</li>
          <li>Ctrl+A: Clear</li>
        </ul>
      </div>

      {/* Voice Commands Help */}
      {voiceCommandsEnabled && (
        <div className="sr-only" id="voice-commands-help">
          <h3>Voice Commands</h3>
          <ul>
            <li>Say "pen" or "pencil" to switch to pen tool</li>
            <li>Say "brush" to switch to brush tool</li>
            <li>Say "marker" to switch to marker tool</li>
            <li>Say "eraser" to switch to eraser tool</li>
            <li>Say "rectangle" to switch to rectangle tool</li>
            <li>Say "circle" to switch to circle tool</li>
            <li>Say "line" to switch to line tool</li>
            <li>Say "text" to switch to text tool</li>
            <li>Say "select" to switch to select tool</li>
            <li>Say "red", "blue", "green", "black", "white" to change colors</li>
            <li>Say "undo" to undo last action</li>
            <li>Say "redo" to redo last action</li>
            <li>Say "clear" to clear canvas</li>
            <li>Say "save" to save canvas</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CanvasDrawing;