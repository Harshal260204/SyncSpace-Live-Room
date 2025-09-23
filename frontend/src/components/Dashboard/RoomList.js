/**
 * Room List Component
 * 
 * Displays a list of available rooms with:
 * - Search and filtering capabilities
 * - Room creation and joining
 * - Real-time updates
 * - Accessibility features
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { roomAPI } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';

/**
 * Room List Component
 * 
 * Displays available rooms with search and filtering
 * Includes accessibility features and real-time updates
 */
const RoomList = ({ onJoinRoom }) => {
  console.log('🔄 RoomList component rendered');
  const { connected } = useSocket();
  const { announce, screenReader } = useAccessibility();
  
  // Local state
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'recent'

  // Fetch rooms from API
  const fetchRooms = useCallback(async () => {
    console.log('🔄 fetchRooms called - this should only happen once on mount');
    setLoading(true);
    setError(null);
    
    try {
      console.log('📡 Fetching rooms from API');
      const data = await roomAPI.getRooms();
      console.log('✅ Rooms data received:', data);
      setRooms(data.rooms || []);
      
      // Use screenReader and announce directly without dependencies
      if (screenReader) {
        announce(`Loaded ${data.rooms?.length || 0} rooms`, 'polite');
      }
      
    } catch (err) {
      console.error('❌ Error fetching rooms:', err);
      setError(err.message);
      
      if (screenReader) {
        announce('Failed to load rooms. Please try again.', 'assertive');
      }
    } finally {
      setLoading(false);
    }
  }, []); // Remove dependencies to prevent infinite loops

  // Fetch rooms on component mount
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Filter rooms based on search term and filter
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         room.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && room.currentParticipants > 0) ||
                         (filter === 'recent' && room.lastActivity > new Date(Date.now() - 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesFilter;
  });

  // Handle room join
  const handleJoinRoom = (roomId) => {
    if (onJoinRoom) {
      onJoinRoom(roomId);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };


  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="medium" message="Loading rooms..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-4xl mb-4" role="img" aria-label="Error">
          ⚠️
        </div>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchRooms}
          className="btn btn-primary"
          aria-label="Retry loading rooms"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Show empty state
  if (filteredRooms.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-4xl mb-4" role="img" aria-label="No rooms">
          🏠
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {searchTerm || filter !== 'all' 
            ? 'No rooms match your search criteria'
            : 'No rooms available at the moment'
          }
        </p>
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="btn btn-outline"
            aria-label="Clear search"
          >
            Clear Search
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <label htmlFor="room-search" className="sr-only">
            Search rooms
          </label>
          <input
            id="room-search"
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search rooms..."
            className="input w-full"
            aria-describedby="search-help"
          />
          <p id="search-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Search by room name or description
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="sm:w-48">
          <label htmlFor="room-filter" className="sr-only">
            Filter rooms
          </label>
          <select
            id="room-filter"
            value={filter}
            onChange={handleFilterChange}
            className="input w-full"
            aria-describedby="filter-help"
          >
            <option value="all">All Rooms</option>
            <option value="active">Active Rooms</option>
            <option value="recent">Recent Rooms</option>
          </select>
          <p id="filter-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Filter by room status
          </p>
        </div>
      </div>

      {/* Room List */}
      <div 
        className="space-y-3"
        role="list"
        aria-label="Available rooms"
      >
        {filteredRooms.map((room) => (
          <RoomCard
            key={room.roomId}
            room={room}
            onJoin={() => handleJoinRoom(room.roomId)}
          />
        ))}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Showing {filteredRooms.length} of {rooms.length} rooms
      </div>
    </div>
  );
};

/**
 * Room Card Component
 * 
 * Individual room card with room information and join button
 * Includes accessibility features and status indicators
 */
const RoomCard = ({ room, onJoin }) => {
  const { announce, screenReader } = useAccessibility();
  
  // Handle join button click
  const handleJoin = () => {
    if (onJoin) {
      onJoin();
      
      if (screenReader) {
        announce(`Joining room ${room.roomName}`, 'polite');
      }
    }
  };

  // Format last activity time
  const formatLastActivity = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Get room status
  const getRoomStatus = () => {
    if (room.currentParticipants === 0) return 'Empty';
    if (room.currentParticipants >= room.maxParticipants) return 'Full';
    return `${room.currentParticipants}/${room.maxParticipants} participants`;
  };

  // Get room status color
  const getStatusColor = () => {
    if (room.currentParticipants === 0) return 'text-gray-500';
    if (room.currentParticipants >= room.maxParticipants) return 'text-red-500';
    return 'text-green-500';
  };

  return (
    <div 
      className="card p-4 hover:shadow-md transition-shadow duration-200"
      role="listitem"
    >
      <div className="flex items-start justify-between">
        {/* Room Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
            {room.roomName}
          </h3>
          
          {room.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {room.description}
            </p>
          )}
          
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span className={getStatusColor()}>
              {getRoomStatus()}
            </span>
            <span>
              {formatLastActivity(room.lastActivity)}
            </span>
            {room.settings && (
              <div className="flex items-center space-x-1">
                {room.settings.allowCodeEditing && (
                  <span title="Code editing enabled" aria-label="Code editing enabled">
                    💻
                  </span>
                )}
                {room.settings.allowNotesEditing && (
                  <span title="Notes editing enabled" aria-label="Notes editing enabled">
                    📝
                  </span>
                )}
                {room.settings.allowCanvasDrawing && (
                  <span title="Canvas drawing enabled" aria-label="Canvas drawing enabled">
                    🎨
                  </span>
                )}
                {room.settings.allowChat && (
                  <span title="Chat enabled" aria-label="Chat enabled">
                    💬
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Join Button */}
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleJoin}
            disabled={room.currentParticipants >= room.maxParticipants}
            className={`
              btn px-4 py-2 text-sm
              ${room.currentParticipants >= room.maxParticipants
                ? 'btn-outline opacity-50 cursor-not-allowed'
                : 'btn-primary'
              }
            `}
            aria-label={`Join room ${room.roomName}`}
            aria-describedby={`room-${room.roomId}-status`}
          >
            {room.currentParticipants >= room.maxParticipants ? 'Full' : 'Join'}
          </button>
          
          <div id={`room-${room.roomId}-status`} className="sr-only">
            {room.currentParticipants >= room.maxParticipants
              ? 'Room is at maximum capacity'
              : `Join room with ${room.currentParticipants} participants`
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomList;
