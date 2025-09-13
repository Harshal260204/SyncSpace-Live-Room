# SyncSpace Live Room

<div align="center">

![SyncSpace Live Room Logo](https://via.placeholder.com/200x100/4F46E5/FFFFFF?text=SyncSpace+Live+Room)

**A fully accessible, real-time collaborative workspace for code, notes, canvas, and chat**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-%5E18.0.0-blue)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/atlas)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG%202.1%20AA-purple)](https://www.w3.org/WAI/WCAG21/quickref/)

</div>

## 🌟 Overview

SyncSpace Live Room is a **fully free, open-source, accessible, collaborative real-time web application** built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.io. It provides a comprehensive workspace for real-time collaboration on code, notes, canvas sketching, and chat with complete accessibility support for visually and hearing-impaired users.

### ✨ Key Features

- **🔧 Real-time Code Collaboration** - Monaco Editor with live cursors and selections
- **📝 Collaborative Notes** - Rich text editor with real-time synchronization
- **🎨 Canvas Sketching** - Collaborative whiteboard with drawing tools
- **💬 Live Chat** - Real-time messaging with typing indicators
- **♿ Full Accessibility** - WCAG 2.1 AA compliant with screen reader support
- **🌙 Theme Support** - Light/dark themes with high contrast mode
- **📱 Responsive Design** - Works on desktop, tablet, and mobile
- **🔒 Secure** - Anonymous guest login, no passwords required
- **🚀 Free Deployment** - Deploy on Render (backend) and Vercel/Netlify (frontend)

## 🎯 Project Goals

### Primary Objectives
1. **Accessibility First** - Ensure the application is usable by everyone, including users with disabilities
2. **Zero Cost** - Use only free, open-source libraries and free hosting services
3. **Real-time Collaboration** - Provide seamless real-time collaboration across all features
4. **Production Ready** - Build a secure, scalable, and maintainable application
5. **Extensible** - Create a modular architecture for easy future enhancements

### Target Users
- **Developers** - Collaborative coding and debugging sessions
- **Students** - Group study and project collaboration
- **Teams** - Remote collaboration and brainstorming
- **Accessibility Users** - Screen reader users, keyboard-only users, users with visual impairments
- **Educators** - Interactive teaching and learning environments

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js, Express.js, Socket.io, MongoDB, Mongoose
- **Frontend**: React 18, React Router, TailwindCSS, Monaco Editor, Fabric.js
- **Real-time**: Socket.io for bidirectional communication
- **Database**: MongoDB Atlas (free tier)
- **Deployment**: Render (backend), Vercel/Netlify (frontend)
- **Accessibility**: ARIA, semantic HTML, screen reader support

### Project Structure
```
SyncSpace-Live-Room/
├── liveroom-backend/          # Backend API and Socket.io server
│   ├── config/               # Database configuration
│   ├── models/               # MongoDB schemas
│   ├── routes/               # API routes
│   ├── socket/               # Socket.io event handlers
│   ├── middleware/           # Express middleware
│   ├── utils/                # Utility functions
│   └── deploy/               # Deployment scripts
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Workspace/    # Workspace components
│   │   │   └── Accessibility/ # Accessibility components
│   │   ├── contexts/         # React contexts
│   │   ├── pages/            # Page components
│   │   └── utils/            # Utility functions
│   └── deploy/               # Deployment scripts
├── docs/                     # Documentation
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **MongoDB Atlas** account (free tier)
- **Git** for version control

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/SyncSpace-Live-Room.git
cd SyncSpace-Live-Room
```

### 2. Backend Setup
```bash
cd liveroom-backend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```bash
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/liveroom?retryWrites=true&w=majority
CLIENT_URL=http://localhost:3000
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_LIFETIME=7d
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_APP_NAME=SyncSpace Live Room
REACT_APP_VERSION=1.0.0
```

### 4. Start Development Servers
```bash
# Terminal 1 - Backend
cd liveroom-backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health