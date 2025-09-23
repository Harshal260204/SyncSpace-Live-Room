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

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useSocket } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { roomAPI } from '../services/api';

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
  const { fontSize, announce, screenReader, getAccessibilityDescription } = useAccessibility();

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
  const handleCreateRoom = useCallback(async (roomData) => {
    try {
      console.log('Creating room with data:', roomData);
      
      // Create room via API
      const createdRoom = await roomAPI.createRoom(roomData);
      console.log('Room created successfully:', createdRoom);
      
      // Navigate to the created room
      navigate(`/room/${createdRoom.roomId}`, { 
        state: { 
          roomData: createdRoom,
          isNewRoom: true,
        }
      });
      
      if (screenReader) {
        announce(`Room "${createdRoom.roomName}" created successfully`, 'polite');
      }
      
    } catch (error) {
      console.error('Error creating room:', error);
      announce(`Failed to create room: ${error.message}`, 'assertive');
    }
  }, [navigate, screenReader, announce]);

  // Handle room joining
  const handleJoinRoom = useCallback((roomId) => {
    if (!roomId.trim()) {
      announce('Please enter a room ID', 'assertive');
      return;
    }

    navigate(`/room/${roomId.trim()}`);
  }, [navigate, announce]);


  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setShowCreateModal(false);
      setShowJoinModal(false);
      setShowSettings(false);
    }
  }, []);

  // Set up keyboard navigation
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
          <div className="max-w-lg w-full space-y-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-10 shadow-xl">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Welcome to SyncSpace
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Real-time collaborative workspace for teams
              </p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  placeholder="Enter your username"
                  aria-describedby="username-help"
                  autoComplete="username"
                  maxLength={50}
                />
                <p id="username-help" className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Choose a username to join collaborative rooms
                </p>
              </div>

              <button
                type="submit"
                disabled={isCreatingUser || !username.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                aria-describedby="submit-help"
              >
                {isCreatingUser ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Get Started
                  </>
                )}
              </button>
            </form>

            {/* Accessibility information */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-blue-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Accessibility Features
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-200">
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Screen reader support
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Keyboard navigation
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  High contrast mode
                </div>
                <div className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                  Adjustable font sizes
                </div>
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
          <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                      SyncSpace Live Room
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Welcome back, <span className="font-semibold text-gray-800 dark:text-gray-100">{user?.username}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Connection status */}
                  <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <div 
                      className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} ${connected ? 'animate-pulse' : ''}`}
                      aria-label={`Connection status: ${connected ? 'Connected' : 'Disconnected'}`}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  {/* Settings button */}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    aria-label="Open settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Quick actions */}
            <div className="mb-12">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Quick Actions
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Start collaborating or join an existing workspace
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="group p-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-300 text-left"
                  aria-describedby="create-room-help"
                >
                  <div className="flex items-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mr-6 shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Create Room
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Start a new collaborative workspace with code editing, notes, canvas, and chat
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setShowJoinModal(true)}
                  className="group p-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-300 text-left"
                  aria-describedby="join-room-help"
                >
                  <div className="flex items-center">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center mr-6 shadow-lg">
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Join Room
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        Enter a room ID to join an existing collaborative workspace
                      </p>
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Recent Rooms
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <RoomList onJoinRoom={handleJoinRoom} />
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
