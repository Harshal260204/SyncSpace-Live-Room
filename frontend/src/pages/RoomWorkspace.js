/**
 * Room Workspace Page Component
 * 
 * Main collaborative workspace including:
 * - Code editor with Monaco Editor
 * - Collaborative notes editor
 * - Canvas drawing area
 * - Real-time chat
 * - User presence indicators
 * - Accessibility features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useSocket } from '../contexts/SocketContext';
import { useAccessibility } from '../contexts/AccessibilityContext';

// Import components
import Layout from '../components/Layout/Layout';
import CodeEditor from '../components/Workspace/CodeEditor';
import NotesEditor from '../components/Workspace/NotesEditor';
import CanvasDrawing from '../components/Workspace/CanvasDrawing';
import ChatPanel from '../components/Workspace/ChatPanel';
import ParticipantsList from '../components/Workspace/ParticipantsList';
import CollaborationCursors from '../components/Workspace/CollaborationCursors';
import RoomInfo from '../components/Workspace/RoomInfo';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import ErrorBoundary from '../components/UI/ErrorBoundary';

/**
 * Room Workspace Page Component
 * 
 * Provides the main collaborative workspace interface
 * Handles real-time collaboration and accessibility features
 */
const RoomWorkspace = () => {
  console.log('🔄 RoomWorkspace component rendered');
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const { user, isAuthenticated, joinRoom: joinUserRoom, leaveRoom: leaveUserRoom } = useUser();
  const { 
    connected, 
    joinRoom, 
    leaveRoom, 
    currentRoom, 
    participants, 
    roomData,
    sendCodeChange,
    sendNoteChange,
    sendDrawingEvent,
    sendChatMessage,
    sendPresenceUpdate,
    error: socketError 
  } = useSocket();
  const { announce, screenReader } = useAccessibility();

  // Local state
  const [isJoining, setIsJoining] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

  // Refs for collaboration with proper cleanup
  const workspaceRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isJoiningRef = useRef(false);
  const cleanupRefs = useRef([]);

  // Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    // Clear all cleanup refs
    cleanupRefs.current.forEach(cleanup => {
      if (cleanup) {
        cleanup();
      }
    });
    cleanupRefs.current = [];
    
    // Reset joining state
    isJoiningRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Stable join room function
  const joinRoomSession = useCallback(async () => {
    console.log('🔄 joinRoomSession called', { 
      isAuthenticated, 
      connected, 
      roomId, 
      user: !!user,
      isJoiningRef: isJoiningRef.current 
    });
    
    if (!isAuthenticated || !connected || !roomId || !user) {
      console.log('❌ Missing requirements for joining room:', { isAuthenticated, connected, roomId, user: !!user });
      return;
    }

    // Prevent multiple simultaneous join attempts
    if (isJoiningRef.current) {
      console.log('⏳ Already joining room, skipping...');
      return;
    }

    console.log('🚀 Attempting to join room:', roomId);
    isJoiningRef.current = true;
    setIsJoining(true);
    
    try {
      // Join user to room in user context
      joinUserRoom(roomId);
      
      // Join room via socket
      joinRoom(roomId, user.username, user.preferences);
      
      // Announce room join for screen readers
      if (screenReader) {
        announce(`Joined room ${roomId}`, 'polite');
      }
      
    } catch (error) {
      console.error('Error joining room:', error);
      announce('Failed to join room. Please try again.', 'assertive');
      navigate('/');
    } finally {
      isJoiningRef.current = false;
      setIsJoining(false);
    }
  }, [isAuthenticated, connected, roomId, user, joinUserRoom, joinRoom, screenReader, announce, navigate]);

  // Join room when component mounts
  useEffect(() => {
    console.log('🔄 RoomWorkspace useEffect triggered', { isAuthenticated, connected, roomId, userId: user?.userId, isJoiningRef: isJoiningRef.current });
    
    joinRoomSession();
  }, [isAuthenticated, connected, roomId, user?.userId]); // Only depend on the actual values, not the function

  // Leave room when component unmounts
  useEffect(() => {
    return () => {
      if (currentRoom === roomId) {
        leaveRoom();
        leaveUserRoom();
      }
    };
  }, [currentRoom, roomId]); // Removed function dependencies

  // Handle mouse movement for cursor tracking
  const handleMouseMove = useCallback((e) => {
    if (workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setCursorPosition({ x, y });
      
      // Send presence update every 100ms to avoid spam
      const now = Date.now();
      if (now - lastActivityRef.current > 100) {
        sendPresenceUpdate({ x, y }, true);
        lastActivityRef.current = now;
      }
    }
  }, [sendPresenceUpdate]);

  const handleMouseLeave = useCallback(() => {
    // Use current cursor position from state
    setCursorPosition(prev => {
      sendPresenceUpdate(prev, false);
      return prev;
    });
  }, [sendPresenceUpdate]);

  // Handle presence updates
  useEffect(() => {
    console.log('🔄 Presence updates useEffect triggered');
    
    const currentWorkspace = workspaceRef.current;
    if (currentWorkspace) {
      currentWorkspace.addEventListener('mousemove', handleMouseMove);
      currentWorkspace.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (currentWorkspace) {
        currentWorkspace.removeEventListener('mousemove', handleMouseMove);
        currentWorkspace.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [handleMouseMove, handleMouseLeave]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Ctrl/Cmd + K for command palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // TODO: Implement command palette
      return;
    }

    // Ctrl/Cmd + 1-4 for tab switching
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      const tabIndex = parseInt(e.key) - 1;
      const tabs = ['code', 'notes', 'canvas', 'chat'];
      if (tabs[tabIndex]) {
        setActiveTab(tabs[tabIndex]);
      }
      return;
    }

    // Escape to leave fullscreen
    if (e.key === 'Escape' && isFullscreen) {
      setIsFullscreen(false);
      return;
    }

    // F11 for fullscreen toggle
    if (e.key === 'F11') {
      e.preventDefault();
      setIsFullscreen(!isFullscreen);
      return;
    }
  }, [isFullscreen, setActiveTab]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handle beforeunload to warn about leaving
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentRoom === roomId) {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your changes will be saved.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentRoom, roomId]);

  // Show loading state
  if (isJoining || !connected) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <LoadingSpinner size="large" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {isJoining ? 'Joining room...' : 'Connecting to server...'}
            </p>
            <span className="sr-only">
              {isJoining ? 'Joining room' : 'Connecting to server'}
            </span>
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (socketError) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connection Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {socketError}
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Show not in room state
  if (currentRoom !== roomId) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-gray-500 text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Not in Room
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You are not currently in this room.
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Main workspace content
  return (
    <Layout>
      <ErrorBoundary>
        <div 
          className={`
            min-h-screen bg-gray-50 dark:bg-gray-900
            ${isFullscreen ? 'fixed inset-0 z-50' : ''}
          `}
          ref={workspaceRef}
        >
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                {/* Room info */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate('/')}
                    className="btn btn-outline"
                    aria-label="Return to dashboard"
                  >
                    ← Back
                  </button>
                  
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {roomData?.roomName || `Room ${roomId}`}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {Object.keys(participants).length} participant{Object.keys(participants).length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center space-x-2">
                  {/* Fullscreen toggle */}
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="btn btn-outline"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isFullscreen ? '⤓' : '⤢'}
                  </button>

                  {/* Participants toggle */}
                  <button
                    onClick={() => setShowParticipants(!showParticipants)}
                    className={`btn ${showParticipants ? 'btn-primary' : 'btn-outline'}`}
                    aria-label={showParticipants ? 'Hide participants' : 'Show participants'}
                  >
                    👥 {Object.keys(participants).length}
                  </button>

                  {/* Chat toggle */}
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className={`btn ${showChat ? 'btn-primary' : 'btn-outline'}`}
                    aria-label={showChat ? 'Hide chat' : 'Show chat'}
                  >
                    💬
                  </button>

                  {/* Room info toggle */}
                  <button
                    onClick={() => setShowRoomInfo(!showRoomInfo)}
                    className={`btn ${showRoomInfo ? 'btn-primary' : 'btn-outline'}`}
                    aria-label={showRoomInfo ? 'Hide room info' : 'Show room info'}
                    title="Room sharing and information"
                  >
                    ℹ️
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main workspace */}
          <div className="flex h-[calc(100vh-4rem)]">
            {/* Left sidebar - Participants and Room Info */}
            {(showParticipants || showRoomInfo) && (
              <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                {/* Room Info */}
                {showRoomInfo && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <RoomInfo 
                      roomId={roomId} 
                      roomData={roomData} 
                      isCreator={true} // You can determine this based on your logic
                    />
                  </div>
                )}
                
                {/* Participants */}
                {showParticipants && (
                  <div className="flex-1 overflow-y-auto">
                    <ParticipantsList participants={participants} />
                  </div>
                )}
              </div>
            )}

            {/* Main content area */}
            <div className="flex-1 flex flex-col">
              {/* Tab navigation */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 px-4 sm:px-6 lg:px-8">
                  {[
                    { id: 'code', label: 'Code', icon: '💻' },
                    { id: 'notes', label: 'Notes', icon: '📝' },
                    { id: 'canvas', label: 'Canvas', icon: '🎨' },
                    { id: 'chat', label: 'Chat', icon: '💬' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        py-4 px-1 border-b-2 font-medium text-sm
                        ${activeTab === tab.id
                          ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                        }
                      `}
                      aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'code' && (
                  <CodeEditor
                    onCodeChange={sendCodeChange}
                    participants={participants}
                  />
                )}
                
                {activeTab === 'notes' && (
                  <NotesEditor
                    onNoteChange={sendNoteChange}
                    participants={participants}
                  />
                )}
                
                {activeTab === 'canvas' && (
                  <CanvasDrawing
                    onDrawingChange={sendDrawingEvent}
                    participants={participants}
                  />
                )}
                
                {activeTab === 'chat' && (
                  <ChatPanel
                    onSendMessage={sendChatMessage}
                    participants={participants}
                  />
                )}
              </div>
            </div>

            {/* Right sidebar - Chat */}
            {showChat && activeTab !== 'chat' && (
              <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
                <ChatPanel
                  onSendMessage={sendChatMessage}
                  participants={participants}
                  compact={true}
                />
              </div>
            )}
          </div>

          {/* Collaboration cursors overlay */}
          <CollaborationCursors
            participants={participants}
            currentUserId={user?.userId}
          />
        </div>
      </ErrorBoundary>
    </Layout>
  );
};

export default RoomWorkspace;
