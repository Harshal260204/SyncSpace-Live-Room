#!/bin/bash

# SyncSpace Live Room - Frontend Deployment Script for Vercel
# This script automates the deployment process for Vercel.com

set -e  # Exit on any error

echo "🚀 Starting SyncSpace Live Room Frontend Deployment on Vercel..."

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
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI is not installed. Installing now..."
        npm install -g vercel
    fi
    
    print_success "All dependencies are installed"
}

# Validate environment variables
validate_env() {
    print_status "Validating environment variables..."
    
    if [ -z "$REACT_APP_API_URL" ]; then
        print_error "REACT_APP_API_URL environment variable is required"
        print_status "Please set your backend API URL:"
        print_status "export REACT_APP_API_URL='https://your-backend.onrender.com'"
        exit 1
    fi
    
    if [ -z "$REACT_APP_SOCKET_URL" ]; then
        print_warning "REACT_APP_SOCKET_URL not set, using REACT_APP_API_URL"
        export REACT_APP_SOCKET_URL="$REACT_APP_API_URL"
    fi
    
    if [ -z "$REACT_APP_APP_NAME" ]; then
        print_warning "REACT_APP_APP_NAME not set, using default: SyncSpace Live Room"
        export REACT_APP_APP_NAME="SyncSpace Live Room"
    fi
    
    if [ -z "$REACT_APP_VERSION" ]; then
        print_warning "REACT_APP_VERSION not set, using default: 1.0.0"
        export REACT_APP_VERSION="1.0.0"
    fi
    
    print_success "Environment variables validated"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
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
    
    # Set production environment
    export NODE_ENV=production
    
    # Build the application
    npm run build
    
    if [ -d "build" ]; then
        print_success "Application built successfully"
    else
        print_error "Build failed. Please check the build output."
        exit 1
    fi
}

# Test the build
test_build() {
    print_status "Testing build..."
    
    # Install serve for testing
    npm install -g serve
    
    # Start the build in background
    serve -s build -l 3000 &
    SERVE_PID=$!
    
    # Wait for the server to start
    sleep 5
    
    # Test the application
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "Build test passed"
    else
        print_error "Build test failed"
        kill $SERVE_PID 2>/dev/null || true
        exit 1
    fi
    
    # Stop the server
    kill $SERVE_PID 2>/dev/null || true
    
    print_success "Build tests passed"
}

# Create Vercel configuration
create_vercel_config() {
    print_status "Creating Vercel configuration..."
    
    cat > vercel.json << EOF
{
  "version": 2,
  "name": "syncspace-liveroom-frontend",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "dest": "/static/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_API_URL": "@react_app_api_url",
    "REACT_APP_SOCKET_URL": "@react_app_socket_url",
    "REACT_APP_APP_NAME": "@react_app_app_name",
    "REACT_APP_VERSION": "@react_app_version"
  },
  "build": {
    "env": {
      "REACT_APP_API_URL": "@react_app_api_url",
      "REACT_APP_SOCKET_URL": "@react_app_socket_url",
      "REACT_APP_APP_NAME": "@react_app_app_name",
      "REACT_APP_VERSION": "@react_app_version"
    }
  },
  "functions": {
    "app/api/**/*.js": {
      "runtime": "nodejs18.x"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    },
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": true
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
EOF
    
    print_success "Vercel configuration created"
}

# Create environment file
create_env_file() {
    print_status "Creating environment file..."
    
    cat > .env.production << EOF
# Production Environment Variables
NODE_ENV=production
REACT_APP_API_URL=$REACT_APP_API_URL
REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL
REACT_APP_APP_NAME=$REACT_APP_APP_NAME
REACT_APP_VERSION=$REACT_APP_VERSION

# Build Configuration
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
REACT_APP_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF
    
    print_success "Environment file created"
}

# Create PWA configuration
create_pwa_config() {
    print_status "Creating PWA configuration..."
    
    cat > public/sw.js << EOF
// Service Worker for SyncSpace Live Room
const CACHE_NAME = 'syncspace-liveroom-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
EOF
    
    print_success "PWA configuration created"
}

# Create deployment documentation
create_deployment_docs() {
    print_status "Creating deployment documentation..."
    
    cat > DEPLOYMENT.md << EOF
# SyncSpace Live Room - Frontend Deployment Guide

## Vercel.com Deployment

### Prerequisites
1. Vercel account
2. GitHub repository with your code
3. Backend API deployed and running

### Step 1: Vercel CLI Setup
1. Install Vercel CLI: \`npm install -g vercel\`
2. Login to Vercel: \`vercel login\`
3. Link your project: \`vercel link\`

### Step 2: Environment Variables
Set the following environment variables in Vercel dashboard or via CLI:

\`\`\`bash
vercel env add REACT_APP_API_URL
vercel env add REACT_APP_SOCKET_URL
vercel env add REACT_APP_APP_NAME
vercel env add REACT_APP_VERSION
\`\`\`

Or set them in Vercel dashboard:
- **REACT_APP_API_URL**: https://your-backend.onrender.com
- **REACT_APP_SOCKET_URL**: https://your-backend.onrender.com
- **REACT_APP_APP_NAME**: SyncSpace Live Room
- **REACT_APP_VERSION**: 1.0.0

### Step 3: Deploy
\`\`\`bash
vercel --prod
\`\`\`

### Step 4: Custom Domain (Optional)
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings > Domains
4. Add your custom domain
5. Configure DNS records

## Netlify.com Deployment

### Step 1: Netlify CLI Setup
1. Install Netlify CLI: \`npm install -g netlify-cli\`
2. Login to Netlify: \`netlify login\`
3. Link your project: \`netlify init\`

### Step 2: Environment Variables
Set environment variables in Netlify dashboard or via CLI:

\`\`\`bash
netlify env:set REACT_APP_API_URL "https://your-backend.onrender.com"
netlify env:set REACT_APP_SOCKET_URL "https://your-backend.onrender.com"
netlify env:set REACT_APP_APP_NAME "SyncSpace Live Room"
netlify env:set REACT_APP_VERSION "1.0.0"
\`\`\`

### Step 3: Deploy
\`\`\`bash
netlify deploy --prod
\`\`\`

## Manual Deployment

### Step 1: Build
\`\`\`bash
npm run build
\`\`\`

### Step 2: Deploy to Static Host
Upload the \`build\` folder to your static hosting service:
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting
- Any static hosting service

## Environment Variables

### Required Variables
- **REACT_APP_API_URL**: Backend API URL
- **REACT_APP_SOCKET_URL**: Socket.io server URL

### Optional Variables
- **REACT_APP_APP_NAME**: Application name
- **REACT_APP_VERSION**: Application version

## Build Configuration

### Package.json Scripts
\`\`\`json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "build:vercel": "GENERATE_SOURCEMAP=false npm run build",
    "build:netlify": "GENERATE_SOURCEMAP=false npm run build"
  }
}
\`\`\`

### Build Optimization
- Source maps disabled for production
- Inline runtime chunk disabled
- Tree shaking enabled
- Code splitting enabled
- PWA support enabled

## Security Headers

The application includes security headers:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

## Performance Optimization

### Caching
- Static assets cached for 1 year
- HTML files cached for 1 hour
- API responses cached appropriately

### Compression
- Gzip compression enabled
- Brotli compression enabled (where supported)

### Code Splitting
- Route-based code splitting
- Component-based code splitting
- Lazy loading for non-critical components

## Troubleshooting

### Common Issues
1. **Build Fails**: Check Node.js version (18+ required)
2. **Environment Variables**: Ensure all required variables are set
3. **CORS Errors**: Verify REACT_APP_API_URL is correct
4. **Socket Connection**: Check REACT_APP_SOCKET_URL

### Debug Mode
Enable debug mode by setting:
\`\`\`bash
export REACT_APP_DEBUG=true
\`\`\`

### Logs
View deployment logs in:
- Vercel: Dashboard > Functions > Logs
- Netlify: Dashboard > Functions > Logs

## Monitoring

### Performance Monitoring
- Vercel Analytics (if enabled)
- Netlify Analytics (if enabled)
- Custom performance monitoring

### Error Tracking
- Sentry integration (optional)
- Custom error tracking
- User feedback collection

## Updates and Maintenance

### Automatic Deployments
- GitHub integration for automatic deployments
- Branch-based deployments
- Preview deployments for pull requests

### Manual Updates
1. Update code in repository
2. Push to main branch
3. Deployment triggers automatically
4. Monitor deployment status

### Rollback
- Vercel: Dashboard > Deployments > Rollback
- Netlify: Dashboard > Deployments > Rollback
EOF
    
    print_success "Deployment documentation created"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    # Login to Vercel if not already logged in
    if ! vercel whoami > /dev/null 2>&1; then
        print_status "Please login to Vercel..."
        vercel login
    fi
    
    # Deploy to Vercel
    vercel --prod
    
    print_success "Deployment to Vercel completed!"
}

# Main deployment function
main() {
    print_status "Starting SyncSpace Live Room Frontend Deployment..."
    
    check_dependencies
    validate_env
    install_dependencies
    security_audit
    build_app
    test_build
    create_vercel_config
    create_env_file
    create_pwa_config
    create_deployment_docs
    
    # Ask if user wants to deploy
    read -p "Do you want to deploy to Vercel now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_vercel
    else
        print_status "Deployment preparation completed!"
        print_status "To deploy later, run: vercel --prod"
    fi
    
    print_success "Frontend deployment preparation completed! 🎉"
    print_status "Next steps:"
    print_status "1. Set environment variables in Vercel dashboard"
    print_status "2. Deploy your application: vercel --prod"
    print_status "3. Configure custom domain (optional)"
    print_status "4. Test your deployment"
    
    print_success "Deployment script completed successfully! 🎉"
}

# Run main function
main "$@"
