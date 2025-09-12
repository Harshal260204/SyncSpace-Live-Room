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
  const { getThemeDescription } = useTheme();
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome to Live Room
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Real-time collaborative workspace with full accessibility support
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="mt-8 space-y-6">
              <div>
                <label htmlFor="username" className="sr-only">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input w-full"
                  placeholder="Enter your username"
                  aria-describedby="username-help"
                  autoComplete="username"
                  maxLength={50}
                />
                <p id="username-help" className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Choose a username to join collaborative rooms. No password required.
                </p>
              </div>

              <button
                type="submit"
                disabled={isCreatingUser || !username.trim()}
                className="btn btn-primary w-full"
                aria-describedby="submit-help"
              >
                {isCreatingUser ? 'Creating...' : 'Get Started'}
              </button>
              
              <p id="submit-help" className="text-sm text-gray-500 dark:text-gray-400 text-center">
                By continuing, you agree to our terms of service and privacy policy.
              </p>
            </form>

            {/* Accessibility information */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Accessibility Features
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Screen reader support</li>
                <li>• Keyboard navigation</li>
                <li>• High contrast mode</li>
                <li>• Adjustable font sizes</li>
                <li>• Live announcements</li>
              </ul>
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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Live Room
                  </h1>
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                    Welcome, {user?.username}
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Connection status */}
                  <div className="flex items-center space-x-2">
                    <div 
                      className={`w-2 h-2 rounded-full ${
                        connected ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      aria-label={`Connection status: ${connected ? 'Connected' : 'Disconnected'}`}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Settings button */}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="btn btn-outline"
                    aria-label="Open settings"
                  >
                    Settings
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Quick actions */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary text-left p-6 h-auto"
                  aria-describedby="create-room-help"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium">Create Room</h3>
                      <p className="text-sm opacity-90">Start a new collaborative workspace</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setShowJoinModal(true)}
                  className="btn btn-outline text-left p-6 h-auto"
                  aria-describedby="join-room-help"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium">Join Room</h3>
                      <p className="text-sm opacity-90">Enter a room ID to join</p>
                    </div>
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
