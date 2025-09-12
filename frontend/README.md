# Live Room Frontend

A real-time collaborative workspace frontend built with React, TailwindCSS, and Socket.io. This frontend provides an accessible, responsive interface for real-time collaboration including code editing, note-taking, canvas drawing, and chat functionality.

## 🚀 Features

- **Real-time Collaboration**: Socket.io-powered real-time updates for all collaborative features
- **Responsive Design**: Mobile-first design that works on all devices
- **Accessibility First**: Full WCAG 2.1 AA compliance with screen reader support
- **Theme Support**: Light/dark mode with high contrast options
- **Code Editor**: Monaco Editor integration for collaborative code editing
- **Canvas Drawing**: Collaborative sketching and drawing with Fabric.js
- **Real-time Chat**: Live messaging with message history
- **User Presence**: Live cursor tracking and user presence indicators
- **Keyboard Navigation**: Full keyboard accessibility support
- **Screen Reader Support**: Optimized for assistive technologies

## 🛠️ Tech Stack

- **Framework**: React 18
- **Routing**: React Router v6
- **Styling**: TailwindCSS with custom accessibility utilities
- **Real-time**: Socket.io Client
- **Code Editor**: Monaco Editor
- **Canvas**: Fabric.js
- **Icons**: Heroicons
- **Notifications**: React Hot Toast
- **Accessibility**: React Announcer, custom ARIA components

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend server running (see backend README)

## 🚀 Quick Start

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the frontend directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Backend Server URL
REACT_APP_SERVER_URL=http://localhost:5000

# Environment
REACT_APP_ENV=development

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEBUG=true
```

### 4. Start Development Server

```bash
npm start
```

The application will open at `http://localhost:3000` in your browser.

### 5. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## 🏗️ Project Structure

```
frontend/
├── public/
│   ├── index.html              # Main HTML template
│   └── manifest.json           # PWA manifest
├── src/
│   ├── components/             # Reusable components
│   │   ├── Dashboard/          # Dashboard-specific components
│   │   ├── Layout/             # Layout components
│   │   ├── UI/                 # Generic UI components
│   │   └── Workspace/          # Workspace-specific components
│   ├── contexts/               # React contexts
│   │   ├── AccessibilityContext.js
│   │   ├── SocketContext.js
│   │   ├── ThemeContext.js
│   │   └── UserContext.js
│   ├── pages/                  # Page components
│   │   ├── Dashboard.js
│   │   ├── RoomWorkspace.js
│   │   └── NotFound.js
│   ├── utils/                  # Utility functions
│   ├── App.js                  # Main app component
│   ├── index.js                # Entry point
│   └── index.css               # Global styles
├── tailwind.config.js          # TailwindCSS configuration
├── postcss.config.js           # PostCSS configuration
└── package.json                # Dependencies and scripts
```

## 🎨 Theming and Accessibility

### Theme System

The application supports three theme modes:

- **Light Mode**: Default light theme
- **Dark Mode**: Dark theme for low-light environments
- **Auto Mode**: Automatically switches based on system preference

### High Contrast Mode

High contrast mode provides enhanced visibility for users with visual impairments:

- Increased color contrast ratios
- Simplified color palette
- Enhanced focus indicators
- Better text readability

### Font Sizing

Three font size options are available:

- **Small**: Compact interface for small screens
- **Medium**: Standard size (default)
- **Large**: Enhanced readability for users with visual impairments

### Accessibility Features

- **Screen Reader Support**: Full ARIA labels and live regions
- **Keyboard Navigation**: Complete keyboard accessibility
- **Focus Management**: Clear focus indicators and logical tab order
- **Live Announcements**: Real-time updates for screen readers
- **Skip Links**: Quick navigation for keyboard users
- **High Contrast**: Enhanced visibility options
- **Reduced Motion**: Respects user's motion preferences

## 🔌 Socket.io Integration

### Connection Management

The Socket.io client automatically handles:

- Connection establishment and reconnection
- Error handling and recovery
- Heartbeat monitoring
- Graceful disconnection

### Real-time Events

#### Outgoing Events (Client → Server)

- `joinRoom` - Join a collaborative room
- `leaveRoom` - Leave the current room
- `code-change` - Send code changes
- `note-change` - Send note changes
- `draw-event` - Send canvas drawing events
- `chat-message` - Send chat message
- `presence-update` - Update user presence

#### Incoming Events (Server → Client)

- `roomJoined` - Confirmation of joining room
- `userJoined` - Another user joined
- `userLeft` - User left the room
- `code-changed` - Code content updated
- `note-changed` - Notes content updated
- `drawing-updated` - Canvas drawing updated
- `chat-message` - New chat message
- `presence-updated` - User presence updated

## 🎯 Component Architecture

### Context Providers

- **ThemeContext**: Manages theme and appearance settings
- **AccessibilityContext**: Handles accessibility preferences and announcements
- **UserContext**: Manages user state and preferences
- **SocketContext**: Handles real-time communication

### Page Components

- **Dashboard**: Room list, creation, and joining interface
- **RoomWorkspace**: Main collaborative workspace
- **NotFound**: 404 error page

### Layout Components

- **Layout**: Main layout wrapper with accessibility features
- **LoadingSpinner**: Accessible loading indicator
- **ErrorBoundary**: Error handling with fallback UI

## 🚀 Deployment

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Set Environment Variables**
   In the Vercel dashboard, add:
   - `REACT_APP_SERVER_URL`: Your backend server URL
   - `REACT_APP_ENV`: `production`

### Deploy to Netlify

1. **Install Netlify CLI**
   ```bash
   npm i -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Build and Deploy**
   ```bash
   npm run build
   netlify deploy --prod --dir=build
   ```

4. **Set Environment Variables**
   In the Netlify dashboard, add:
   - `REACT_APP_SERVER_URL`: Your backend server URL
   - `REACT_APP_ENV`: `production`

### Deploy to GitHub Pages

1. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add Deploy Script**
   Add to `package.json`:
   ```json
   {
     "scripts": {
       "deploy": "gh-pages -d build"
     }
   }
   ```

3. **Deploy**
   ```bash
   npm run build
   npm run deploy
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REACT_APP_SERVER_URL` | Backend server URL | http://localhost:5000 | Yes |
| `REACT_APP_ENV` | Environment mode | development | No |
| `REACT_APP_ENABLE_ANALYTICS` | Enable analytics | false | No |
| `REACT_APP_ENABLE_DEBUG` | Enable debug mode | false | No |

### TailwindCSS Configuration

The TailwindCSS configuration includes:

- Custom color palette for accessibility
- Font size utilities for accessibility
- Animation utilities with reduced motion support
- Custom utilities for high contrast mode
- Focus management utilities

### Accessibility Configuration

Accessibility features can be configured through:

- User preferences in the settings modal
- System preferences detection
- Local storage persistence
- Context-based state management

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Linting

```bash
npm run lint
```

### Fix Linting Issues

```bash
npm run lint:fix
```

## 🐛 Troubleshooting

### Common Issues

1. **Socket Connection Failed**
   - Check if backend server is running
   - Verify `REACT_APP_SERVER_URL` is correct
   - Check CORS configuration

2. **Build Errors**
   - Clear node_modules and reinstall
   - Check for TypeScript errors
   - Verify all dependencies are installed

3. **Accessibility Issues**
   - Test with screen reader
   - Check keyboard navigation
   - Verify ARIA labels

4. **Theme Not Applying**
   - Check browser developer tools
   - Verify CSS is loading
   - Check for conflicting styles

### Debug Mode

Set `REACT_APP_ENABLE_DEBUG=true` in your `.env` file for additional logging.

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## ♿ Accessibility Compliance

- **WCAG 2.1 AA**: Full compliance with Web Content Accessibility Guidelines
- **Section 508**: Compliant with US federal accessibility standards
- **EN 301 549**: Compliant with European accessibility standards

## 🔒 Security

- **CSP Headers**: Content Security Policy for XSS protection
- **Input Validation**: Client-side validation for all inputs
- **XSS Protection**: Sanitized user inputs
- **HTTPS Only**: Secure connections in production

## 📈 Performance

- **Code Splitting**: Automatic code splitting for optimal loading
- **Lazy Loading**: Components loaded on demand
- **Bundle Optimization**: Optimized production builds
- **Caching**: Efficient caching strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the accessibility documentation

## 🔄 Changelog

### v1.0.0
- Initial release
- Real-time collaboration features
- Full accessibility support
- Theme and font size customization
- Responsive design
- Socket.io integration
- Monaco Editor integration
- Canvas drawing with Fabric.js
- Real-time chat
- User presence indicators

---

**Live Room Frontend** - Built with ❤️ for accessible, real-time collaboration
