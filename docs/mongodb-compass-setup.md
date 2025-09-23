# MongoDB Compass Setup Guide - SyncSpace Live Room

## Overview

This guide will walk you through setting up MongoDB Compass to manage your local MongoDB database for the SyncSpace Live Room application. MongoDB Compass is a powerful GUI tool for MongoDB that makes database management intuitive and visual.

## Prerequisites

- MongoDB Community Edition installed and running locally
- MongoDB Compass installed
- SyncSpace Live Room application set up with local MongoDB

## Step 1: Install MongoDB Compass

### 1.1 Download MongoDB Compass
1. Go to [MongoDB Compass Download](https://www.mongodb.com/products/compass)
2. Click **"Download Compass"**
3. Choose the version for your operating system
4. Download the installer

### 1.2 Install MongoDB Compass
1. Run the downloaded installer
2. Follow the installation wizard
3. Accept the license agreement
4. Choose installation location (default is recommended)
5. Complete the installation

## Step 2: Connect to Local MongoDB

### 2.1 Open MongoDB Compass
1. Launch MongoDB Compass from your applications
2. You'll see the connection screen

### 2.2 Configure Connection
1. **Connection String**: `mongodb://localhost:27017`
2. **Authentication**: Leave as "No Authentication" (for local development)
3. **SSL**: Leave unchecked (not needed for local MongoDB)
4. Click **"Connect"**

### 2.3 Verify Connection
- You should see your local MongoDB instance
- Default databases like `admin`, `config`, and `local` should be visible
- If connection fails, ensure MongoDB service is running

## Step 3: Create Database and Collections

### 3.1 Create Database
1. Click **"Create Database"** button
2. **Database Name**: `syncspace-liveroom`
3. **Collection Name**: `users` (we'll add more collections later)
4. Click **"Create Database"**

### 3.2 Create Additional Collections
Create these collections for the SyncSpace Live Room application:

1. **rooms** - Store room data and collaborative content
2. **sessions** - Store user session data (optional)

To create additional collections:
1. Select the `syncspace-liveroom` database
2. Click **"Create Collection"**
3. Enter collection name
4. Click **"Create Collection"**

## Step 4: Import Sample Data

### 4.1 Seed Database from Application
Run the seeding script from your application:

```bash
cd backend
npm run seed
```

### 4.2 Verify Data in Compass
1. Navigate to `syncspace-liveroom` database
2. Click on `users` collection
3. You should see 5 sample users
4. Click on `rooms` collection
5. You should see 8 sample rooms

## Step 5: Explore Your Data

### 5.1 View Collections
- **users**: Contains user profiles, preferences, and activity stats
- **rooms**: Contains room data, chat messages, code content, and notes

### 5.2 Sample Data Structure

#### Users Collection
```json
{
  "_id": ObjectId("..."),
  "userId": "uuid-string",
  "username": "Alice Developer",
  "sessionId": "session_...",
  "isActive": true,
  "preferences": {
    "accessibility": {
      "screenReader": false,
      "highContrast": false,
      "fontSize": "medium"
    }
  },
  "activityStats": {
    "totalRoomsJoined": 0,
    "totalMessagesSent": 0,
    "totalTimeSpent": 0
  }
}
```

#### Rooms Collection
```json
{
  "_id": ObjectId("..."),
  "roomId": "uuid-string",
  "roomName": "Development Sprint Planning",
  "description": "Planning our next development sprint",
  "createdBy": {
    "userId": "uuid-string",
    "username": "Alice Developer"
  },
  "participants": [...],
  "chatMessages": [...],
  "codeCollaboration": {
    "language": "javascript",
    "content": "// Sample code...",
    "version": 1
  },
  "notesCollaboration": {
    "content": "# Meeting Notes...",
    "version": 1
  }
}
```

## Step 6: Database Management

### 6.1 View Data
- Click on any collection to view documents
- Use the **Schema** tab to see data structure
- Use the **Indexes** tab to view database indexes

### 6.2 Query Data
- Use the **Filter** field to query documents
- Example: `{"isActive": true}` to find active users
- Example: `{"roomName": {"$regex": "Development"}}` to find rooms with "Development" in the name

### 6.3 Edit Data
- Click on any document to edit it
- Use the **JSON** view for direct editing
- Use the **Table** view for form-based editing

## Step 7: Database Operations

### 7.1 Reset Database
To clear all data and re-seed:

```bash
cd backend
npm run seed:reset
npm run seed
```

### 7.2 Backup Database
1. In Compass, go to your database
2. Click **"Export Collection"** for each collection
3. Choose JSON format
4. Save the files

### 7.3 Restore Database
1. In Compass, select your collection
2. Click **"Import Data"**
3. Choose your JSON files
4. Click **"Import"**

## Step 8: Monitoring and Performance

### 8.1 Database Statistics
- View database size and document counts
- Monitor index usage
- Check query performance

### 8.2 Real-time Monitoring
- Watch database operations in real-time
- Monitor connection status
- View query execution times

## Step 9: Advanced Features

### 9.1 Aggregation Pipeline
- Use the **Aggregation** tab to run complex queries
- Build visual aggregation pipelines
- Analyze data patterns

### 9.2 Index Management
- Create custom indexes for better performance
- Monitor index usage
- Optimize query performance

### 9.3 Validation Rules
- Set up document validation rules
- Ensure data integrity
- Prevent invalid data entry

## Step 10: Troubleshooting

### 10.1 Connection Issues
**Problem**: Cannot connect to MongoDB
**Solutions**:
- Ensure MongoDB service is running
- Check if MongoDB is listening on port 27017
- Verify connection string is correct

### 10.2 Data Not Showing
**Problem**: Collections appear empty
**Solutions**:
- Run the seeding script: `npm run seed`
- Check if you're looking at the correct database
- Verify collection names are correct

### 10.3 Performance Issues
**Problem**: Slow queries or operations
**Solutions**:
- Check if indexes are created
- Monitor query execution plans
- Consider adding indexes for frequently queried fields

## Step 11: Best Practices

### 11.1 Data Management
- Regularly backup your database
- Use proper indexing for performance
- Monitor database size and growth

### 11.2 Security
- For production, enable authentication
- Use proper user permissions
- Regular security updates

### 11.3 Development Workflow
- Use separate databases for development and production
- Document your data structures
- Version control your database schemas

## Conclusion

MongoDB Compass provides an excellent interface for managing your SyncSpace Live Room database. With this setup, you can:

- ✅ Visually explore your data
- ✅ Monitor database performance
- ✅ Manage collections and documents
- ✅ Run complex queries
- ✅ Optimize database performance

For more advanced features and troubleshooting, refer to the [MongoDB Compass Documentation](https://docs.mongodb.com/compass/).

## Quick Reference

### Connection String
```
mongodb://localhost:27017/syncspace-liveroom
```

### Common Commands
```bash
# Start MongoDB (if not running)
mongod

# Connect via command line
mongosh mongodb://localhost:27017/syncspace-liveroom

# Seed database
cd backend && npm run seed

# Reset database
cd backend && npm run seed:reset
```

### Useful Compass Features
- **Schema Analysis**: Understand your data structure
- **Index Management**: Optimize query performance
- **Real-time Monitoring**: Watch database operations
- **Aggregation Builder**: Create complex queries visually
- **Document Editor**: Edit data with a user-friendly interface
