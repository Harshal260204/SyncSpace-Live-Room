# SyncSpace Live Room - Setup Guide

This guide will help you set up and run the SyncSpace Live Room application with all the fixes applied.

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

## Environment Configuration

### 1. Backend Environment (.env)

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/syncspace-liveroom

# Server Configuration
PORT=5000
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Room Cleanup
ROOM_CLEANUP_INTERVAL=300000

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

### 2. Frontend Environment (.env)

Create a `.env` file in the `frontend/` directory:

```env
# Backend Server URL
REACT_APP_SERVER_URL=http://localhost:5000
```

## Installation & Setup

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use the MONGODB_URI in your .env file

#### Option B: MongoDB Atlas
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Update MONGODB_URI in your .env file

### 3. Start the Application

#### Terminal 1 - Backend Server
```bash
cd backend
npm start
```

#### Terminal 2 - Frontend Development Server
```bash
cd frontend
npm start
```

## Key Fixes Applied

### 1. ✅ Fixed Room Creation Flow
- **Before**: Room creation happened in socket handlers (wrong place)
- **After**: Room creation now uses proper API calls (`POST /api/rooms`)
- **Impact**: Rooms are now properly created in the database before users join

### 2. ✅ Fixed Frontend-Backend Integration
- **Before**: Frontend generated room IDs and navigated without API calls
- **After**: Frontend calls API to create room, gets proper room data back
- **Impact**: Consistent room management and proper error handling

### 3. ✅ Fixed Socket Connection Logic
- **Before**: Socket handler tried to create rooms on join
- **After**: Socket handler only handles joining existing rooms
- **Impact**: Clean separation of concerns, proper room lifecycle

### 4. ✅ Added Comprehensive Error Handling
- **Before**: Generic error messages, poor error handling
- **After**: Specific error types, detailed error messages, proper HTTP status codes
- **Impact**: Better debugging and user experience

### 5. ✅ Standardized Room ID Generation
- **Before**: Frontend generated random IDs, backend used UUIDs
- **After**: Backend generates UUIDs for all rooms
- **Impact**: Consistent, collision-free room IDs

### 6. ✅ Added Environment Configuration
- **Before**: Missing environment files, hardcoded URLs
- **After**: Proper .env files with all required variables
- **Impact**: Easy configuration and deployment

## API Endpoints

### Room Management
- `POST /api/rooms` - Create a new room
- `GET /api/rooms` - Get list of rooms
- `GET /api/rooms/:roomId` - Get specific room
- `PUT /api/rooms/:roomId` - Update room settings
- `DELETE /api/rooms/:roomId` - Delete room

### User Management
- `POST /api/users` - Create a new user
- `GET /api/users/:userId` - Get user details
- `PUT /api/users/:userId` - Update user preferences

### Health Check
- `GET /health` - Server health status

## Socket Events

### Client to Server
- `joinRoom` - Join an existing room
- `leaveRoom` - Leave current room
- `code-change` - Send code changes
- `note-change` - Send note changes
- `draw-event` - Send drawing events
- `chat-message` - Send chat messages
- `presence-update` - Update user presence

### Server to Client
- `roomJoined` - Confirmation of room join
- `userJoined` - Another user joined
- `userLeft` - User left the room
- `code-changed` - Code was updated
- `note-changed` - Notes were updated
- `drawing-updated` - Drawing was updated
- `chat-message` - New chat message
- `error` - Error occurred

## Testing the Application

### 1. Create a Room
1. Open http://localhost:3000
2. Enter a username
3. Click "Create Room"
4. Fill in room details
5. Click "Create Room"
6. You should be redirected to the room workspace

### 2. Join a Room
1. Open another browser/tab
2. Enter the same username or different username
3. Click "Join Room"
4. Enter the room ID from the first tab
5. You should join the same room

### 3. Test Real-time Features
1. Type in the code editor - changes should sync
2. Type in the notes editor - changes should sync
3. Draw on the canvas - drawings should sync
4. Send chat messages - messages should appear for all users

## Troubleshooting

### Common Issues

1. **"Failed to connect to server"**
   - Check if backend is running on port 5000
   - Verify REACT_APP_SERVER_URL is correct

2. **"Database connection failed"**
   - Check if MongoDB is running
   - Verify MONGODB_URI is correct

3. **"Room not found"**
   - Ensure room was created via API first
   - Check if room ID is correct

4. **CORS errors**
   - Verify FRONTEND_URL in backend .env
   - Check if ports match

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will show detailed error messages and stack traces.

## Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com
```

### Security Considerations

1. Use strong MongoDB credentials
2. Enable CORS for specific domains only
3. Set up rate limiting
4. Use HTTPS in production
5. Validate all inputs

## Support

If you encounter issues:

1. Check the console logs for error messages
2. Verify all environment variables are set
3. Ensure MongoDB is accessible
4. Check network connectivity between frontend and backend

The application should now work properly with room creation, real-time collaboration, and proper error handling!
