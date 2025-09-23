# Database Seeding Guide

This guide explains how to seed the SyncSpace Live Room database with sample data for development, testing, and demonstration purposes.

## Overview

The seeding system provides:
- **Sample Users**: 5 diverse users with different accessibility preferences and activity patterns
- **Sample Rooms**: 8 collaborative rooms with various settings and purposes
- **Sample Content**: Chat messages, code snippets, and notes for realistic testing
- **Development Auto-Seeding**: Automatic seeding in development mode when database is empty

## Quick Start

### Basic Seeding
```bash
# Navigate to backend directory
cd backend

# Seed the database with sample data
npm run seed
```

### Reset and Re-seed
```bash
# Clear all data and re-seed
npm run seed:reset-reseed
```

### Development Auto-Seeding
```bash
# Check if database is empty and seed if needed
npm run seed:dev
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `seed` | `npm run seed` | Seeds database with sample data (idempotent) |
| `seed:reset` | `npm run seed:reset` | Clears all data from database |
| `seed:reset-reseed` | `npm run seed:reset-reseed` | Clears data and re-seeds |
| `seed:dev` | `npm run seed:dev` | Auto-seeds if database is empty (dev only) |

## Sample Data

### Users (5 total)

1. **Alice Developer** - Full-stack developer with standard preferences
2. **Bob Designer** - UI/UX designer with high contrast and dark theme
3. **Charlie UX** - UX researcher with screen reader support
4. **Diana PM** - Product manager with comprehensive notifications
5. **Eve Tester** - QA tester with minimal notifications

Each user includes:
- Unique user ID and username
- Accessibility preferences (screen reader, high contrast, font size)
- Appearance settings (theme, cursor color)
- Notification preferences
- Activity statistics (rooms joined, messages sent, time spent)

### Rooms (8 total)

1. **Development Sprint Planning** - Team planning session
2. **Design Review Session** - UI/UX review meeting
3. **UX Research Workshop** - User research analysis
4. **Product Strategy Meeting** - Quarterly planning
5. **QA Testing Session** - Quality assurance testing
6. **Code Review Session** - Collaborative code review
7. **Creative Brainstorming** - Open ideation session
8. **New Team Member Onboarding** - Welcome session

Each room includes:
- Room name and description
- Creator information
- Participant limits
- Feature settings (code editing, notes, canvas, chat)
- Privacy settings (public/private, anonymous access)

### Sample Content

- **Chat Messages**: Welcome messages and collaboration prompts
- **Code Content**: JavaScript and Python examples
- **Notes Content**: Meeting notes and design sprint documentation

## File Structure

```
backend/
├── seed/
│   ├── seed.js              # Main seeding script
│   ├── reset.js             # Database reset script
│   ├── dev-seed.js          # Development auto-seeding
│   └── data/
│       ├── users.json       # Sample user data
│       └── rooms.json       # Sample room data
```

## Development Workflow

### Auto-Seeding in Development

To enable automatic seeding when the database is empty in development:

1. **Modify server startup** (optional):
```javascript
// In backend/server.js, add after database connection
if (process.env.NODE_ENV === 'development') {
  const runDevSeeding = require('./seed/dev-seed');
  runDevSeeding();
}
```

2. **Or run manually**:
```bash
npm run seed:dev
```

### Customizing Sample Data

#### Adding New Users

Edit `backend/seed/data/users.json`:

```json
{
  "userId": "user-custom-id",
  "username": "Custom User",
  "preferences": {
    "accessibility": {
      "screenReader": false,
      "highContrast": false,
      "fontSize": "medium",
      "announceChanges": true,
      "keyboardNavigation": true
    },
    "appearance": {
      "theme": "light",
      "cursorColor": "#3B82F6"
    },
    "notifications": {
      "chatMessages": true,
      "userJoinLeave": true,
      "codeChanges": false,
      "systemAnnouncements": true
    }
  },
  "activityStats": {
    "totalRoomsJoined": 0,
    "totalMessagesSent": 0,
    "totalTimeSpent": 0,
    "lastRoomJoined": null
  }
}
```

#### Adding New Rooms

Edit `backend/seed/data/rooms.json`:

```json
{
  "roomId": "room-custom-id",
  "roomName": "Custom Room",
  "description": "Description of the room purpose",
  "createdBy": {
    "userId": "user-alice-dev",
    "username": "Alice Developer"
  },
  "maxParticipants": 10,
  "settings": {
    "allowAnonymous": true,
    "allowCodeEditing": true,
    "allowNotesEditing": true,
    "allowCanvasDrawing": true,
    "allowChat": true,
    "isPublic": true
  }
}
```

## Production Considerations

### Security
- **Never run seeding in production** - The auto-seeding is disabled in production mode
- **Use environment variables** - Ensure `NODE_ENV=production` is set
- **Database permissions** - Ensure seeding scripts have appropriate database permissions

### Data Management
- **Backup before seeding** - Always backup production data before any operations
- **Idempotent operations** - The seeding script checks for existing data before creating new records
- **Cleanup scripts** - Use reset scripts carefully in production environments

## Troubleshooting

### Common Issues

#### Database Connection Failed
```
❌ Database connection failed: MongoNetworkError
```
**Solution**: Check your MongoDB connection string in `.env` file

#### User Already Exists
```
⚠️  User Alice Developer already exists, skipping...
```
**Solution**: This is normal behavior - the script skips existing users

#### Room Creation Failed
```
❌ Error creating room Development Sprint Planning: ValidationError
```
**Solution**: Check room data format and required fields

### Debug Mode

Run seeding with detailed logging:

```bash
# Enable debug logging
DEBUG=* npm run seed

# Or with specific debug scope
DEBUG=seed:* npm run seed
```

### Manual Database Inspection

Connect to your MongoDB instance and inspect the data:

```javascript
// In MongoDB shell or MongoDB Compass
use your_database_name

// Check users
db.users.find().pretty()

// Check rooms
db.rooms.find().pretty()

// Count documents
db.users.countDocuments()
db.rooms.countDocuments()
```

## Advanced Usage

### Custom Seeding Scripts

Create custom seeding scripts for specific scenarios:

```javascript
// backend/seed/custom-seed.js
const { seedDatabase } = require('./seed');
const customData = require('./data/custom-data.json');

const customSeed = async () => {
  // Custom seeding logic
  console.log('🌱 Running custom seeding...');
  
  // Your custom seeding code here
  
  console.log('✅ Custom seeding completed!');
};

if (require.main === module) {
  customSeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Custom seeding failed:', error);
      process.exit(1);
    });
}

module.exports = customSeed;
```

### Integration with CI/CD

For automated testing environments:

```yaml
# .github/workflows/test.yml
- name: Seed test database
  run: |
    cd backend
    npm run seed:reset-reseed
```

### Performance Considerations

- **Batch operations**: The seeding script processes data in batches for better performance
- **Index optimization**: Ensure database indexes are created before seeding
- **Memory usage**: Large datasets may require streaming or pagination

## Best Practices

1. **Always backup** before running reset operations
2. **Use idempotent operations** to avoid duplicate data
3. **Test seeding scripts** in development before production
4. **Document custom data** for team collaboration
5. **Version control** your sample data files
6. **Monitor performance** with large datasets

## Support

For issues with the seeding system:

1. Check the troubleshooting section above
2. Review the console output for specific error messages
3. Verify your database connection and permissions
4. Ensure all required dependencies are installed
5. Check the sample data format matches the model schemas

## Contributing

When adding new sample data:

1. Follow the existing data structure patterns
2. Include diverse accessibility preferences
3. Add realistic activity statistics
4. Test the seeding process thoroughly
5. Update this documentation accordingly
