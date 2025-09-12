/**
 * Canvas Drawing Component
 * 
 * Collaborative drawing canvas using Fabric.js
 * Supports real-time drawing collaboration
 */

import React, { useState, useEffect, useRef } from 'react';
import { fabric } from 'fabric';

const CanvasDrawing = ({ onDrawingChange, participants }) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const [selectedTool, setSelectedTool] = useState('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#000000');

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: '#ffffff',
      });

      fabricCanvasRef.current = canvas;

      // Set up drawing tools
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = brushColor;

      // Handle drawing events
      canvas.on('path:created', (e) => {
        const path = e.path;
        if (onDrawingChange) {
          onDrawingChange({
            type: 'draw',
            data: path.toObject(),
            timestamp: Date.now(),
          });
        }
      });

      canvas.on('object:added', (e) => {
        if (e.target !== canvas.freeDrawingBrush) {
          if (onDrawingChange) {
            onDrawingChange({
              type: 'add',
              data: e.target.toObject(),
              timestamp: Date.now(),
            });
          }
        }
      });

      canvas.on('object:modified', (e) => {
        if (onDrawingChange) {
          onDrawingChange({
            type: 'modify',
            data: e.target.toObject(),
            timestamp: Date.now(),
          });
        }
      });

      canvas.on('object:removed', (e) => {
        if (onDrawingChange) {
          onDrawingChange({
            type: 'remove',
            data: e.target.toObject(),
            timestamp: Date.now(),
          });
        }
      });
    }

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, [onDrawingChange]);

  // Update brush properties
  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.freeDrawingBrush.width = brushSize;
      fabricCanvasRef.current.freeDrawingBrush.color = brushColor;
    }
  }, [brushSize, brushColor]);

  // Handle tool selection
  const handleToolSelect = (tool) => {
    setSelectedTool(tool);
    if (fabricCanvasRef.current) {
      switch (tool) {
        case 'brush':
          fabricCanvasRef.current.isDrawingMode = true;
          break;
        case 'select':
          fabricCanvasRef.current.isDrawingMode = false;
          break;
        case 'rectangle':
          fabricCanvasRef.current.isDrawingMode = false;
          // Add rectangle tool logic
          break;
        case 'circle':
          fabricCanvasRef.current.isDrawingMode = false;
          // Add circle tool logic
          break;
        case 'text':
          fabricCanvasRef.current.isDrawingMode = false;
          // Add text tool logic
          break;
        default:
          break;
      }
    }
  };

  // Clear canvas
  const clearCanvas = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#ffffff';
      fabricCanvasRef.current.renderAll();
    }
  };

  // Undo last action
  const undoLast = () => {
    if (fabricCanvasRef.current) {
      const objects = fabricCanvasRef.current.getObjects();
      if (objects.length > 0) {
        fabricCanvasRef.current.remove(objects[objects.length - 1]);
        fabricCanvasRef.current.renderAll();
      }
    }
  };

  const tools = [
    { id: 'brush', label: 'Brush', icon: '🖌️' },
    { id: 'select', label: 'Select', icon: '↖️' },
    { id: 'rectangle', label: 'Rectangle', icon: '⬜' },
    { id: 'circle', label: 'Circle', icon: '⭕' },
    { id: 'text', label: 'Text', icon: '📝' },
  ];

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB',
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Tools */}
            <div className="flex items-center space-x-2">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`p-2 rounded-md transition-colors ${
                    selectedTool === tool.id
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={tool.label}
                >
                  {tool.icon}
                </button>
              ))}
            </div>

            {/* Brush size */}
            <div className="flex items-center space-x-2">
              <label htmlFor="brush-size" className="text-sm text-gray-700 dark:text-gray-300">Size:</label>
              <input
                id="brush-size"
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">{brushSize}px</span>
            </div>

            {/* Colors */}
            <div className="flex items-center space-x-2">
              <label htmlFor="color-palette" className="text-sm text-gray-700 dark:text-gray-300">Color:</label>
              <div id="color-palette" className="flex space-x-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      brushColor === color ? 'border-gray-800 dark:border-gray-200' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={undoLast}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-sm transition-colors"
            >
              ↶ Undo
            </button>
            <button
              onClick={clearCanvas}
              className="px-3 py-1 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 rounded-md text-sm transition-colors"
            >
              🗑️ Clear
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <canvas
            ref={canvasRef}
            className="border border-gray-200 dark:border-gray-700 rounded"
          />
        </div>
      </div>
    </div>
  );
};

export default CanvasDrawing;
