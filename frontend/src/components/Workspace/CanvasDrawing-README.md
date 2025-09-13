# Canvas Drawing Component

A comprehensive collaborative whiteboard with Web Speech API voice commands, textual description logging, and full accessibility support.

## Overview

The Canvas Drawing component provides a powerful collaborative whiteboard experience with real-time synchronization, voice commands, and comprehensive accessibility features. It supports multiple drawing tools, shapes, and provides detailed textual descriptions for screen readers.

## Features

### Drawing Tools
- **Pen**: Freehand drawing with customizable stroke width
- **Brush**: Soft brush strokes with opacity control
- **Marker**: Highlighter-style drawing
- **Eraser**: Remove parts of drawings
- **Rectangle**: Draw rectangular shapes
- **Circle**: Draw circular shapes
- **Line**: Draw straight lines
- **Text**: Add text annotations
- **Select**: Select and manipulate objects

### Voice Commands (Web Speech API)
- **Tool Selection**: "pen", "brush", "marker", "eraser", "rectangle", "circle", "line", "text", "select"
- **Color Selection**: "red", "blue", "green", "black", "white"
- **Actions**: "undo", "redo", "clear", "save"
- **Toggle**: Enable/disable voice commands
- **Real-time Processing**: Continuous speech recognition

### Textual Descriptions
- **Object Descriptions**: Detailed descriptions of all canvas objects
- **Live Updates**: Real-time description updates as canvas changes
- **Screen Reader Support**: Automatic announcements for canvas changes
- **Description Log**: Historical log of all canvas changes
- **AI Processing**: Structured data for AI analysis

### Real-time Collaboration
- **Live Synchronization**: Real-time canvas synchronization via Socket.io
- **User Presence**: Live cursor tracking and user identification
- **Drawing Events**: Real-time drawing event broadcasting
- **Conflict Resolution**: Automatic conflict resolution
- **State Management**: Efficient state synchronization

### Accessibility Features
- **ARIA Roles**: Complete ARIA labeling for all interactive elements
- **Keyboard Navigation**: Full keyboard navigation support
- **Screen Reader Support**: Live announcements and status updates
- **Focus Management**: Proper focus handling and restoration
- **High Contrast**: Support for high contrast mode
- **Voice Commands**: Hands-free operation via voice

## Usage

### Basic Usage
```jsx
import CanvasDrawing from './components/Workspace/CanvasDrawing';

function MyWorkspace() {
  const [roomData, setRoomData] = useState({});
  const [participants, setParticipants] = useState({});

  const handleRoomUpdate = (updates) => {
    setRoomData(prev => ({ ...prev, ...updates }));
  };

  return (
    <CanvasDrawing
      roomId="room-123"
      roomData={roomData}
      participants={participants}
      onRoomUpdate={handleRoomUpdate}
    />
  );
}
```

### Advanced Usage with Voice Commands
```jsx
import CanvasDrawing from './components/Workspace/CanvasDrawing';
import { useSocket } from '../../contexts/SocketContext';

function MyWorkspace() {
  const { socket, connected } = useSocket();
  const [roomData, setRoomData] = useState({
    canvas: null
  });
  const [participants, setParticipants] = useState({});

  const handleRoomUpdate = (updates) => {
    setRoomData(prev => ({ ...prev, ...updates }));
    
    // Send updates to server
    if (socket && connected) {
      socket.emit('room-update', {
        roomId: 'room-123',
        updates
      });
    }
  };

  return (
    <div className="h-screen">
      <CanvasDrawing
        roomId="room-123"
        roomData={roomData}
        participants={participants}
        onRoomUpdate={handleRoomUpdate}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `roomId` | string | Yes | Unique identifier for the room |
| `roomData` | object | Yes | Room data containing canvas content |
| `participants` | object | Yes | Object containing participant information |
| `onRoomUpdate` | function | Yes | Callback function for room updates |

### roomData Structure
```javascript
{
  canvas: object, // Fabric.js canvas JSON data
  // ... other room properties
}
```

### participants Structure
```javascript
{
  [userId]: {
    userId: string,
    username: string,
    joinedAt: string,
    lastActivityAt: string,
    // ... other participant properties
  }
}
```

## Voice Commands

### Tool Selection Commands
- **"pen"** or **"pencil"** - Switch to pen tool
- **"brush"** - Switch to brush tool
- **"marker"** - Switch to marker tool
- **"eraser"** - Switch to eraser tool
- **"rectangle"** or **"rect"** - Switch to rectangle tool
- **"circle"** - Switch to circle tool
- **"line"** - Switch to line tool
- **"text"** - Switch to text tool
- **"select"** - Switch to select tool

### Color Selection Commands
- **"red"** - Change color to red
- **"blue"** - Change color to blue
- **"green"** - Change color to green
- **"black"** - Change color to black
- **"white"** - Change color to white

### Action Commands
- **"undo"** - Undo last action
- **"redo"** - Redo last action
- **"clear"** or **"clear all"** - Clear canvas
- **"save"** - Save canvas

### Voice Command Setup
```javascript
// Enable voice commands
const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false);

// Toggle voice commands
const toggleVoiceCommands = () => {
  setVoiceCommandsEnabled(prev => !prev);
};

// Voice command processing
const processVoiceCommand = (command) => {
  const commandLower = command.toLowerCase();
  
  if (commandLower.includes('pen')) {
    setCurrentTool('pen');
    announce('Switched to pen tool', 'polite');
  }
  // ... other command processing
};
```

## Textual Descriptions

### Description Generation
The component automatically generates textual descriptions for all canvas objects:

```javascript
// Example descriptions
"Rectangle 1: 100x50 pixels, color #FF0000, position (50, 75)"
"Circle 1: radius 25 pixels, color #0000FF, position (150, 100)"
"Line 1: from (200, 50) to (300, 150), color #00FF00"
"Text 1: "Hello World", color #000000, position (100, 200)"
"Drawing 1: 15 points, color #FF00FF, width 3"
```

### Description Log Structure
```javascript
{
  timestamp: 1234567890,
  action: 'canvas_updated',
  description: 'Canvas now contains 5 objects',
  details: [
    'Rectangle 1: 100x50 pixels, color #FF0000, position (50, 75)',
    'Circle 1: radius 25 pixels, color #0000FF, position (150, 100)',
    // ... more descriptions
  ]
}
```

### Screen Reader Integration
```javascript
// Automatic announcements
if (screenReader) {
  announce(`Canvas updated: ${objects.length} objects`, 'polite');
}

// Live region updates
<div 
  className="sr-only" 
  aria-live="polite" 
  aria-atomic="true"
  id="canvas-status"
>
  {getCanvasStatus()}
</div>
```

## Socket.io Events

### Outgoing Events
- **draw-event**: Send drawing events to server
- **cursor-update**: Send cursor position updates
- **canvas-update**: Send canvas state updates

### Incoming Events
- **draw-event**: Receive drawing events from other users
- **cursor-update**: Receive cursor updates from other users
- **canvas-update**: Receive canvas updates from other users

### Event Structure
```javascript
// Drawing event
{
  roomId: 'room-123',
  action: 'drawing_complete',
  canvasData: { /* Fabric.js JSON */ },
  tool: 'pen',
  color: '#FF0000',
  strokeWidth: 2,
  timestamp: 1234567890
}

// Cursor update event
{
  roomId: 'room-123',
  cursor: {
    userId: 'user-123',
    username: 'john_doe',
    x: 150,
    y: 200,
    timestamp: 1234567890
  }
}
```

## Accessibility Features

### Keyboard Navigation
- **P**: Pen tool
- **B**: Brush tool
- **M**: Marker tool
- **E**: Eraser tool
- **R**: Rectangle tool
- **C**: Circle tool
- **L**: Line tool
- **T**: Text tool
- **S**: Select tool
- **Ctrl+Z**: Undo
- **Ctrl+Shift+Z**: Redo
- **Ctrl+S**: Save
- **Ctrl+A**: Clear

### Screen Reader Support
- **Live Regions**: Real-time updates announced to screen readers
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Status Announcements**: Current state changes announced
- **Focus Management**: Proper focus handling and restoration
- **Object Descriptions**: Detailed descriptions of all canvas objects

### Visual Accessibility
- **High Contrast**: Support for high contrast mode
- **Focus Indicators**: Clear visual focus indicators
- **Status Indicators**: Visual status and activity indicators
- **Color Contrast**: High contrast color options

## Drawing Tools

### Pen Tool
```javascript
// Pen tool configuration
const penTool = {
  name: 'Pen',
  icon: '✏️',
  shortcut: 'p',
  isDrawingMode: true,
  brush: {
    width: currentStrokeWidth,
    color: currentColor,
    opacity: currentOpacity
  }
};
```

### Brush Tool
```javascript
// Brush tool configuration
const brushTool = {
  name: 'Brush',
  icon: '🖌️',
  shortcut: 'b',
  isDrawingMode: true,
  brush: {
    width: currentStrokeWidth,
    color: currentColor,
    opacity: currentOpacity * 0.8 // Slightly transparent
  }
};
```

### Shape Tools
```javascript
// Rectangle tool
const rectangleTool = {
  name: 'Rectangle',
  icon: '⬜',
  shortcut: 'r',
  isDrawingMode: false,
  createShape: (startPoint, endPoint) => {
    return new fabric.Rect({
      left: Math.min(startPoint.x, endPoint.x),
      top: Math.min(startPoint.y, endPoint.y),
      width: Math.abs(endPoint.x - startPoint.x),
      height: Math.abs(endPoint.y - startPoint.y),
      fill: currentColor,
      stroke: currentColor,
      strokeWidth: currentStrokeWidth
    });
  }
};
```

## State Management

### Local State
- **canvas**: Fabric.js canvas instance
- **isDrawing**: Whether user is currently drawing
- **currentTool**: Currently selected drawing tool
- **currentColor**: Currently selected color
- **currentStrokeWidth**: Currently selected stroke width
- **voiceCommandsEnabled**: Whether voice commands are enabled
- **isListening**: Whether speech recognition is active
- **drawingDescriptions**: Textual descriptions of canvas objects
- **descriptionLog**: Historical log of canvas changes

### State Flow
1. **User Input**: User draws or uses voice commands
2. **Local Update**: Component updates local state
3. **Description Generation**: Generate textual descriptions
4. **Socket Broadcast**: Send changes to server
5. **Server Processing**: Server processes changes
6. **Client Sync**: All clients update their canvas
7. **Screen Reader**: Announce changes to screen readers

## Performance Optimization

### Drawing Optimization
- **Fabric.js**: Efficient canvas rendering
- **Object Pooling**: Reuse drawing objects
- **Lazy Loading**: Load canvas data on demand
- **Debounced Updates**: Reduce network traffic

### Voice Recognition Optimization
- **Continuous Mode**: Continuous speech recognition
- **Command Filtering**: Filter relevant commands
- **Timeout Handling**: Handle recognition timeouts
- **Error Recovery**: Graceful error handling

### Memory Management
- **History Limiting**: Limit drawing history to 50 states
- **Object Cleanup**: Clean up unused objects
- **Event Cleanup**: Remove event listeners on unmount

## Error Handling

### Voice Recognition Errors
```javascript
recognition.onerror = (event) => {
  console.error('Speech recognition error:', event.error);
  setIsListening(false);
  
  if (screenReader) {
    announce('Voice command error', 'polite');
  }
  
  // Retry logic
  if (event.error === 'network') {
    setTimeout(() => {
      startVoiceRecognition();
    }, 1000);
  }
};
```

### Canvas Errors
```javascript
// Canvas initialization error
try {
  const fabricCanvas = new window.fabric.Canvas(canvasRef.current);
  setCanvas(fabricCanvas);
} catch (error) {
  console.error('Canvas initialization error:', error);
  // Fallback to basic canvas
}
```

### Network Errors
```javascript
// Socket.io connection error
if (!connected) {
  console.warn('Socket.io not connected');
  // Queue changes for later sync
  queueChangeForSync(change);
}
```

## Browser Compatibility

### Supported Browsers
- **Chrome**: 60+ (Full support)
- **Firefox**: 55+ (Full support)
- **Safari**: 12+ (Limited voice commands)
- **Edge**: 79+ (Full support)

### Required Features
- **Canvas API**: For drawing functionality
- **Fabric.js**: For advanced canvas features
- **Web Speech API**: For voice commands
- **WebSocket**: For real-time communication
- **ES6+**: For modern JavaScript features

### Voice Commands Support
- **Chrome**: Full support
- **Firefox**: Limited support
- **Safari**: Limited support
- **Edge**: Full support

## Security Considerations

### Voice Data
- **Local Processing**: Voice commands processed locally
- **No Storage**: Voice data not stored or transmitted
- **Privacy**: No voice data sent to external servers

### Canvas Data
- **Input Sanitization**: Sanitize canvas data
- **Content Filtering**: Filter potentially harmful content
- **Size Limits**: Limit canvas size and complexity

### Network Security
- **Encryption**: Encrypt data in transit
- **Authentication**: Verify user authentication
- **Authorization**: Check user permissions

## Troubleshooting

### Common Issues

#### Voice Commands Not Working
- **Check**: Browser support for Web Speech API
- **Check**: Microphone permissions
- **Check**: HTTPS connection (required for voice)
- **Solution**: Enable voice commands and check permissions

#### Canvas Not Loading
- **Check**: Fabric.js library loaded
- **Check**: Canvas element exists
- **Check**: JavaScript errors in console
- **Solution**: Ensure Fabric.js is loaded before component

#### Drawing Not Syncing
- **Check**: Socket.io connection status
- **Check**: Room ID is correct
- **Check**: User authentication
- **Solution**: Verify Socket.io connection and room setup

#### Screen Reader Issues
- **Check**: ARIA labels and roles
- **Check**: Live region updates
- **Check**: Focus management
- **Solution**: Test with screen readers and keyboard navigation

### Debug Mode

Enable debug mode for detailed logging:

```javascript
// Enable debug mode
const DEBUG = process.env.NODE_ENV === 'development';

// Use debug logging
if (DEBUG) {
  console.log('Canvas state:', {
    currentTool,
    currentColor,
    currentStrokeWidth,
    isDrawing,
    voiceCommandsEnabled,
    isListening
  });
}
```

## Testing

### Unit Tests
- Test individual component functionality
- Test voice command processing
- Test drawing tool switching
- Test accessibility features

### Integration Tests
- Test Socket.io integration
- Test real-time synchronization
- Test voice command integration
- Test screen reader compatibility

### Accessibility Tests
- Test screen reader compatibility
- Test keyboard navigation
- Test ARIA labels and roles
- Test focus management

## Future Enhancements

### Planned Features
- **More Drawing Tools**: Additional shapes and tools
- **Layer Support**: Multiple drawing layers
- **Image Support**: Import and draw on images
- **Collaborative Cursors**: Real-time cursor tracking
- **Advanced Voice Commands**: More complex voice interactions

### Extensibility
- **Plugin System**: Plugin architecture for custom tools
- **Custom Shapes**: Custom shape creation
- **API Integration**: Third-party API integration
- **Custom Themes**: Custom styling options

## Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open browser to `http://localhost:3000`

### Code Style
- **ESLint**: Follow ESLint configuration
- **Prettier**: Use Prettier for code formatting
- **Comments**: Comprehensive inline comments
- **Documentation**: JSDoc comments for functions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check component documentation
- **Community**: Join community discussions
- **Contributing**: Contribute to the project
