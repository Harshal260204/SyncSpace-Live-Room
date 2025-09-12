# Live Room Backend

A real-time collaborative workspace backend built with Express.js, Socket.io, and MongoDB. This backend powers the Live Room application, providing real-time collaboration features for code editing, note-taking, canvas drawing, and chat functionality.

## 🚀 Features

- **Real-time Collaboration**: Socket.io-powered real-time updates for all collaborative features
- **Anonymous Guest Login**: Simple username-based authentication without passwords
- **Room Management**: Create, join, and manage collaborative rooms
- **Code Collaboration**: Real-time code editing with Monaco Editor support
- **Notes Collaboration**: Collaborative note-taking with live updates
- **Canvas Drawing**: Real-time collaborative sketching and drawing
- **Chat System**: Real-time messaging with message history
- **Presence Indicators**: Live cursor tracking and user presence
- **Accessibility Support**: Full accessibility features for screen readers and assistive technologies
- **Auto Cleanup**: Automatic cleanup of inactive rooms and users
- **Security**: Helmet.js security headers, CORS protection, and rate limiting

## 🛠️ Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Real-time**: Socket.io
- **Database**: MongoDB with Mongoose ODM
- **Security**: Helmet.js, CORS, Rate Limiting
- **Validation**: Express-validator, Joi
- **Utilities**: UUID, Dotenv

## 📋 Prerequisites

- Node.js (v18 or higher)
- MongoDB Atlas account (free tier available)
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd liveroom-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```bash
cp env.example .env
```

Edit the `.env` file with your configuration:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/liveroom?retryWrites=true&w=majority

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Room Configuration
ROOM_CLEANUP_INTERVAL=300000
MAX_ROOM_SIZE=50
ROOM_IDLE_TIMEOUT=1800000
```

### 4. MongoDB Setup

1. Create a MongoDB Atlas account at [mongodb.com](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier available)
3. Create a database user with read/write permissions
4. Whitelist your IP address (or use 0.0.0.0/0 for development)
5. Get your connection string and update `MONGODB_URI` in `.env`

### 5. Run the Application

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5000` (or your specified PORT).

## 📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### Rooms
- `GET /api/rooms` - List active rooms (with pagination)
- `GET /api/rooms/:roomId` - Get room details
- `POST /api/rooms` - Create new room
- `PUT /api/rooms/:roomId` - Update room settings
- `DELETE /api/rooms/:roomId` - Deactivate room
- `GET /api/rooms/:roomId/participants` - Get room participants
- `GET /api/rooms/:roomId/chat` - Get chat history

### Users
- `POST /api/users` - Create anonymous user session
- `GET /api/users/:userId` - Get user details
- `PUT /api/users/:userId` - Update user preferences
- `DELETE /api/users/:userId` - Deactivate user session
- `GET /api/users/:userId/activity` - Get user activity stats
- `POST /api/users/:userId/update-time` - Update user time spent
- `GET /api/users/session/:sessionId` - Get user by session ID

## 🔌 Socket.io Events

### Client to Server Events

#### Room Management
- `joinRoom` - Join a collaborative room
- `leaveRoom` - Leave the current room

#### Collaboration
- `code-change` - Send code changes
- `note-change` - Send note changes
- `draw-event` - Send canvas drawing events
- `chat-message` - Send chat message
- `presence-update` - Update user presence/cursor position

#### Utility
- `ping` - Health check
- `client-error` - Report client-side errors

### Server to Client Events

#### Room Management
- `roomJoined` - Confirmation of joining room
- `userJoined` - Another user joined the room
- `userLeft` - User left the room
- `userDisconnected` - User disconnected unexpectedly

#### Collaboration
- `code-changed` - Code content updated
- `note-changed` - Notes content updated
- `drawing-updated` - Canvas drawing updated
- `chat-message` - New chat message received
- `presence-updated` - User presence updated

#### System
- `error` - Error messages
- `pong` - Response to ping
- `chatHistory` - Recent chat messages

## 🏗️ Project Structure

```
liveroom-backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── middleware/
│   └── validation.js        # Request validation middleware
├── models/
│   ├── Room.js             # Room data model
│   └── User.js             # User data model
├── routes/
│   ├── roomRoutes.js       # Room API endpoints
│   └── userRoutes.js       # User API endpoints
├── socket/
│   └── socketHandler.js    # Socket.io event handlers
├── utils/
│   └── roomCleanup.js      # Cleanup utilities
├── server.js               # Main server file
├── package.json            # Dependencies and scripts
├── env.example             # Environment variables template
└── README.md               # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `PORT` | Server port | 5000 | No |
| `NODE_ENV` | Environment mode | development | No |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 | No |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | 900000 | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 | No |
| `ROOM_CLEANUP_INTERVAL` | Cleanup interval (ms) | 300000 | No |
| `MAX_ROOM_SIZE` | Maximum room participants | 50 | No |
| `ROOM_IDLE_TIMEOUT` | Room idle timeout (ms) | 1800000 | No |

### Room Settings

Each room can be configured with the following settings:

```javascript
{
  allowAnonymous: true,        // Allow anonymous users
  allowCodeEditing: true,      // Enable code collaboration
  allowNotesEditing: true,     // Enable notes collaboration
  allowCanvasDrawing: true,    // Enable canvas drawing
  allowChat: true,             // Enable chat functionality
  isPublic: true               // Room is publicly discoverable
}
```

### User Preferences

Users can customize their experience with:

```javascript
{
  accessibility: {
    screenReader: false,       // Screen reader support
    highContrast: false,       // High contrast mode
    fontSize: 'medium',        // Font size preference
    announceChanges: true,     // Announce changes
    keyboardNavigation: true   // Keyboard navigation
  },
  appearance: {
    theme: 'auto',             // Light/dark/auto theme
    cursorColor: '#3B82F6'     // Cursor color
  },
  notifications: {
    chatMessages: true,        // Chat notifications
    userJoinLeave: true,       // User join/leave notifications
    codeChanges: false,        // Code change notifications
    systemAnnouncements: true  // System announcements
  }
}
```

## 🚀 Deployment

### Deploy to Render

1. **Create Render Account**
   - Sign up at [render.com](https://render.com)
   - Connect your GitHub repository

2. **Create Web Service**
   - Click "New" → "Web Service"
   - Connect your repository
   - Select the `liveroom-backend` folder

3. **Configure Service**
   ```yaml
   Name: liveroom-backend
   Environment: Node
   Build Command: npm install
   Start Command: npm start
   ```

4. **Environment Variables**
   Add all variables from your `.env` file in the Render dashboard:
   - `MONGODB_URI`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend-domain.com`
   - Other configuration variables

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application

### Deploy to Railway

1. **Create Railway Account**
   - Sign up at [railway.app](https://railway.app)
   - Connect your GitHub repository

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Service**
   - Select the backend folder
   - Railway will auto-detect Node.js

4. **Environment Variables**
   - Add all variables from your `.env` file
   - Set `NODE_ENV=production`

5. **Deploy**
   - Railway will automatically deploy your application

### Deploy to Heroku

1. **Create Heroku Account**
   - Sign up at [heroku.com](https://heroku.com)
   - Install Heroku CLI

2. **Create App**
   ```bash
   heroku create liveroom-backend
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI=your_mongodb_uri
   heroku config:set NODE_ENV=production
   heroku config:set FRONTEND_URL=https://your-frontend-domain.com
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual Testing

1. **Health Check**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Create User**
   ```bash
   curl -X POST http://localhost:5000/api/users \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser"}'
   ```

3. **Create Room**
   ```bash
   curl -X POST http://localhost:5000/api/rooms \
     -H "Content-Type: application/json" \
     -d '{"roomName": "Test Room"}'
   ```

## 🔍 Monitoring

### Health Check Endpoint
- `GET /health` - Returns server status, uptime, and environment info

### Logs
The application logs important events:
- Database connections
- Socket connections/disconnections
- Room join/leave events
- Error messages
- Cleanup operations

### Database Monitoring
- Automatic cleanup of inactive rooms and users
- Message history limits to prevent database bloat
- Connection pooling for optimal performance

## 🛡️ Security

### Implemented Security Measures
- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: Prevents abuse and DoS attacks
- **Input Validation**: Comprehensive request validation
- **Input Sanitization**: XSS protection
- **MongoDB Injection Protection**: Mongoose ODM protection

### Security Best Practices
- Use HTTPS in production
- Regularly update dependencies
- Monitor for suspicious activity
- Implement proper error handling
- Use environment variables for sensitive data

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check your MongoDB URI
   - Ensure your IP is whitelisted
   - Verify database user permissions

2. **CORS Errors**
   - Update `FRONTEND_URL` in environment variables
   - Check CORS configuration in `server.js`

3. **Socket Connection Issues**
   - Verify Socket.io configuration
   - Check firewall settings
   - Ensure WebSocket support

4. **Rate Limiting**
   - Adjust rate limit settings in environment variables
   - Check if you're hitting the limits

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and logging.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

## 🔄 Changelog

### v1.0.0
- Initial release
- Real-time collaboration features
- Anonymous user authentication
- Room management system
- Socket.io integration
- MongoDB data persistence
- Security middleware
- Accessibility support
- Auto cleanup system

---

**Live Room Backend** - Built with ❤️ for accessible, real-time collaboration
