# Notes Editor Component

A comprehensive real-time collaborative notes editor with rich text editing capabilities, full accessibility support, and advanced conflict resolution.

## Overview

The Notes Editor component provides a powerful collaborative editing experience for notes and documents. It features real-time synchronization, rich text formatting, user presence tracking, and comprehensive accessibility support.

## Features

### Rich Text Editing
- **Text Formatting**: Bold, italic, underline, strikethrough
- **Lists**: Bullet lists and numbered lists
- **Headings**: H1, H2, H3 heading support
- **Alignment**: Left, center, right, and justify alignment
- **Keyboard Shortcuts**: Ctrl+B (bold), Ctrl+I (italic), Ctrl+U (underline), Ctrl+S (save)

### Real-time Collaboration
- **Live Synchronization**: Real-time content synchronization via Socket.io
- **User Presence**: Live cursor tracking and user identification
- **Typing Indicators**: Real-time typing start/stop notifications
- **Conflict Resolution**: Automatic conflict resolution using operational transforms
- **Batched Updates**: Efficient network usage with batched change processing

### Accessibility Features
- **ARIA Roles**: Complete ARIA labeling for all interactive elements
- **Keyboard Navigation**: Full keyboard navigation support
- **Screen Reader Support**: Live announcements and status updates
- **Focus Management**: Proper focus handling and restoration
- **High Contrast**: Support for high contrast mode
- **Font Sizing**: Adjustable font sizes for better readability

### Advanced Features
- **Debounced Updates**: Intelligent debouncing to reduce network traffic
- **Auto-save**: Automatic saving with visual indicators
- **Change Tracking**: Track unsaved changes and last saved time
- **Word/Character Count**: Real-time word and character counting
- **User Cursors**: Visual representation of other users' cursors
- **Typing Indicators**: Show when other users are typing

## Usage

### Basic Usage
```jsx
import NotesEditor from './components/Workspace/NotesEditor';

function MyWorkspace() {
  const [roomData, setRoomData] = useState({});
  const [participants, setParticipants] = useState({});

  const handleRoomUpdate = (updates) => {
    setRoomData(prev => ({ ...prev, ...updates }));
  };

  return (
    <NotesEditor
      roomId="room-123"
      roomData={roomData}
      participants={participants}
      onRoomUpdate={handleRoomUpdate}
    />
  );
}
```

### Advanced Usage
```jsx
import NotesEditor from './components/Workspace/NotesEditor';
import { useSocket } from '../../contexts/SocketContext';

function MyWorkspace() {
  const { socket, connected } = useSocket();
  const [roomData, setRoomData] = useState({
    notes: '<p>Welcome to collaborative notes!</p>'
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
      <NotesEditor
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
| `roomData` | object | Yes | Room data containing notes content |
| `participants` | object | Yes | Object containing participant information |
| `onRoomUpdate` | function | Yes | Callback function for room updates |

### roomData Structure
```javascript
{
  notes: string, // HTML content of the notes
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

## Socket.io Events

### Outgoing Events
- **notes-change**: Send content changes to server
- **cursor-update**: Send cursor position updates
- **selection-update**: Send text selection updates
- **typing-start**: Send typing start notification
- **typing-stop**: Send typing stop notification

### Incoming Events
- **notes-change**: Receive content changes from other users
- **cursor-update**: Receive cursor updates from other users
- **selection-update**: Receive selection updates from other users
- **typing-start**: Receive typing start notifications
- **typing-stop**: Receive typing stop notifications

## Accessibility Features

### Keyboard Navigation
- **Tab**: Navigate between interactive elements
- **Enter/Space**: Activate buttons and controls
- **Arrow Keys**: Navigate within text content
- **Ctrl+B**: Toggle bold formatting
- **Ctrl+I**: Toggle italic formatting
- **Ctrl+U**: Toggle underline formatting
- **Ctrl+S**: Save notes

### Screen Reader Support
- **Live Regions**: Real-time updates announced to screen readers
- **ARIA Labels**: Descriptive labels for all interactive elements
- **Status Announcements**: Current state changes announced
- **Focus Management**: Proper focus handling and restoration

### Visual Accessibility
- **High Contrast**: Support for high contrast mode
- **Font Sizing**: Adjustable font sizes
- **Focus Indicators**: Clear visual focus indicators
- **Status Indicators**: Visual status and activity indicators

## State Management

### Local State
- **content**: Current notes content (HTML string)
- **isEditing**: Whether user is currently editing
- **lastSaved**: Timestamp of last save
- **isSaving**: Whether save operation is in progress
- **hasUnsavedChanges**: Whether there are unsaved changes
- **formatting**: Current text formatting state
- **userCursors**: Other users' cursor positions
- **userSelections**: Other users' text selections
- **typingUsers**: Users currently typing

### State Flow
1. **User Input**: User types or formats text
2. **Local Update**: Component updates local state
3. **Debounced Change**: Changes are debounced to reduce network traffic
4. **Batched Update**: Changes are batched and sent to server
5. **Server Processing**: Server processes changes and updates database
6. **Broadcast**: Server broadcasts changes to all connected clients
7. **State Sync**: All clients update their state based on broadcast

## Conflict Resolution

### Operational Transforms
The component uses operational transforms to resolve conflicts when multiple users edit simultaneously:

1. **Change Tracking**: Each change is tracked with a unique ID and timestamp
2. **Batched Processing**: Changes are processed in batches to reduce conflicts
3. **Last-Write-Wins**: Simple conflict resolution for non-text content
4. **User Notifications**: Users are notified of conflict resolution

### Change Processing
```javascript
// Example change object
{
  id: 'change-1234567890-0.123456789',
  type: 'content-change',
  content: '<p>Updated content</p>',
  timestamp: 1234567890,
  userId: 'user-123',
  username: 'john_doe'
}
```

## Performance Optimization

### Debouncing
- **Content Changes**: 300ms debounce for content changes
- **Save Operations**: 1000ms debounce for save operations
- **Network Requests**: Reduces unnecessary network traffic

### Batching
- **Change Batching**: Changes are batched every 100ms
- **Efficient Updates**: Reduces network overhead
- **State Optimization**: Optimized state updates

### Memory Management
- **Cleanup**: Proper cleanup of timeouts and event listeners
- **State Cleanup**: Automatic cleanup of unused state
- **Resource Management**: Efficient resource usage

## Error Handling

### Error Types
- **Network Errors**: Socket.io connection issues
- **Validation Errors**: Input validation failures
- **State Errors**: Component state inconsistencies
- **Accessibility Errors**: Screen reader or keyboard navigation issues

### Error Recovery
- **Automatic Retry**: Automatic retry for network operations
- **Graceful Degradation**: Fallback behavior when features unavailable
- **User Feedback**: Clear error messages and recovery instructions
- **State Restoration**: Automatic state restoration after errors

## Troubleshooting

### Common Issues

#### Content Not Syncing
- **Check**: Socket.io connection status
- **Check**: Room ID is correct
- **Check**: User authentication
- **Solution**: Verify Socket.io connection and room setup

#### Formatting Not Working
- **Check**: Browser compatibility
- **Check**: ContentEditable support
- **Check**: JavaScript errors in console
- **Solution**: Ensure browser supports contentEditable and execCommand

#### Accessibility Issues
- **Check**: Screen reader compatibility
- **Check**: Keyboard navigation
- **Check**: ARIA labels and roles
- **Solution**: Test with screen readers and keyboard-only navigation

#### Performance Issues
- **Check**: Large content size
- **Check**: Too many concurrent users
- **Check**: Network latency
- **Solution**: Optimize content size and network usage

### Debug Mode

Enable debug mode for detailed logging:

```javascript
// Enable debug mode
const DEBUG = process.env.NODE_ENV === 'development';

// Use debug logging
if (DEBUG) {
  console.log('Notes editor state:', {
    content,
    isEditing,
    hasUnsavedChanges,
    userCursors,
    typingUsers
  });
}
```

## Browser Compatibility

### Supported Browsers
- **Chrome**: 60+
- **Firefox**: 55+
- **Safari**: 12+
- **Edge**: 79+

### Required Features
- **ContentEditable**: For rich text editing
- **execCommand**: For text formatting
- **WebSocket**: For real-time communication
- **ES6+**: For modern JavaScript features

## Security Considerations

### Input Sanitization
- **HTML Sanitization**: Sanitize HTML content to prevent XSS
- **Input Validation**: Validate all user inputs
- **Content Filtering**: Filter potentially harmful content

### Data Protection
- **Encryption**: Encrypt sensitive data in transit
- **Authentication**: Verify user authentication
- **Authorization**: Check user permissions

## Future Enhancements

### Planned Features
- **Rich Text Extensions**: More formatting options
- **Collaborative Comments**: Inline comments and suggestions
- **Version History**: Track and restore previous versions
- **Export Options**: Export to various formats
- **Mobile Support**: Mobile-optimized interface

### Extensibility
- **Plugin System**: Plugin architecture for custom features
- **Custom Formatting**: Custom formatting options
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

### Testing
- **Unit Tests**: Test individual component functionality
- **Integration Tests**: Test component interactions
- **Accessibility Tests**: Test accessibility features
- **Real-time Tests**: Test Socket.io integration

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check component documentation
- **Community**: Join community discussions
- **Contributing**: Contribute to the project

