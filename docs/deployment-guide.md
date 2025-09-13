# Deployment Guide - SyncSpace Live Room

## Overview

This guide provides comprehensive instructions for deploying the SyncSpace Live Room application to production environments. The application is designed to be deployed on free hosting services to maintain zero cost.

## 🚀 Deployment Architecture

### Backend Deployment (Render.com)
- **Service**: Render.com Web Service
- **Plan**: Free tier
- **Runtime**: Node.js 18
- **Database**: MongoDB Atlas (free tier)
- **SSL**: Automatic HTTPS

### Frontend Deployment (Vercel/Netlify)
- **Service**: Vercel.com or Netlify.com
- **Plan**: Free tier
- **Build**: Static React build
- **SSL**: Automatic HTTPS
- **CDN**: Global CDN

## 📋 Prerequisites

### Required Accounts
1. **GitHub** - Code repository
2. **MongoDB Atlas** - Database (free tier)
3. **Render.com** - Backend hosting
4. **Vercel.com** or **Netlify.com** - Frontend hosting

### Required Tools
- **Node.js** 18+ (local development)
- **npm** 9+ (local development)
- **Git** (version control)
- **MongoDB Atlas** account

## 🔧 Backend Deployment (Render.com)

### Step 1: Prepare Backend Code

1. **Navigate to backend directory**
   ```bash
   cd liveroom-backend
   ```

2. **Run deployment script**
   ```bash
   chmod +x deploy/render-deploy.sh
   ./deploy/render-deploy.sh
   ```

3. **Verify build**
   ```bash
   npm run build
   npm test
   ```

### Step 2: Create Render.com Account

1. Go to [Render.com](https://render.com)
2. Sign up with GitHub
3. Connect your GitHub account
4. Authorize Render to access repositories

### Step 3: Deploy Backend

1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

2. **Configure Service**
   - **Name**: `syncspace-liveroom-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

3. **Set Environment Variables**
   ```bash
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
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Note the service URL

### Step 4: Test Backend Deployment

1. **Health Check**
   ```bash
   curl https://your-app-name.onrender.com/health
   ```

2. **API Test**
   ```bash
   curl https://your-app-name.onrender.com/api/rooms
   ```

## 🎨 Frontend Deployment (Vercel)

### Step 1: Prepare Frontend Code

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Run deployment script**
   ```bash
   chmod +x deploy/vercel-deploy.sh
   ./deploy/vercel-deploy.sh
   ```

3. **Verify build**
   ```bash
   npm run build
   npm test
   ```

### Step 2: Create Vercel Account

1. Go to [Vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Connect your GitHub account
4. Authorize Vercel to access repositories

### Step 3: Deploy Frontend

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add REACT_APP_API_URL
   vercel env add REACT_APP_SOCKET_URL
   vercel env add REACT_APP_APP_NAME
   vercel env add REACT_APP_VERSION
   ```

### Step 4: Test Frontend Deployment

1. **Access Application**
   - Open your Vercel URL
   - Test all features

2. **Test Backend Connection**
   - Create a room
   - Test real-time features

## 🎨 Frontend Deployment (Netlify)

### Step 1: Prepare Frontend Code

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Run deployment script**
   ```bash
   chmod +x deploy/netlify-deploy.sh
   ./deploy/netlify-deploy.sh
   ```

### Step 2: Create Netlify Account

1. Go to [Netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Connect your GitHub account
4. Authorize Netlify to access repositories

### Step 3: Deploy Frontend

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod
   ```

4. **Set Environment Variables**
   ```bash
   netlify env:set REACT_APP_API_URL "https://your-backend.onrender.com"
   netlify env:set REACT_APP_SOCKET_URL "https://your-backend.onrender.com"
   netlify env:set REACT_APP_APP_NAME "SyncSpace Live Room"
   netlify env:set REACT_APP_VERSION "1.0.0"
   ```

## 🗄️ MongoDB Atlas Setup

### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for free account
3. Verify email address

### Step 2: Create Cluster

1. **Create New Cluster**
   - Select "M0 Sandbox" (free tier)
   - Choose cloud provider and region
   - Create cluster

2. **Wait for Cluster**
   - Cluster creation takes 3-5 minutes
   - Don't close browser during creation

### Step 3: Configure Database

1. **Create Database User**
   - Go to "Database Access"
   - Add new database user
   - Set username and password
   - Grant read/write permissions

2. **Configure Network Access**
   - Go to "Network Access"
   - Add IP address (0.0.0.0/0 for development)
   - Confirm

3. **Get Connection String**
   - Go to "Clusters"
   - Click "Connect"
   - Select "Connect your application"
   - Copy connection string

### Step 4: Test Connection

1. **Test from Application**
   ```bash
   # Test connection
   curl -X POST https://your-backend.onrender.com/api/auth/test
   ```

2. **Verify in Atlas Dashboard**
   - Check cluster metrics
   - Verify connections

## 🔒 SSL/HTTPS Configuration

### Automatic SSL
Both Render and Vercel/Netlify provide automatic SSL certificates:
- **Render**: Automatic HTTPS for all services
- **Vercel**: Automatic HTTPS for all deployments
- **Netlify**: Automatic HTTPS for all sites

### Custom Domain SSL
1. **Add Custom Domain**
   - Add domain in hosting dashboard
   - Configure DNS records

2. **SSL Certificate**
   - Automatic certificate generation
   - Automatic renewal

## 📊 Monitoring and Maintenance

### Backend Monitoring (Render)

1. **Metrics Dashboard**
   - CPU usage
   - Memory usage
   - Response times
   - Error rates

2. **Logs**
   - Application logs
   - Error logs
   - Access logs

3. **Alerts**
   - Set up alerts for errors
   - Monitor performance

### Frontend Monitoring (Vercel/Netlify)

1. **Analytics**
   - Page views
   - Performance metrics
   - User behavior

2. **Functions Logs**
   - Serverless function logs
   - Error tracking

3. **Performance**
   - Core Web Vitals
   - Lighthouse scores

## 🚨 Troubleshooting

### Common Issues

#### Backend Issues

1. **Connection Refused**
   - Check MongoDB connection string
   - Verify IP whitelist
   - Check environment variables

2. **CORS Errors**
   - Verify CORS_ORIGIN setting
   - Check CLIENT_URL configuration
   - Test with different origins

3. **Socket.io Issues**
   - Check SOCKET_CORS_ORIGIN
   - Verify transport settings
   - Test WebSocket connection

#### Frontend Issues

1. **Build Failures**
   - Check Node.js version
   - Verify environment variables
   - Check for syntax errors

2. **API Connection Issues**
   - Verify REACT_APP_API_URL
   - Check CORS configuration
   - Test API endpoints

3. **Socket Connection Issues**
   - Verify REACT_APP_SOCKET_URL
   - Check WebSocket support
   - Test real-time features

### Debug Commands

#### Backend Debug
```bash
# Check logs
curl https://your-backend.onrender.com/health

# Test API
curl -X GET https://your-backend.onrender.com/api/rooms

# Test Socket.io
curl -X GET https://your-backend.onrender.com/socket.io/
```

#### Frontend Debug
```bash
# Check build
npm run build

# Test locally
npm start

# Check environment
echo $REACT_APP_API_URL
```

## 🔄 Updates and Maintenance

### Automatic Deployments
- **GitHub Integration**: Automatic deployments on push
- **Branch Deployments**: Preview deployments for branches
- **Rollback**: Easy rollback to previous versions

### Manual Updates
1. **Update Code**
   - Make changes locally
   - Test changes
   - Push to GitHub

2. **Deploy**
   - Automatic deployment triggers
   - Monitor deployment status
   - Test in production

3. **Rollback if Needed**
   - Use hosting dashboard
   - Rollback to previous version
   - Fix issues and redeploy

## 📈 Scaling

### Free Tier Limits

#### Render (Backend)
- **CPU**: 0.1 CPU
- **Memory**: 512 MB
- **Bandwidth**: 100 GB/month
- **Sleep**: 15 minutes after inactivity

#### Vercel (Frontend)
- **Bandwidth**: 100 GB/month
- **Builds**: 100 builds/month
- **Functions**: 100 GB-hours/month

#### MongoDB Atlas
- **Storage**: 512 MB
- **Connections**: 100 concurrent
- **Operations**: 100,000 reads/month

### Upgrading Plans
- **Render**: $7/month for always-on service
- **Vercel**: $20/month for Pro plan
- **MongoDB**: $9/month for M2 cluster

## 🎯 Best Practices

### Security
1. **Environment Variables**
   - Never commit .env files
   - Use strong secrets
   - Rotate secrets regularly

2. **CORS Configuration**
   - Restrict origins in production
   - Use HTTPS only
   - Validate requests

3. **Rate Limiting**
   - Implement rate limiting
   - Monitor usage
   - Block abusive requests

### Performance
1. **Caching**
   - Use CDN for static assets
   - Cache API responses
   - Optimize images

2. **Database**
   - Use connection pooling
   - Optimize queries
   - Monitor performance

3. **Frontend**
   - Code splitting
   - Lazy loading
   - Optimize bundles

### Monitoring
1. **Logs**
   - Centralized logging
   - Error tracking
   - Performance monitoring

2. **Alerts**
   - Set up alerts
   - Monitor key metrics
   - Respond quickly

3. **Backups**
   - Regular backups
   - Test restore procedures
   - Document recovery

## 📚 Additional Resources

### Documentation
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)

### Community
- [Render Community](https://community.render.com)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Netlify Community](https://community.netlify.com)
- [MongoDB Community](https://community.mongodb.com)

### Support
- **Render**: Community support for free tier
- **Vercel**: Community support for free tier
- **Netlify**: Community support for free tier
- **MongoDB**: Community support for free tier

---

**Need Help?** Check the troubleshooting section or reach out to the community for assistance.
