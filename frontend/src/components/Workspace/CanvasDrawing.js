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

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useSocket } from '../../contexts/SocketContext';
import { useUser } from '../../contexts/UserContext';
import { useBlindMode } from '../../contexts/BlindModeContext';
import { fabric } from 'fabric';

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
  const { connected, sendEvent } = useSocket();
  const { user } = useUser();
  const { enabled: blindModeEnabled, announceToScreenReader } = useBlindMode();

  // Canvas and drawing state
  const [canvas, setCanvas] = useState(null);
  const [currentTool, setCurrentTool] = useState('brush');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentStrokeWidth, setCurrentStrokeWidth] = useState(2);
  const [currentOpacity] = useState(1);

  // Drawing tools configuration
  const [tools] = useState({
    brush: { name: 'Brush', icon: '🖌️', shortcut: 'b' },
    marker: { name: 'Marker', icon: '🖍️', shortcut: 'm' },
    eraser: { name: 'Eraser', icon: '🧹', shortcut: 'e' },
    rectangle: { name: 'Rectangle', icon: '⬜', shortcut: 'r' },
    circle: { name: 'Circle', icon: '⭕', shortcut: 'c' }
  });

  // Color palette
  const [colors] = useState([
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#000080', '#008000'
  ]);

  // Voice commands state
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState(null);
  const [voiceCommandHistory, setVoiceCommandHistory] = useState([]);

  // Textual descriptions for accessibility
  const [descriptionLog, setDescriptionLog] = useState([]);
  
  // Blind Mode action log
  const [actionLog, setActionLog] = useState([]);
  const [lastCanvasAction, setLastCanvasAction] = useState(null);
  const [showActionLog, setShowActionLog] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);

  // User presence and cursor tracking
  const [userCursors, setUserCursors] = useState({});

  // Drawing history and undo/redo
  const [drawingHistory, setDrawingHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Canvas settings
  const [canvasSettings] = useState({
    backgroundColor: '#FFFFFF',
    gridEnabled: false,
    snapToGrid: false,
    gridSize: 20,
    zoom: 1,
    panX: 0,
    panY: 0
  });

  // Refs with proper cleanup
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const lastPointRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef([]);
  const cleanupRefs = useRef([]);
  const shapeStartRef = useRef(null);
  const activeShapeRef = useRef(null);
  const fabricInstanceRef = useRef(null);

  // Drawing constants
  const MIN_STROKE_WIDTH = 1;
  const MAX_STROKE_WIDTH = 50;

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    // Clear all timeouts and intervals
    cleanupRefs.current.forEach(cleanup => {
      if (cleanup) {
        cleanup();
      }
    });
    cleanupRefs.current = [];
    
    // Clear canvas context
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    
    // Reset drawing state
    isDrawingRef.current = false;
    currentPathRef.current = [];
    lastPointRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /**
   * Generate action description for Blind Mode
   * 
   * @param {string} action - Action type (draw, add, remove, etc.)
   * @param {string} tool - Tool used
   * @param {Object} details - Action details (position, size, etc.)
   * @param {string} author - Author of the action
   * @returns {string} Human-readable action description
   */
  const generateActionDescription = useCallback((action, tool, details, author = 'You') => {
    const timestamp = new Date().toLocaleTimeString();
    let description = '';
    
    switch (action) {
      case 'draw':
        if (tool === 'pen' || tool === 'brush' || tool === 'marker') {
          description = `${author} drew with ${tool}`;
        } else if (tool === 'eraser') {
          description = `${author} erased content`;
        } else {
          description = `${author} drew with ${tool}`;
        }
        break;
        
      case 'add_shape':
        if (tool === 'rectangle') {
          const { width, height, x, y } = details;
          const position = getPositionDescription(x, y);
          description = `${author} drew rectangle ${width}x${height} at ${position}`;
        } else if (tool === 'circle') {
          const { radius, x, y } = details;
          const position = getPositionDescription(x, y);
          description = `${author} drew circle radius ${radius} at ${position}`;
      } else if (tool === 'text' || tool === 'line') {
          // Legacy tools removed from UI; keep generic description for backward compatibility
          description = `${author} updated canvas with ${tool}`;
        }
        break;
        
      case 'clear':
        description = `${author} cleared canvas`;
        break;
        
      case 'undo':
        description = `${author} undid last action`;
        break;
        
      case 'redo':
        description = `${author} redid action`;
        break;
        
      case 'tool_change':
        description = `${author} switched to ${tool} tool`;
        break;
        
      case 'color_change':
        description = `${author} changed color to ${details.color}`;
        break;
        
      default:
        description = `${author} performed ${action}`;
    }
    
    return `${timestamp}: ${description}`;
  }, []);

  /**
   * Get position description for canvas coordinates
   * 
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {string} Position description
   */
  const getPositionDescription = useCallback((x, y) => {
    const canvasWidth = 800; // Default canvas width
    const canvasHeight = 600; // Default canvas height
    
    const horizontal = x < canvasWidth * 0.33 ? 'left' : 
                      x < canvasWidth * 0.66 ? 'center' : 'right';
    const vertical = y < canvasHeight * 0.33 ? 'top' : 
                     y < canvasHeight * 0.66 ? 'middle' : 'bottom';
    
    return `${horizontal}-${vertical}`;
  }, []);

  /**
   * Log canvas action for Blind Mode
   * 
   * @param {string} action - Action type
   * @param {string} tool - Tool used
   * @param {Object} details - Action details
   * @param {string} author - Author of the action
   */
  const logCanvasAction = useCallback((action, tool, details = {}, author = 'You') => {
    if (!blindModeEnabled) return;
    
    const description = generateActionDescription(action, tool, details, author);
    const actionEntry = {
      id: `action-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      action,
      tool,
      details,
      author,
      description
    };
    
    // Add to action log
    setActionLog(prev => [...prev.slice(-49), actionEntry]); // Keep last 50 actions
    setLastCanvasAction(actionEntry);
    
    // Announce the action
    announceToScreenReader(description);
    
    // Update description log for existing system
    setDescriptionLog(prev => [...prev, {
      timestamp: Date.now(),
      action: action,
      description: description,
      details: details
    }]);
  }, [blindModeEnabled, generateActionDescription, announceToScreenReader]);


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
      });
      setCanRedo(newIndex < drawingHistory.length - 1);
      setCanUndo(true);
      
      // Log redo action for Blind Mode
      logCanvasAction('redo', currentTool);
    }

    if (screenReader) {
      announce('Redid last action', 'polite');
    }
  }, [canvas, canRedo, historyIndex, drawingHistory, screenReader, announce, logCanvasAction, currentTool]);

  /**
   * Clean up empty shapes from canvas
   */
  const cleanupEmptyShapes = useCallback(() => {
    if (!canvas) return;
    
    const objects = canvas.getObjects();
    const emptyShapes = objects.filter(obj => {
      if (obj.type === 'rect') {
        return obj.width <= 10 || obj.height <= 10;
      } else if (obj.type === 'circle') {
        return obj.radius <= 10;
      }
      return false;
    });
    
    emptyShapes.forEach(shape => {
      canvas.remove(shape);
    });
    
    if (emptyShapes.length > 0) {
      canvas.requestRenderAll();
    }
  }, [canvas]);

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
    setDescriptionLog(prev => [...prev, {
      timestamp: Date.now(),
      action: 'canvas_cleared',
      description: 'Canvas cleared',
      details: []
    }]);

    // Log clear action for Blind Mode
    logCanvasAction('clear', currentTool);

    if (screenReader) {
      announce('Canvas cleared', 'polite');
    }
  }, [canvas, screenReader, announce, logCanvasAction, currentTool]);

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
   * Handle undo
   */
  const handleUndo = useCallback(() => {
    if (!canvas || !canUndo) return;

    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      canvas.loadFromJSON(drawingHistory[newIndex], () => {
        canvas.renderAll();
      });
      setCanUndo(newIndex > 0);
      setCanRedo(true);
      
      // Log undo action for Blind Mode
      logCanvasAction('undo', currentTool);
    }

    if (screenReader) {
      announce('Undid last action', 'polite');
    }
  }, [canvas, canUndo, historyIndex, drawingHistory, screenReader, announce, logCanvasAction, currentTool]);

  /**
   * Process voice commands
   */
  const processVoiceCommand = useCallback((command) => {
    const commandLower = command.toLowerCase();
    
    // Tool selection commands
    if (commandLower.includes('pen') || commandLower.includes('pencil')) {
      setCurrentTool('brush');
      logCanvasAction('tool_change', 'brush');
    } else if (commandLower.includes('brush')) {
      setCurrentTool('brush');
      logCanvasAction('tool_change', 'brush');
    } else if (commandLower.includes('marker')) {
      setCurrentTool('marker');
      logCanvasAction('tool_change', 'marker');
    } else if (commandLower.includes('eraser')) {
      setCurrentTool('eraser');
      logCanvasAction('tool_change', 'eraser');
    } else if (commandLower.includes('rectangle') || commandLower.includes('rect')) {
      setCurrentTool('rectangle');
      logCanvasAction('tool_change', 'rectangle');
    } else if (commandLower.includes('circle')) {
      setCurrentTool('circle');
      logCanvasAction('tool_change', 'circle');
    // Removed tools: line, text, select
    } else if (commandLower.includes('line') || commandLower.includes('text') || commandLower.includes('select')) {
      // Ignore or map to closest supported tool
      setCurrentTool('pen');
      logCanvasAction('tool_change', 'pen');
    }
    
    // Color commands
    else if (commandLower.includes('red')) {
      setCurrentColor('#FF0000');
      logCanvasAction('color_change', currentTool, { color: 'red' });
    } else if (commandLower.includes('blue')) {
      setCurrentColor('#0000FF');
      logCanvasAction('color_change', currentTool, { color: 'blue' });
    } else if (commandLower.includes('green')) {
      setCurrentColor('#00FF00');
      logCanvasAction('color_change', currentTool, { color: 'green' });
    } else if (commandLower.includes('black')) {
      setCurrentColor('#000000');
      logCanvasAction('color_change', currentTool, { color: 'black' });
    } else if (commandLower.includes('white')) {
      setCurrentColor('#FFFFFF');
      logCanvasAction('color_change', currentTool, { color: 'white' });
    }
    
    // Drawing action commands
    else if (commandLower.includes('draw circle')) {
      const match = commandLower.match(/draw circle (\d+)x(\d+) (\w+)/);
      if (match) {
        const [, width, height, position] = match;
        const x = position === 'center' ? 400 : position === 'left' ? 200 : 600;
        const y = position === 'center' ? 300 : position === 'top' ? 150 : 450;
        logCanvasAction('add_shape', 'circle', { 
          radius: parseInt(width), 
          x, 
          y 
        });
        announce(`Drawing circle ${width}x${height} at ${position}`, 'polite');
      }
    } else if (commandLower.includes('draw rectangle')) {
      const match = commandLower.match(/draw rectangle (\d+)x(\d+) (\w+)/);
      if (match) {
        const [, width, height, position] = match;
        const x = position === 'center' ? 400 : position === 'left' ? 200 : 600;
        const y = position === 'center' ? 300 : position === 'top' ? 150 : 450;
        logCanvasAction('add_shape', 'rectangle', { 
          width: parseInt(width), 
          height: parseInt(height), 
          x, 
          y 
        });
        announce(`Drawing rectangle ${width}x${height} at ${position}`, 'polite');
      }
    } else if (commandLower.includes('add text')) {
      const match = commandLower.match(/add text: (.+)/);
      if (match) {
        const [, text] = match;
        logCanvasAction('add_shape', 'text', { 
          text, 
          x: 400, 
          y: 300 
        });
        announce(`Adding text: ${text}`, 'polite');
      }
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
  }, [logCanvasAction, currentTool, handleUndo, handleRedo, handleClearCanvas, handleSaveCanvas, announce]);



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
  }, [voiceCommandsEnabled, screenReader, announce, processVoiceCommand]);


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
   * Handle drawing start
   */
  const handleDrawingStart = useCallback((event) => {
    if (!canvas || !canvasRef.current) return;

    try {
      const pointer = canvas.getPointer(event.e);
      isDrawingRef.current = true;
      setIsDrawing(true);
      currentPathRef.current = [];

      // Shape tools: start creating a shape
      if (currentTool === 'rectangle' || currentTool === 'circle') {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        shapeStartRef.current = { x: pointer.x, y: pointer.y };

        if (currentTool === 'rectangle') {
          const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0, // Start with zero width
            height: 0, // Start with zero height
            originX: 'left',
            originY: 'top',
            fill: 'transparent',
            stroke: currentColor,
            strokeWidth: currentStrokeWidth,
            selectable: false,
            evented: false,
            strokeDashArray: [5, 5] // Dashed line for preview
          });
          activeShapeRef.current = rect;
          canvas.add(rect);
        } else if (currentTool === 'circle') {
          const circle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 0, // Start with zero radius
            originX: 'left',
            originY: 'top',
            fill: 'transparent',
            stroke: currentColor,
            strokeWidth: currentStrokeWidth,
            selectable: false,
            evented: false,
            strokeDashArray: [5, 5] // Dashed line for preview
          });
          activeShapeRef.current = circle;
          canvas.add(circle);
        }

        canvas.requestRenderAll();
      } else {
        // Free drawing tools
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = currentStrokeWidth;
        canvas.freeDrawingBrush.color = currentTool === 'eraser' ? canvasSettings.backgroundColor : currentColor;
        canvas.freeDrawingBrush.opacity = currentOpacity;
      }

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

      lastPointRef.current = pointer;
    } catch (error) {
      console.error('Error in handleDrawingStart:', error);
    }
  }, [canvas, user, connected, sendEvent, roomId, currentTool, currentStrokeWidth, currentColor, currentOpacity, canvasSettings.backgroundColor]);

  /**
   * Handle drawing move
   */
  const handleDrawingMove = useCallback((event) => {
    if (!canvas || !isDrawingRef.current || !canvasRef.current) return;

    try {
      const pointer = canvas.getPointer(event.e);
      currentPathRef.current.push(pointer);

      if (currentTool === 'rectangle' && activeShapeRef.current && shapeStartRef.current) {
        const start = shapeStartRef.current;
        const left = Math.min(start.x, pointer.x);
        const top = Math.min(start.y, pointer.y);
        const width = Math.abs(pointer.x - start.x);
        const height = Math.abs(pointer.y - start.y);
        
        activeShapeRef.current.set({ 
          left, 
          top, 
          width, 
          height 
        });
        canvas.requestRenderAll();
      } else if (currentTool === 'circle' && activeShapeRef.current && shapeStartRef.current) {
        const start = shapeStartRef.current;
        const dx = pointer.x - start.x;
        const dy = pointer.y - start.y;
        const radius = Math.sqrt(dx * dx + dy * dy); // Use actual distance for radius
        const centerX = start.x;
        const centerY = start.y;
        
        activeShapeRef.current.set({ 
          left: centerX - radius, 
          top: centerY - radius, 
          radius 
        });
        canvas.requestRenderAll();
      }

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
    } catch (error) {
      console.error('Error in handleDrawingMove:', error);
    }
  }, [canvas, user, connected, sendEvent, roomId, currentTool]);

  /**
   * Handle drawing end
   */
  const handleDrawingEnd = useCallback((event) => {
    if (!canvas || !isDrawingRef.current || !canvasRef.current) return;

    try {
      isDrawingRef.current = false;
      setIsDrawing(false);

      // Finalize shapes
      if ((currentTool === 'rectangle' || currentTool === 'circle') && activeShapeRef.current) {
        // Remove dashed line preview and make shape solid
        activeShapeRef.current.set({ 
          selectable: true, 
          evented: true,
          strokeDashArray: null // Remove dashed line
        });
        
        // Only keep shapes that have meaningful size
        const shape = activeShapeRef.current;
        const shouldKeep = (currentTool === 'rectangle' && shape.width > 10 && shape.height > 10) ||
                          (currentTool === 'circle' && shape.radius > 10);
        
        if (!shouldKeep) {
          // Remove the shape if it's too small
          canvas.remove(shape);
        }
        
        activeShapeRef.current = null;
        shapeStartRef.current = null;
        canvas.selection = true;
        canvas.requestRenderAll();
      }

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

      // Log action
      const actionType = currentTool === 'rectangle' || currentTool === 'circle' ? 'add_shape' : 'draw';
      logCanvasAction(actionType, currentTool, {
        color: currentColor,
        strokeWidth: currentStrokeWidth,
        pathLength: currentPathRef.current.length
      });

      // Generate description

      // Send event
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

      // Update room
      if (onRoomUpdate) {
        onRoomUpdate({ canvas: canvasState });
      }
    } catch (error) {
      console.error('Error in handleDrawingEnd:', error);
    }
  }, [canvas, connected, sendEvent, roomId, currentTool, currentColor, currentStrokeWidth, onRoomUpdate, historyIndex, logCanvasAction]);

  /**
   * Handle tool change
   */
  const handleToolChange = useCallback((tool) => {
    setCurrentTool(tool);
    setIsEraser(tool === 'eraser');
    
    if (canvas) {
      if (tool === 'brush' || tool === 'marker' || tool === 'eraser') {
        // Enable drawing mode for drawing tools
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.width = currentStrokeWidth;
        canvas.freeDrawingBrush.color = tool === 'eraser' ? canvasSettings.backgroundColor : currentColor;
        canvas.freeDrawingBrush.opacity = currentOpacity;
        
        // Configure brush based on tool
        if (tool === 'brush') {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.width = currentStrokeWidth * 2; // Brush is thicker
        } else if (tool === 'marker') {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.width = currentStrokeWidth * 3; // Marker is thickest
        } else if (tool === 'eraser') {
          canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
          canvas.freeDrawingBrush.color = canvasSettings.backgroundColor;
        }
      } else if (tool === 'rectangle' || tool === 'circle') {
        // Disable free drawing for shapes; handled in mouse handlers
        canvas.isDrawingMode = false;
      } else {
        // Disable drawing mode for selection and shape tools
        canvas.isDrawingMode = false;
      }
    }

    // Log tool change for Blind Mode
    logCanvasAction('tool_change', tool);

    if (screenReader) {
      announce(`Switched to ${tools[tool]?.name || tool} tool`, 'polite');
    }
  }, [canvas, currentStrokeWidth, currentColor, currentOpacity, canvasSettings.backgroundColor, tools, screenReader, announce, logCanvasAction]);

  /**
   * Initialize Fabric.js canvas
   * Only (re)initialize when room changes to avoid duplicate instances
   */
  useEffect(() => {
    let rafId;

    const mountCanvas = () => {
      if (!canvasRef.current) return;

      // Dispose any previous instance first (e.g., hot reload or room switch)
      if (fabricInstanceRef.current) {
        try {
          fabricInstanceRef.current.dispose();
        } catch (err) {
          console.warn('Fabric dispose during reinit failed:', err);
        }
        fabricInstanceRef.current = null;
      }

      // Create a new instance
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: canvasSettings.backgroundColor,
        selection: true,
        preserveObjectStacking: true,
        renderOnAddRemove: true,
        skipTargetFind: false,
        skipOffscreen: false
      });

      // Configure defaults
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.freeDrawingBrush.width = currentStrokeWidth;
      fabricCanvas.freeDrawingBrush.color = currentColor;
      fabricCanvas.freeDrawingBrush.opacity = currentOpacity;

      // Attach handlers
      fabricCanvas.on('mouse:down', handleDrawingStart);
      fabricCanvas.on('mouse:move', handleDrawingMove);
      fabricCanvas.on('mouse:up', handleDrawingEnd);
      fabricCanvas.on('path:created', () => {
        if (connected && sendEvent) {
          const canvasState = fabricCanvas.toJSON();
          sendEvent('draw-event', {
            roomId,
            action: 'path_created',
            canvasData: canvasState,
            tool: currentTool,
            color: currentColor,
            strokeWidth: currentStrokeWidth,
            timestamp: Date.now()
          });
        }
      });

      fabricInstanceRef.current = fabricCanvas;
      setCanvas(fabricCanvas);

      // Load existing state
      if (roomData?.canvas) {
        fabricCanvas.loadFromJSON(roomData.canvas, () => {
          fabricCanvas.renderAll();
        });
      }

    };

    rafId = window.requestAnimationFrame(mountCanvas);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      const instance = fabricInstanceRef.current;
      if (instance) {
        try { instance.off('mouse:down', handleDrawingStart); } catch {}
        try { instance.off('mouse:move', handleDrawingMove); } catch {}
        try { instance.off('mouse:up', handleDrawingEnd); } catch {}
        try { instance.dispose(); } catch (err) {
          console.warn('Fabric dispose on unmount failed:', err);
        }
        fabricInstanceRef.current = null;
      }
    };
  }, [roomId]); // Only depend on roomId to prevent blinking

  /**
   * Update canvas event handlers when they change
   * This prevents the canvas from being recreated while updating handlers
   */
  useEffect(() => {
    if (!canvas) return;

    // Remove old handlers
    canvas.off('mouse:down', handleDrawingStart);
    canvas.off('mouse:move', handleDrawingMove);
    canvas.off('mouse:up', handleDrawingEnd);

    // Add new handlers
    canvas.on('mouse:down', handleDrawingStart);
    canvas.on('mouse:move', handleDrawingMove);
    canvas.on('mouse:up', handleDrawingEnd);

  }, [canvas, handleDrawingStart, handleDrawingMove, handleDrawingEnd]);

  /**
   * Update canvas settings when they change
   */
  useEffect(() => {
    if (!canvas) return;

    // Update brush settings
    if (canvas.isDrawingMode) {
      canvas.freeDrawingBrush.width = currentStrokeWidth;
      canvas.freeDrawingBrush.color = currentTool === 'eraser' ? canvasSettings.backgroundColor : currentColor;
      canvas.freeDrawingBrush.opacity = currentOpacity;
    }
  }, [canvas, currentStrokeWidth, currentColor, currentOpacity, currentTool, canvasSettings.backgroundColor]);

  /**
   * Clean up empty shapes when canvas is ready
   */
  useEffect(() => {
    if (canvas) {
      // Clean up any existing empty shapes
      cleanupEmptyShapes();
    }
  }, [canvas, cleanupEmptyShapes]);

  /**
   * Handle color change
   */
  const handleColorChange = useCallback((color) => {
    setCurrentColor(color);
    
    if (canvas && canvas.isDrawingMode) {
      canvas.freeDrawingBrush.color = color;
    }

    // Log color change for Blind Mode
    logCanvasAction('color_change', currentTool, { color });

    if (screenReader) {
      announce(`Changed color to ${color}`, 'polite');
    }
  }, [canvas, screenReader, announce, logCanvasAction, currentTool]);

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
        case 'c':
        case 'C':
          // Ctrl+Shift+C: Read last canvas action
          if (event.shiftKey) {
            event.preventDefault();
            if (blindModeEnabled && lastCanvasAction) {
              announceToScreenReader(`Last canvas action: ${lastCanvasAction.description}`);
            } else if (blindModeEnabled) {
              announceToScreenReader('No recent canvas actions to announce');
            }
          }
          break;
        default:
          // No shortcut for this key
          break;
      }
    }

    // Tool shortcuts
    switch (event.key) {
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
        if (!event.ctrlKey || !event.shiftKey) {
          handleToolChange('circle');
        }
        break;
      default:
        // No tool shortcut for this key
        break;
    }
  }, [keyboardNavigation, handleRedo, handleUndo, handleSaveCanvas, handleClearCanvas, handleToolChange, blindModeEnabled, lastCanvasAction, announceToScreenReader]);

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
   * Render action log for Blind Mode
   */
  const renderActionLog = () => {
    if (!blindModeEnabled) return null;

    return (
      <div className="p-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Canvas Action Log</h3>
          <button
            onClick={() => setShowActionLog(!showActionLog)}
            className="btn btn-xs btn-outline"
            aria-label={showActionLog ? 'Hide action log' : 'Show action log'}
            title={showActionLog ? 'Hide action log' : 'Show action log'}
          >
            {showActionLog ? 'Hide' : 'Show'} Log
          </button>
        </div>
        
        {showActionLog && (
          <div 
            className="h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-800"
            role="log"
            aria-label="Canvas action log"
            aria-live="polite"
            aria-atomic="false"
          >
            {actionLog.length > 0 ? (
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {actionLog.map((action) => (
                  <div key={action.id} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                    {action.description}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-500 italic">
                No actions recorded yet
              </div>
            )}
          </div>
        )}
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
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 min-h-0">
      {/* Tool Palette */}
      <div className="flex-shrink-0">
        {renderToolPalette()}
      </div>

      {/* Color Palette */}
      <div className="flex-shrink-0">
        {renderColorPalette()}
      </div>

      {/* Stroke Width Controls */}
      <div className="flex-shrink-0">
        {renderStrokeWidthControls()}
      </div>

      {/* Voice Commands Controls */}
      <div className="flex-shrink-0">
        {renderVoiceCommandsControls()}
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <div
          ref={containerRef}
          className="h-full w-full relative"
          role="application"
          aria-label="Drawing canvas"
          aria-describedby="canvas-help"
        >
          <canvas
            ref={canvasRef}
            className="border border-gray-300 dark:border-gray-600"
            onKeyDown={handleKeyDown}
            tabIndex={0}
            aria-label="Drawing canvas"
            role="img"
          />
        </div>
      </div>


      {/* Action Log for Blind Mode */}
      {renderActionLog()}

      {/* Canvas Footer */}
      {renderCanvasFooter()}

      {/* Screen Reader Help */}
      <div className="sr-only" id="canvas-help">
        <h3>Canvas Controls</h3>
        <ul>
          
          <li>B: Brush tool</li>
          <li>M: Marker tool</li>
          <li>E: Eraser tool</li>
          <li>R: Rectangle tool</li>
          <li>C: Circle tool</li>
          
          <li>Ctrl+Z: Undo</li>
          <li>Ctrl+Shift+Z: Redo</li>
          <li>Ctrl+S: Save</li>
          <li>Ctrl+A: Clear</li>
          {blindModeEnabled && (
            <li>Ctrl+Shift+C: Read last canvas action</li>
          )}
        </ul>
      </div>

      {/* Voice Commands Help */}
      {voiceCommandsEnabled && (
        <div className="sr-only" id="voice-commands-help">
          <h3>Voice Commands</h3>
          <ul>
            <li>Say "brush" to switch to brush tool</li>
            <li>Say "brush" to switch to brush tool</li>
            <li>Say "marker" to switch to marker tool</li>
            <li>Say "eraser" to switch to eraser tool</li>
            <li>Say "rectangle" to switch to rectangle tool</li>
            <li>Say "circle" to switch to circle tool</li>
            
            <li>Say "red", "blue", "green", "black", "white" to change colors</li>
            <li>Say "draw circle 100x100 center" to draw a circle</li>
            <li>Say "draw rectangle 200x100 top-left" to draw a rectangle</li>
            <li>Say "add text: Hello World" to add text</li>
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