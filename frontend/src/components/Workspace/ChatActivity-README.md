# Chat & Activity Feed Components

Comprehensive real-time chat and activity tracking with accessible notifications, visual alerts, and live user presence indicators.

## Overview

The Chat & Activity Feed components provide a complete real-time communication and activity tracking system with full accessibility support. They include real-time chat, activity feed, user presence indicators, and comprehensive notification systems.

## Features

### Real-time Chat
- **Live Messaging**: Real-time message synchronization via Socket.io
- **Typing Indicators**: Live typing indicators for all users
- **Message History**: Persistent message history with search
- **User Identification**: Color-coded messages with user identification
- **Accessible Notifications**: Screen reader announcements for new messages
- **Keyboard Navigation**: Full keyboard navigation support

### Activity Feed
- **Live Activity Tracking**: Real-time activity monitoring
- **User Presence**: Live user presence indicators
- **Activity Filtering**: Filter by activity type, user, and time
- **Search Capabilities**: Search through activity history
- **Export Functionality**: Export activity data as JSON
- **Visual Indicators**: Color-coded activity types

### Accessible Notifications
- **Visual Alerts**: Visual notifications that duplicate audio cues
- **Audio Notifications**: Optional sound notifications
- **Screen Reader Support**: Live announcements for all events
- **Focus Management**: Proper focus handling and restoration
- **ARIA Attributes**: Complete ARIA labeling for all elements

### User Presence
- **Online Status**: Real-time online/offline status
- **Last Seen**: Last activity timestamps
- **User Colors**: Color-coded user identification
- **Activity Types**: Track different types of user activities

## Usage

### Basic Chat Usage
```jsx
import ChatPanel from './components/Workspace/ChatPanel';

function MyWorkspace() {
  const [roomData, setRoomData] = useState({});
  const [participants, setParticipants] = useState({});

  const handleRoomUpdate = (updates) => {
    setRoomData(prev => ({ ...prev, ...updates }));
  };

  return (
    <ChatPanel
      roomId="room-123"
      roomData={roomData}
      participants={participants}
      onRoomUpdate={handleRoomUpdate}
      isVisible={true}
    />
  );
}
```

### Basic Activity Feed Usage
```jsx
import ActivityFeed from './components/Workspace/ActivityFeed';

function MyWorkspace() {
  const [roomData, setRoomData] = useState({});
  const [participants, setParticipants] = useState({});

  const handleRoomUpdate = (updates) => {
    setRoomData(prev => ({ ...prev, ...updates }));
  };

  return (
    <ActivityFeed
      roomId="room-123"
      roomData={roomData}
      participants={participants}
      onRoomUpdate={handleRoomUpdate}
      isVisible={true}
    />
  );
}
```

### Combined Usage
```jsx
import ChatPanel from './components/Workspace/ChatPanel';
import ActivityFeed from './components/Workspace/ActivityFeed';

function MyWorkspace() {
  const [roomData, setRoomData] = useState({});
  const [participants, setParticipants] = useState({});
  const [showChat, setShowChat] = useState(true);
  const [showActivity, setShowActivity] = useState(true);

  const handleRoomUpdate = (updates) => {
    setRoomData(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="flex h-screen">
      {/* Main workspace content */}
      <div className="flex-1">
        {/* Your main workspace content */}
      </div>
      
      {/* Chat Panel */}
      {showChat && (
        <div className="w-80">
          <ChatPanel
            roomId="room-123"
            roomData={roomData}
            participants={participants}
            onRoomUpdate={handleRoomUpdate}
            isVisible={showChat}
          />
        </div>
      )}
      
      {/* Activity Feed */}
      {showActivity && (
        <div className="w-80">
          <ActivityFeed
            roomId="room-123"
            roomData={roomData}
            participants={participants}
            onRoomUpdate={handleRoomUpdate}
            isVisible={showActivity}
          />
        </div>
      )}
    </div>
  );
}
```

## Props

### ChatPanel Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `roomId` | string | Yes | Unique identifier for the room |
| `roomData` | object | Yes | Room data containing chat messages |
| `participants` | object | Yes | Object containing participant information |
| `onRoomUpdate` | function | Yes | Callback function for room updates |
| `isVisible` | boolean | No | Whether the chat panel is visible (default: true) |

### ActivityFeed Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `roomId` | string | Yes | Unique identifier for the room |
| `roomData` | object | Yes | Room data containing activities |
| `participants` | object | Yes | Object containing participant information |
| `onRoomUpdate` | function | Yes | Callback function for room updates |
| `isVisible` | boolean | No | Whether the activity feed is visible (default: true) |

## Socket.io Events

### Chat Events
- **chat-message**: Send/receive chat messages
- **typing-start**: User started typing
- **typing-stop**: User stopped typing
- **user-join**: User joined the room
- **user-leave**: User left the room

### Activity Events
- **activity-update**: Activity feed updates
- **presence-update**: User presence updates
- **drawing-event**: Drawing activity events
- **code-change**: Code editing events
- **notes-change**: Notes editing events

### Event Structure
```javascript
// Chat message event
{
  roomId: 'room-123',
  message: {
    id: 'msg-1234567890',
    text: 'Hello world!',
    username: 'john_doe',
    userId: 'user-123',
    timestamp: 1234567890,
    type: 'message',
    color: '#FF0000'
  }
}

// Activity event
{
  roomId: 'room-123',
  activity: {
    type: 'message',
    description: 'john_doe sent a message',
    details: 'Hello world!',
    timestamp: 1234567890,
    userId: 'user-123',
    username: 'john_doe',
    color: '#FF0000'
  }
}
```

## Accessibility Features

### Chat Panel Accessibility
- **ARIA Roles**: Complete ARIA labeling for all interactive elements
- **Live Regions**: Real-time updates announced to screen readers
- **Keyboard Navigation**: Full keyboard navigation support
- **Focus Management**: Proper focus handling and restoration
- **Screen Reader Support**: Live announcements for new messages
- **High Contrast**: Support for high contrast mode

### Activity Feed Accessibility
- **ARIA Roles**: Complete ARIA labeling for all interactive elements
- **Live Regions**: Real-time updates announced to screen readers
- **Keyboard Navigation**: Full keyboard navigation support
- **Focus Management**: Proper focus handling and restoration
- **Screen Reader Support**: Live announcements for activities
- **High Contrast**: Support for high contrast mode

### Keyboard Navigation
- **Tab**: Navigate between interactive elements
- **Enter**: Send message (in chat input)
- **Shift+Enter**: New line in message input
- **Arrow Keys**: Navigate through messages and activities
- **Escape**: Close modals and popups

### Screen Reader Support
- **Live Announcements**: Real-time updates announced to screen readers
- **Status Updates**: Current state changes announced
- **Message Notifications**: New messages announced
- **Activity Notifications**: New activities announced
- **User Presence**: User join/leave announcements

## Notification System

### Visual Notifications
```javascript
// Notification structure
{
  id: 'notif-1234567890',
  type: 'message', // message, join, leave, typing, drawing
  title: 'New Message',
  message: 'john_doe: Hello world!',
  duration: 5000, // milliseconds
  timestamp: 1234567890
}
```

### Audio Notifications
```javascript
// Audio notification types
const notificationSounds = {
  message: [800, 600], // frequencies in Hz
  join: [1000, 800, 600],
  leave: [600, 400, 200],
  typing: [400],
  drawing: [1200, 1000]
};
```

### Notification Settings
```javascript
const notificationSettings = {
  soundEnabled: true,
  visualEnabled: true,
  joinLeaveEnabled: true,
  typingEnabled: true,
  drawingEnabled: true,
  messageEnabled: true
};
```

## Activity Types

### Supported Activity Types
- **message**: Chat messages
- **join**: User joined the room
- **leave**: User left the room
- **typing**: User is typing
- **drawing**: Drawing activities
- **code**: Code editing activities
- **notes**: Notes editing activities
- **system**: System activities

### Activity Structure
```javascript
{
  id: 'activity-1234567890',
  type: 'message',
  description: 'john_doe sent a message',
  details: 'Hello world!',
  timestamp: 1234567890,
  userId: 'user-123',
  username: 'john_doe',
  color: '#FF0000'
}
```

## User Presence

### Presence States
- **Online**: User is currently active
- **Offline**: User is not active
- **Recently Active**: User was active within the last 5 minutes

### Presence Data
```javascript
{
  userId: 'user-123',
  username: 'john_doe',
  color: '#FF0000',
  isOnline: true,
  lastSeen: 1234567890
}
```

## Real-time Update Flow

### Chat Message Flow
1. **User Input**: User types message and presses Enter
2. **Local Update**: Message added to local state immediately
3. **Socket Broadcast**: Message sent to server via Socket.io
4. **Server Processing**: Server processes and validates message
5. **Client Sync**: All clients receive message via Socket.io
6. **Screen Reader**: Message announced to screen readers
7. **Visual Notification**: Visual notification shown to users

### Activity Flow
1. **User Action**: User performs an action (draw, type, etc.)
2. **Activity Generation**: Activity object created
3. **Local Update**: Activity added to local state
4. **Socket Broadcast**: Activity sent to server
5. **Server Processing**: Server processes activity
6. **Client Sync**: All clients receive activity
7. **Screen Reader**: Activity announced to screen readers
8. **Visual Update**: Activity feed updated

### Presence Flow
1. **User Action**: User performs any action
2. **Presence Update**: User presence data updated
3. **Socket Broadcast**: Presence sent to server
4. **Client Sync**: All clients receive presence update
5. **UI Update**: Presence indicators updated
6. **Screen Reader**: Presence change announced

## Performance Optimization

### Message Management
- **Message Limiting**: Keep only last 1000 messages in memory
- **Lazy Loading**: Load messages on demand
- **Debounced Updates**: Debounce typing indicators
- **Efficient Rendering**: Use React.memo for message components

### Activity Management
- **Activity Limiting**: Keep only last 1000 activities in memory
- **Filtering**: Client-side filtering for better performance
- **Virtual Scrolling**: Virtual scrolling for large activity lists
- **Efficient Updates**: Batch activity updates

### Memory Management
- **Cleanup**: Clean up event listeners on unmount
- **State Cleanup**: Remove old messages and activities
- **Reference Cleanup**: Clean up refs and timeouts

## Error Handling

### Chat Errors
```javascript
// Message send error
const handleSendError = (error) => {
  console.error('Failed to send message:', error);
  showNotification({
    type: 'error',
    title: 'Send Failed',
    message: 'Failed to send message. Please try again.',
    duration: 5000
  });
};
```

### Activity Errors
```javascript
// Activity sync error
const handleActivityError = (error) => {
  console.error('Failed to sync activity:', error);
  // Retry logic
  setTimeout(() => {
    syncActivities();
  }, 1000);
};
```

### Network Errors
```javascript
// Socket.io connection error
if (!connected) {
  console.warn('Socket.io not connected');
  // Queue messages for later sync
  queueMessageForSync(message);
}
```

## Browser Compatibility

### Supported Browsers
- **Chrome**: 60+
- **Firefox**: 55+
- **Safari**: 12+
- **Edge**: 79+

### Required Features
- **WebSocket**: For real-time communication
- **Audio Context**: For notification sounds
- **ES6+**: For modern JavaScript features
- **CSS Grid/Flexbox**: For layout

## Troubleshooting

### Common Issues

#### Messages Not Syncing
- **Check**: Socket.io connection status
- **Check**: Room ID is correct
- **Check**: User authentication
- **Solution**: Verify Socket.io connection and room setup

#### Notifications Not Working
- **Check**: Notification permissions
- **Check**: Audio context support
- **Check**: Notification settings
- **Solution**: Enable notifications and check browser permissions

#### Screen Reader Issues
- **Check**: ARIA labels and roles
- **Check**: Live region updates
- **Check**: Focus management
- **Solution**: Test with screen readers and keyboard navigation

#### Performance Issues
- **Check**: Message/activity count
- **Check**: Network latency
- **Check**: Browser performance
- **Solution**: Optimize message/activity limits and rendering

### Debug Mode

Enable debug mode for detailed logging:

```javascript
// Enable debug mode
const DEBUG = process.env.NODE_ENV === 'development';

// Use debug logging
if (DEBUG) {
  console.log('Chat state:', {
    messages: messages.length,
    typingUsers: Object.keys(typingUsers).length,
    unreadCount,
    isFocused
  });
}
```

## Testing

### Unit Tests
- Test individual component functionality
- Test message sending and receiving
- Test activity tracking
- Test notification system
- Test accessibility features

### Integration Tests
- Test Socket.io integration
- Test real-time synchronization
- Test notification system
- Test screen reader compatibility

### Accessibility Tests
- Test screen reader compatibility
- Test keyboard navigation
- Test ARIA labels and roles
- Test focus management

## Future Enhancements

### Planned Features
- **Message Reactions**: Emoji reactions to messages
- **File Sharing**: Share files in chat
- **Message Threading**: Reply to specific messages
- **Voice Messages**: Send voice messages
- **Message Search**: Advanced message search
- **Activity Analytics**: Activity analytics and insights

### Extensibility
- **Plugin System**: Plugin architecture for custom features
- **Custom Notifications**: Custom notification types
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
