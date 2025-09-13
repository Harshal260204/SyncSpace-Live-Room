#!/bin/bash

# SyncSpace Live Room - Backend Deployment Script for Render
# This script automates the deployment process for Render.com

set -e  # Exit on any error

echo "🚀 Starting SyncSpace Live Room Backend Deployment on Render..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "git is not installed. Please install git first."
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Validate environment variables
validate_env() {
    print_status "Validating environment variables..."
    
    if [ -z "$MONGO_URI" ]; then
        print_error "MONGO_URI environment variable is required"
        print_status "Please set your MongoDB Atlas connection string:"
        print_status "export MONGO_URI='mongodb+srv://username:password@cluster.mongodb.net/liveroom?retryWrites=true&w=majority'"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        print_error "JWT_SECRET environment variable is required"
        print_status "Please set a secure JWT secret:"
        print_status "export JWT_SECRET='your-super-secure-jwt-secret-key'"
        exit 1
    fi
    
    if [ -z "$CLIENT_URL" ]; then
        print_warning "CLIENT_URL not set, using default: https://syncspace-liveroom.vercel.app"
        export CLIENT_URL="https://syncspace-liveroom.vercel.app"
    fi
    
    if [ -z "$PORT" ]; then
        print_warning "PORT not set, using default: 5000"
        export PORT=5000
    fi
    
    if [ -z "$JWT_LIFETIME" ]; then
        print_warning "JWT_LIFETIME not set, using default: 7d"
        export JWT_LIFETIME="7d"
    fi
    
    print_success "Environment variables validated"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci --production
    else
        npm install --production
    fi
    
    print_success "Dependencies installed"
}

# Run security audit
security_audit() {
    print_status "Running security audit..."
    
    if npm audit --audit-level=moderate; then
        print_success "Security audit passed"
    else
        print_warning "Security audit found issues. Please review and fix them."
        print_status "To fix automatically: npm audit fix"
    fi
}

# Build the application
build_app() {
    print_status "Building application..."
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p uploads
    
    # Set proper permissions
    chmod 755 logs
    chmod 755 uploads
    
    print_success "Application built successfully"
}

# Test the application
test_app() {
    print_status "Testing application..."
    
    # Start the application in background
    npm start &
    APP_PID=$!
    
    # Wait for the application to start
    sleep 5
    
    # Test health endpoint
    if curl -f http://localhost:$PORT/health > /dev/null 2>&1; then
        print_success "Application is running and healthy"
    else
        print_error "Application health check failed"
        kill $APP_PID 2>/dev/null || true
        exit 1
    fi
    
    # Stop the application
    kill $APP_PID 2>/dev/null || true
    
    print_success "Application tests passed"
}

# Create production environment file
create_prod_env() {
    print_status "Creating production environment file..."
    
    cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
PORT=$PORT
MONGO_URI=$MONGO_URI
CLIENT_URL=$CLIENT_URL
JWT_SECRET=$JWT_SECRET
JWT_LIFETIME=$JWT_LIFETIME

# Security
CORS_ORIGIN=$CLIENT_URL
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Socket.io
SOCKET_CORS_ORIGIN=$CLIENT_URL
SOCKET_TRANSPORTS=websocket,polling

# MongoDB
MONGO_OPTIONS=retryWrites=true&w=majority&maxPoolSize=10&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000
EOF
    
    print_success "Production environment file created"
}

# Create Render configuration
create_render_config() {
    print_status "Creating Render configuration..."
    
    cat > render.yaml << EOF
services:
  - type: web
    name: syncspace-liveroom-backend
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: MONGO_URI
        sync: false
      - key: CLIENT_URL
        value: https://syncspace-liveroom.vercel.app
      - key: JWT_SECRET
        sync: false
      - key: JWT_LIFETIME
        value: 7d
      - key: CORS_ORIGIN
        value: https://syncspace-liveroom.vercel.app
      - key: RATE_LIMIT_WINDOW_MS
        value: 900000
      - key: RATE_LIMIT_MAX_REQUESTS
        value: 100
      - key: LOG_LEVEL
        value: info
      - key: SOCKET_CORS_ORIGIN
        value: https://syncspace-liveroom.vercel.app
      - key: SOCKET_TRANSPORTS
        value: websocket,polling
      - key: MONGO_OPTIONS
        value: retryWrites=true&w=majority&maxPoolSize=10&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000
    healthCheckPath: /health
    autoDeploy: true
    branch: main
    rootDir: liveroom-backend
EOF
    
    print_success "Render configuration created"
}

# Create Docker configuration
create_docker_config() {
    print_status "Creating Docker configuration..."
    
    cat > Dockerfile << EOF
# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads && chown -R nodejs:nodejs logs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "start"]
EOF
    
    cat > .dockerignore << EOF
node_modules
npm-debug.log
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
logs
*.log
.git
.gitignore
README.md
Dockerfile
.dockerignore
EOF
    
    print_success "Docker configuration created"
}

# Create deployment documentation
create_deployment_docs() {
    print_status "Creating deployment documentation..."
    
    cat > DEPLOYMENT.md << EOF
# SyncSpace Live Room - Backend Deployment Guide

## Render.com Deployment

### Prerequisites
1. MongoDB Atlas account with free tier cluster
2. Render.com account
3. Git repository with your code

### Step 1: MongoDB Atlas Setup
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account
3. Create a new cluster (free tier)
4. Create a database user
5. Whitelist your IP address (0.0.0.0/0 for Render)
6. Get your connection string

### Step 2: Render.com Setup
1. Go to [Render.com](https://render.com)
2. Connect your GitHub repository
3. Create a new Web Service
4. Configure the following settings:
   - **Name**: syncspace-liveroom-backend
   - **Environment**: Node
   - **Build Command**: npm install && npm run build
   - **Start Command**: npm start
   - **Plan**: Free

### Step 3: Environment Variables
Set the following environment variables in Render dashboard:

\`\`\`
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/liveroom?retryWrites=true&w=majority
CLIENT_URL=https://your-frontend-domain.vercel.app
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_LIFETIME=7d
CORS_ORIGIN=https://your-frontend-domain.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
SOCKET_CORS_ORIGIN=https://your-frontend-domain.vercel.app
SOCKET_TRANSPORTS=websocket,polling
MONGO_OPTIONS=retryWrites=true&w=majority&maxPoolSize=10&serverSelectionTimeoutMS=5000&socketTimeoutMS=45000
\`\`\`

### Step 4: Deploy
1. Click "Deploy" in Render dashboard
2. Wait for deployment to complete
3. Your backend will be available at: https://your-app-name.onrender.com

### Step 5: Test Deployment
Test your deployment by visiting:
- Health check: https://your-app-name.onrender.com/health
- API docs: https://your-app-name.onrender.com/api-docs

## Docker Deployment

### Build Docker Image
\`\`\`bash
docker build -t syncspace-liveroom-backend .
\`\`\`

### Run Docker Container
\`\`\`bash
docker run -d \\
  --name syncspace-backend \\
  -p 5000:5000 \\
  -e MONGO_URI="your-mongodb-uri" \\
  -e JWT_SECRET="your-jwt-secret" \\
  -e CLIENT_URL="https://your-frontend-domain.vercel.app" \\
  syncspace-liveroom-backend
\`\`\`

## Troubleshooting

### Common Issues
1. **MongoDB Connection Failed**: Check your connection string and IP whitelist
2. **CORS Errors**: Verify CLIENT_URL matches your frontend domain
3. **JWT Errors**: Ensure JWT_SECRET is set and secure
4. **Port Issues**: Check if PORT environment variable is set

### Logs
View logs in Render dashboard or use:
\`\`\`bash
docker logs syncspace-backend
\`\`\`

### Health Check
\`\`\`bash
curl https://your-app-name.onrender.com/health
\`\`\`

## Security Notes
- Never commit .env files to version control
- Use strong, unique JWT secrets
- Regularly update dependencies
- Monitor logs for suspicious activity
- Use HTTPS in production
EOF
    
    print_success "Deployment documentation created"
}

# Main deployment function
main() {
    print_status "Starting SyncSpace Live Room Backend Deployment..."
    
    check_dependencies
    validate_env
    install_dependencies
    security_audit
    build_app
    test_app
    create_prod_env
    create_render_config
    create_docker_config
    create_deployment_docs
    
    print_success "Backend deployment preparation completed!"
    print_status "Next steps:"
    print_status "1. Push your code to GitHub"
    print_status "2. Connect your repository to Render.com"
    print_status "3. Set environment variables in Render dashboard"
    print_status "4. Deploy your application"
    print_status "5. Update your frontend CLIENT_URL to point to your Render URL"
    
    print_success "Deployment script completed successfully! 🎉"
}

# Run main function
main "$@"
