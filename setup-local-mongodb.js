#!/usr/bin/env node

/**
 * Local MongoDB Setup Script for SyncSpace Live Room
 * 
 * This script helps set up the local MongoDB environment
 * and verifies the connection is working properly.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.blue}🚀 ${msg}${colors.reset}`)
};

async function checkMongoDBConnection() {
  log.header('Testing MongoDB Connection...');
  
  try {
    const uri = 'mongodb://localhost:27017/syncspace-liveroom';
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    log.success('Connected to local MongoDB successfully!');
    
    // Test basic operations
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    log.info(`Found ${collections.length} collections in database`);
    
    if (collections.length > 0) {
      log.info('Collections: ' + collections.map(c => c.name).join(', '));
    }
    
    await mongoose.disconnect();
    return true;
    
  } catch (error) {
    log.error(`Failed to connect to MongoDB: ${error.message}`);
    log.warning('Make sure MongoDB is running locally');
    log.info('Start MongoDB with: mongod');
    return false;
  }
}

async function checkEnvironmentFile() {
  log.header('Checking Environment Configuration...');
  
  const envPath = path.join(__dirname, 'backend', '.env');
  const envExamplePath = path.join(__dirname, 'backend', 'env.example');
  
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      log.warning('.env file not found, copying from env.example...');
      fs.copyFileSync(envExamplePath, envPath);
      log.success('Created .env file from env.example');
    } else {
      log.error('No .env file found and no env.example to copy from');
      return false;
    }
  } else {
    log.success('.env file exists');
  }
  
  // Check if MONGODB_URI is set to local
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('mongodb://localhost:27017')) {
    log.success('MONGODB_URI is configured for local MongoDB');
  } else if (envContent.includes('mongodb+srv://')) {
    log.warning('MONGODB_URI appears to be configured for MongoDB Atlas');
    log.info('Consider updating to local MongoDB: mongodb://localhost:27017/syncspace-liveroom');
  } else {
    log.warning('MONGODB_URI not found in .env file');
  }
  
  return true;
}

async function checkDependencies() {
  log.header('Checking Dependencies...');
  
  const packageJsonPath = path.join(__dirname, 'backend', 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    log.error('package.json not found in backend directory');
    return false;
  }
  
  log.success('package.json found');
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, 'backend', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log.warning('node_modules not found, run: cd backend && npm install');
    return false;
  }
  
  log.success('Dependencies appear to be installed');
  return true;
}

async function runSeeding() {
  log.header('Running Database Seeding...');
  
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    log.info('Seeding database with sample data...');
    const { stdout, stderr } = await execAsync('cd backend && npm run seed');
    
    if (stderr && !stderr.includes('Warning')) {
      log.error(`Seeding failed: ${stderr}`);
      return false;
    }
    
    log.success('Database seeded successfully!');
    log.info('Sample data includes:');
    log.info('- 5 users with accessibility preferences');
    log.info('- 8 collaborative rooms');
    log.info('- Sample chat messages, code, and notes');
    
    return true;
    
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.bold}${colors.blue}
╔══════════════════════════════════════════════════════════════╗
║                SyncSpace Live Room Setup                    ║
║              Local MongoDB Configuration                    ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  let allChecksPassed = true;
  
  // Check dependencies
  const depsOk = await checkDependencies();
  if (!depsOk) allChecksPassed = false;
  
  // Check environment
  const envOk = await checkEnvironmentFile();
  if (!envOk) allChecksPassed = false;
  
  // Check MongoDB connection
  const mongoOk = await checkMongoDBConnection();
  if (!mongoOk) allChecksPassed = false;
  
  if (allChecksPassed) {
    log.success('All checks passed!');
    
    // Ask if user wants to run seeding
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise((resolve) => {
      rl.question('Would you like to seed the database with sample data? (y/n): ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const seedingOk = await runSeeding();
      if (seedingOk) {
        log.success('Setup completed successfully!');
        log.info('You can now start the application with: npm run dev');
        log.info('Access MongoDB Compass at: mongodb://localhost:27017');
      }
    } else {
      log.info('Skipping database seeding');
      log.info('Run "cd backend && npm run seed" to seed the database later');
    }
    
  } else {
    log.error('Some checks failed. Please fix the issues above and run the script again.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  log.error(`Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  log.error(`Setup failed: ${error.message}`);
  process.exit(1);
});
