/**
 * Dashboard Page Component
 * 
 * Main dashboard for room management including:
 * - Room list with search and filtering
 * - Create new room functionality
 * - Join existing room functionality
 * - User preferences and settings
 * - Accessibility controls
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useSocket } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibility } from '../contexts/AccessibilityContext';

// Import components
import Layout from '../components/Layout/Layout';
import RoomList from '../components/Dashboard/RoomList';
import CreateRoomModal from '../components/Dashboard/CreateRoomModal';
import JoinRoomModal from '../components/Dashboard/JoinRoomModal';
import UserSettings from '../components/Dashboard/UserSettings';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ErrorBoundary from '../components/UI/ErrorBoundary';

/**
 * Dashboard Page Component
 * 
 * Provides the main interface for room management and user settings
 * Includes accessibility features and real-time updates
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, createUser, loading: userLoading } = useUser();
  const { connected } = useSocket();
  const { 
    getThemeDescription, 
    glassmorphism, 
    animations,
    getGlassmorphismClass,
    getAnimationsClass 
  } = useTheme();
  const { fontSize, announce, getAccessibilityDescription } = useAccessibility();

  // Local state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [username, setUsername] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Initialize user if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !userLoading) {
      // Check if there's a saved username
      const savedUsername = localStorage.getItem('liveroom-username');
      if (savedUsername) {
        setUsername(savedUsername);
      }
    }
  }, [isAuthenticated, userLoading]);

  // Handle user creation
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      announce('Please enter a username', 'assertive');
      return;
    }

    if (username.length > 50) {
      announce('Username must be less than 50 characters', 'assertive');
      return;
    }

    if (!/^[a-zA-Z0-9\s\-_]+$/.test(username)) {
      announce('Username can only contain letters, numbers, spaces, hyphens, and underscores', 'assertive');
      return;
    }

    setIsCreatingUser(true);
    
    try {
      await createUser(username.trim());
      localStorage.setItem('liveroom-username', username.trim());
      announce(`Welcome to Live Room, ${username}!`, 'polite');
    } catch (error) {
      console.error('Error creating user:', error);
      announce('Failed to create user session. Please try again.', 'assertive');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Handle room creation
  const handleCreateRoom = (roomData) => {
    const roomId = generateRoomId();
    navigate(`/room/${roomId}`, { 
      state: { 
        roomData: {
          ...roomData,
          roomId,
        },
        isNewRoom: true,
      }
    });
  };

  // Handle room joining
  const handleJoinRoom = (roomId) => {
    if (!roomId.trim()) {
      announce('Please enter a room ID', 'assertive');
      return;
    }

    navigate(`/room/${roomId.trim()}`);
  };

  // Generate unique room ID
  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowCreateModal(false);
      setShowJoinModal(false);
      setShowSettings(false);
    }
  };

  // Set up keyboard navigation
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show loading state
  if (userLoading || isCreatingUser) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="large" />
          <span className="sr-only">Loading dashboard...</span>
        </div>
      </Layout>
    );
  }

  // Show user creation form if not authenticated
  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className={`
            max-w-md w-full space-y-8
            ${glassmorphism ? 'card-floating' : 'card'}
            ${animations ? 'animate-fade-in' : ''}
          `}>
            <div className="text-center">
              <div className={`
                mb-6
                ${animations ? 'animate-float' : ''}
              `}>
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome to SyncSpace
              </h1>
              <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
                Real-time collaborative workspace with full accessibility support
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="mt-8 space-y-6">
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`
                    input w-full
                    ${glassmorphism ? 'input-modern' : ''}
                    ${animations ? 'transition-all duration-300 focus:scale-105' : ''}
                  `}
                  placeholder="Enter your username"
                  aria-describedby="username-help"
                  autoComplete="username"
                  maxLength={50}
                />
                <p id="username-help" className="text-sm text-gray-500 dark:text-gray-400">
                  Choose a username to join collaborative rooms. No password required.
                </p>
              </div>

              <button
                type="submit"
                disabled={isCreatingUser || !username.trim()}
                className={`
                  btn btn-primary w-full
                  ${animations ? 'hover:scale-105 transition-transform duration-200' : ''}
                  ${isCreatingUser ? 'animate-pulse' : ''}
                `}
                aria-describedby="submit-help"
              >
                <span className="flex items-center justify-center gap-2">
                  {isCreatingUser ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Get Started
                    </>
                  )}
                </span>
              </button>
              
              <p id="submit-help" className="text-sm text-gray-500 dark:text-gray-400 text-center">
                By continuing, you agree to our terms of service and privacy policy.
              </p>
            </form>

            {/* Accessibility information */}
            <div className={`
              mt-8 p-6 rounded-2xl
              ${glassmorphism 
                ? 'glass-card border border-blue-200/50 dark:border-blue-800/50' 
                : 'bg-blue-50 dark:bg-blue-900/20'
              }
              ${animations ? 'animate-slide-up' : ''}
            `}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Accessibility Features
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: '👁️', text: 'Screen reader support' },
                  { icon: '⌨️', text: 'Keyboard navigation' },
                  { icon: '🔍', text: 'High contrast mode' },
                  { icon: '📝', text: 'Adjustable font sizes' },
                  { icon: '🔊', text: 'Live announcements' },
                  { icon: '🎨', text: 'Glassmorphism effects' }
                ].map((feature, index) => (
                  <div 
                    key={index}
                    className={`
                      flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200
                      ${animations ? 'animate-fade-in' : ''}
                    `}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <span className="text-lg">{feature.icon}</span>
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Main dashboard content
  return (
    <Layout>
      <ErrorBoundary>
        <div className="min-h-screen">
          {/* Header */}
          <header className={`
            ${glassmorphism 
              ? 'glass-card border-b border-white/20 backdrop-blur-xl' 
              : 'bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700'
            }
            transition-all duration-300
          `}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                <div className="flex items-center space-x-4">
                  <div className={`
                    w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center
                    ${animations ? 'animate-float' : ''}
                  `}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      SyncSpace Live Room
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Welcome back, <span className="font-medium text-gray-700 dark:text-gray-300">{user?.username}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Connection status */}
                  <div className={`
                    flex items-center space-x-3 px-4 py-2 rounded-xl
                    ${glassmorphism 
                      ? 'glass-card border border-white/20' 
                      : 'bg-gray-100 dark:bg-gray-700'
                    }
                    ${animations ? 'transition-all duration-300' : ''}
                  `}>
                    <div 
                      className={`
                        w-3 h-3 rounded-full
                        ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}
                        ${animations ? 'transition-all duration-300' : ''}
                      `}
                      aria-label={`Connection status: ${connected ? 'Connected' : 'Disconnected'}`}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Settings button */}
                  <button
                    onClick={() => setShowSettings(true)}
                    className={`
                      btn btn-outline
                      ${animations ? 'hover:scale-105 transition-transform duration-200' : ''}
                    `}
                    aria-label="Open settings"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Quick actions */}
            <div className="mb-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Quick Actions
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Start collaborating or join an existing workspace
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className={`
                    group relative overflow-hidden
                    ${glassmorphism ? 'card-floating' : 'card'}
                    ${animations ? 'hover:scale-105 transition-all duration-300' : ''}
                    text-left p-8 h-auto
                  `}
                  aria-describedby="create-room-help"
                >
                  <div className="flex items-center">
                    <div className={`
                      flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center
                      ${animations ? 'group-hover:scale-110 transition-transform duration-300' : ''}
                    `}>
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="ml-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Create Room
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Start a new collaborative workspace with code editing, notes, canvas, and chat
                      </p>
                    </div>
                  </div>
                  <div className={`
                    absolute top-4 right-4 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center
                    ${animations ? 'group-hover:rotate-12 transition-transform duration-300' : ''}
                  `}>
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => setShowJoinModal(true)}
                  className={`
                    group relative overflow-hidden
                    ${glassmorphism ? 'card-floating' : 'card'}
                    ${animations ? 'hover:scale-105 transition-all duration-300' : ''}
                    text-left p-8 h-auto
                  `}
                  aria-describedby="join-room-help"
                >
                  <div className="flex items-center">
                    <div className={`
                      flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center
                      ${animations ? 'group-hover:scale-110 transition-transform duration-300' : ''}
                    `}>
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-6">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Join Room
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Enter a room ID to join an existing collaborative workspace
                      </p>
                    </div>
                  </div>
                  <div className={`
                    absolute top-4 right-4 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center
                    ${animations ? 'group-hover:rotate-12 transition-transform duration-300' : ''}
                  `}>
                    <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </button>
              </div>
              
              <div id="create-room-help" className="sr-only">
                Create a new collaborative room with code editing, notes, canvas drawing, and chat
              </div>
              <div id="join-room-help" className="sr-only">
                Join an existing room by entering its room ID
              </div>
            </div>

            {/* Room list */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Recent Rooms
              </h2>
              <RoomList onJoinRoom={handleJoinRoom} />
            </div>

            {/* Accessibility status */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Current Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Theme:</span> {getThemeDescription()}
                </div>
                <div>
                  <span className="font-medium">Font Size:</span> {fontSize}
                </div>
                <div>
                  <span className="font-medium">Accessibility:</span> {getAccessibilityDescription()}
                </div>
              </div>
            </div>
          </main>

          {/* Modals */}
          {showCreateModal && (
            <CreateRoomModal
              onClose={() => setShowCreateModal(false)}
              onCreateRoom={handleCreateRoom}
            />
          )}

          {showJoinModal && (
            <JoinRoomModal
              onClose={() => setShowJoinModal(false)}
              onJoinRoom={handleJoinRoom}
            />
          )}

          {showSettings && (
            <UserSettings
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </ErrorBoundary>
    </Layout>
  );
};

export default Dashboard;
