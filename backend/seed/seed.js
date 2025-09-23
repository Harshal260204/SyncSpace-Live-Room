/**
 * Database Seeder
 * 
 * Seeds the database with sample data for development and testing
 * Supports both one-time seeding and development auto-seeding
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Room = require('../models/Room');
const users = require('./data/users.json');
const rooms = require('./data/rooms.json');

/**
 * Generate a unique session ID for users
 */
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Seed users into the database
 */
const seedUsers = async () => {
  console.log('🌱 Seeding users...');
  
  const seededUsers = [];
  
  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ userId: userData.userId });
      
      if (existingUser) {
        console.log(`   ⚠️  User ${userData.username} already exists, skipping...`);
        seededUsers.push(existingUser);
        continue;
      }
      
      // Create new user with session ID
      const user = new User({
        ...userData,
        sessionId: generateSessionId(),
        isActive: true,
        lastSeen: new Date(),
      });
      
      await user.save();
      seededUsers.push(user);
      console.log(`   ✅ Created user: ${userData.username}`);
      
    } catch (error) {
      console.error(`   ❌ Error creating user ${userData.username}:`, error.message);
    }
  }
  
  return seededUsers;
};

/**
 * Seed rooms into the database
 */
const seedRooms = async (seededUsers) => {
  console.log('🌱 Seeding rooms...');
  
  const seededRooms = [];
  
  for (const roomData of rooms) {
    try {
      // Check if room already exists
      const existingRoom = await Room.findOne({ roomId: roomData.roomId });
      
      if (existingRoom) {
        console.log(`   ⚠️  Room ${roomData.roomName} already exists, skipping...`);
        seededRooms.push(existingRoom);
        continue;
      }
      
      // Find the creator user
      const creatorUser = seededUsers.find(u => u.userId === roomData.createdBy.userId);
      if (!creatorUser) {
        console.log(`   ⚠️  Creator user not found for room ${roomData.roomName}, skipping...`);
        continue;
      }
      
      // Create new room
      const room = new Room({
        ...roomData,
        createdBy: {
          userId: creatorUser.userId,
          username: creatorUser.username,
        },
        isActive: true,
        lastActivity: new Date(),
        codeCollaboration: {
          language: 'javascript',
          content: '',
          lastModified: new Date(),
          lastModifiedBy: {
            userId: creatorUser.userId,
            username: creatorUser.username,
          },
          version: 1,
        },
        notesCollaboration: {
          content: '',
          lastModified: new Date(),
          lastModifiedBy: {
            userId: creatorUser.userId,
            username: creatorUser.username,
          },
          version: 1,
        },
        canvasDrawing: {
          drawingData: {},
          lastModified: new Date(),
          lastModifiedBy: {
            userId: creatorUser.userId,
            username: creatorUser.username,
          },
          version: 1,
        },
      });
      
      await room.save();
      seededRooms.push(room);
      console.log(`   ✅ Created room: ${roomData.roomName}`);
      
    } catch (error) {
      console.error(`   ❌ Error creating room ${roomData.roomName}:`, error.message);
    }
  }
  
  return seededRooms;
};

/**
 * Add sample chat messages to rooms
 */
const seedChatMessages = async (seededRooms, seededUsers) => {
  console.log('🌱 Adding sample chat messages...');
  
  for (const room of seededRooms) {
    try {
      // Add some sample chat messages
      const sampleMessages = [
        {
          id: require('uuid').v4(),
          userId: room.createdBy.userId,
          username: room.createdBy.username,
          message: `Welcome to ${room.roomName}! Let's start collaborating.`,
          messageType: 'system',
          timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        },
        {
          id: require('uuid').v4(),
          userId: room.createdBy.userId,
          username: room.createdBy.username,
          message: 'Feel free to use the code editor, notes, or canvas to work together!',
          messageType: 'text',
          timestamp: new Date(Date.now() - 1000 * 60 * 3), // 3 minutes ago
        }
      ];
      
      for (const message of sampleMessages) {
        await room.addChatMessage(message);
      }
      
      console.log(`   ✅ Added chat messages to ${room.roomName}`);
      
    } catch (error) {
      console.error(`   ❌ Error adding chat messages to ${room.roomName}:`, error.message);
    }
  }
};

/**
 * Add sample code content to rooms
 */
const seedCodeContent = async (seededRooms, seededUsers) => {
  console.log('🌱 Adding sample code content...');
  
  const codeSamples = [
    {
      language: 'javascript',
      content: `// Welcome to the collaborative code editor!
function greetUser(username) {
  return \`Hello, \${username}! Welcome to our collaborative workspace.\`;
}

// This is a sample JavaScript function
const calculateSum = (a, b) => {
  return a + b;
};

// Try editing this code with your team!
console.log(greetUser('Developer'));`
    },
    {
      language: 'python',
      content: `# Python collaborative coding example
def fibonacci(n):
    """Calculate the nth Fibonacci number"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Example usage
for i in range(10):
    print(f"Fibonacci({i}) = {fibonacci(i)}")`
    }
  ];
  
  for (let i = 0; i < seededRooms.length && i < codeSamples.length; i++) {
    const room = seededRooms[i];
    const codeSample = codeSamples[i];
    
    try {
      // Ensure codeCollaboration exists
      if (!room.codeCollaboration) {
        room.codeCollaboration = {
          language: 'javascript',
          content: '',
          lastModified: new Date(),
          lastModifiedBy: { userId: '', username: '' },
          version: 1,
        };
        await room.save();
      }
      
      await room.updateCodeContent({
        content: codeSample.content,
        language: codeSample.language,
        userId: room.createdBy.userId,
        username: room.createdBy.username,
      });
      
      console.log(`   ✅ Added ${codeSample.language} code to ${room.roomName}`);
      
    } catch (error) {
      console.error(`   ❌ Error adding code to ${room.roomName}:`, error.message);
    }
  }
};

/**
 * Add sample notes content to rooms
 */
const seedNotesContent = async (seededRooms, seededUsers) => {
  console.log('🌱 Adding sample notes content...');
  
  const notesSamples = [
    `# Meeting Notes - Project Planning

## Agenda
- [ ] Review project requirements
- [ ] Assign team roles
- [ ] Set up development timeline
- [ ] Discuss technical architecture

## Key Decisions
- Using React for frontend
- Node.js with Express for backend
- MongoDB for database
- Socket.io for real-time features

## Action Items
- [ ] Set up development environment
- [ ] Create project repository
- [ ] Schedule weekly standups`,
    
    `# Design Sprint - Day 1

## User Research
- Conducted 5 user interviews
- Identified key pain points
- Created user personas

## Ideation
- Brainstormed 20+ solutions
- Prioritized by impact and feasibility
- Selected top 3 concepts for prototyping

## Next Steps
- Create low-fidelity prototypes
- Plan user testing sessions
- Prepare presentation for stakeholders`
  ];
  
  for (let i = 0; i < seededRooms.length && i < notesSamples.length; i++) {
    const room = seededRooms[i];
    const notesContent = notesSamples[i];
    
    try {
      // Ensure notesCollaboration exists
      if (!room.notesCollaboration) {
        room.notesCollaboration = {
          content: '',
          lastModified: new Date(),
          lastModifiedBy: { userId: '', username: '' },
          version: 1,
        };
        await room.save();
      }
      
      await room.updateNotesContent({
        content: notesContent,
        userId: room.createdBy.userId,
        username: room.createdBy.username,
      });
      
      console.log(`   ✅ Added notes content to ${room.roomName}`);
      
    } catch (error) {
      console.error(`   ❌ Error adding notes to ${room.roomName}:`, error.message);
    }
  }
};

/**
 * Main seeding function
 */
const seedDatabase = async () => {
  try {
    console.log('🚀 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Seed users
    const seededUsers = await seedUsers();
    
    // Seed rooms
    const seededRooms = await seedRooms(seededUsers);
    
    // Add sample content
    await seedChatMessages(seededRooms, seededUsers);
    await seedCodeContent(seededRooms, seededUsers);
    await seedNotesContent(seededRooms, seededUsers);
    
    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Seeded ${seededUsers.length} users and ${seededRooms.length} rooms`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

/**
 * Check if database is empty (for development auto-seeding)
 */
const isDatabaseEmpty = async () => {
  const userCount = await User.countDocuments();
  const roomCount = await Room.countDocuments();
  return userCount === 0 && roomCount === 0;
};

/**
 * Development auto-seeding (only if database is empty)
 */
const seedIfEmpty = async () => {
  try {
    await connectDB();
    
    if (await isDatabaseEmpty()) {
      console.log('🔍 Database is empty, starting auto-seeding...');
      await seedDatabase();
    } else {
      console.log('📊 Database already contains data, skipping auto-seeding');
    }
  } catch (error) {
    console.error('❌ Auto-seeding failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Export functions for use in other scripts
module.exports = {
  seedDatabase,
  seedIfEmpty,
  isDatabaseEmpty,
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
}
