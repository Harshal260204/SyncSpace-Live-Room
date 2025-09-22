# Setup Guide for Code Improvements

This guide will help you set up the new dependencies and configurations for the improved SyncSpace Live Room codebase.

## Backend Setup

### 1. Install New Dependencies

```bash
cd backend
npm install winston isomorphic-dompurify
```

### 2. Create Logs Directory

```bash
mkdir -p logs
```

### 3. Update Environment Variables

Add these new environment variables to your `.env` file:

```env
# Logging
LOG_LEVEL=info
LOG_FILE_MAX_SIZE=5242880
LOG_FILE_MAX_FILES=5

# Security
SESSION_SECRET=your-super-secret-session-key-change-in-production
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
CACHE_TTL=300

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_ANONYMOUS_USERS=true
ENABLE_FILE_UPLOADS=false
ENABLE_ANALYTICS=false

# Monitoring
ENABLE_HEALTH_CHECKS=true
ENABLE_METRICS=false
METRICS_PORT=9090

# Cleanup Intervals
ROOM_CLEANUP_INTERVAL=300000
USER_CLEANUP_INTERVAL=300000
```

### 4. Update Database Configuration

The new configuration system will automatically handle database options. No changes needed to your existing MongoDB connection string.

### 5. Test the Backend

```bash
npm run dev
```

Check the logs to ensure everything is working correctly.

## Frontend Setup

### 1. Install New Dependencies

```bash
cd frontend
npm install react-hot-toast
```

### 2. Update Environment Variables

Add these to your `.env` file:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SERVER_URL=http://localhost:5000
```

### 3. Update Your Components

#### Example: Using the new API hooks

```javascript
// Before
import { useState, useEffect } from 'react';

function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

```javascript
// After
import { useGet } from '../hooks/useApi';
import { useErrorHandler } from '../utils/errorHandler';

function UserList() {
  const { data: users, loading, error } = useGet('/users', {
    cache: true,
    staleTime: 5 * 60 * 1000
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

#### Example: Using error boundaries

```javascript
import { withErrorHandling } from '../utils/errorHandler';

const SafeUserList = withErrorHandling(UserList);

function App() {
  return (
    <div>
      <SafeUserList />
    </div>
  );
}
```

### 4. Update Socket Context

The socket context has been enhanced with better error handling. No changes needed to existing usage.

### 5. Test the Frontend

```bash
npm start
```

## Verification Steps

### 1. Backend Verification

1. Start the backend server
2. Check that logs are being created in the `logs/` directory
3. Test the health endpoint: `GET http://localhost:5000/health`
4. Verify error handling by making invalid requests

### 2. Frontend Verification

1. Start the frontend application
2. Check browser console for any errors
3. Test error handling by disconnecting from the backend
4. Verify that toast notifications appear for errors

### 3. Integration Testing

1. Create a room and join it
2. Test real-time features (chat, code editing, etc.)
3. Verify error handling in socket connections
4. Test file uploads (if enabled)

## Troubleshooting

### Common Issues

1. **Logs directory not found**
   - Create the `logs` directory manually
   - Ensure the application has write permissions

2. **Environment variables not loading**
   - Check that your `.env` file is in the correct location
   - Restart the development server after adding new variables

3. **Dependencies not installing**
   - Clear npm cache: `npm cache clean --force`
   - Delete `node_modules` and `package-lock.json`, then reinstall

4. **Socket connection issues**
   - Check that the backend is running
   - Verify the `REACT_APP_SERVER_URL` environment variable

### Getting Help

If you encounter issues:

1. Check the logs in the `logs/` directory
2. Review the browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed

## Next Steps

After successful setup:

1. Review the `CODE_IMPROVEMENTS.md` documentation
2. Explore the new service layer architecture
3. Test the error handling and logging systems
4. Consider adding unit tests for the new components
5. Set up monitoring and alerting for production

## Production Deployment

For production deployment:

1. Update environment variables for production
2. Set up log rotation and monitoring
3. Configure error tracking services
4. Set up health checks and monitoring
5. Review security settings and secrets management

The improved codebase is now ready for production deployment with enhanced reliability, security, and maintainability.
