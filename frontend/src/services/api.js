/**
 * API Service
 * 
 * Centralized API service for making HTTP requests to the backend
 * Handles room creation, fetching, and other API operations
 */

const API_BASE_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

/**
 * Generic API request handler with error handling
 */
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const config = { ...defaultOptions, ...options };
  
  try {
    console.log(`Making API request to: ${url}`);
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${url}:`, error);
    throw error;
  }
};

/**
 * Room API methods
 */
export const roomAPI = {
  /**
   * Create a new room
   */
  createRoom: async (roomData) => {
    return apiRequest('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  },
  
  /**
   * Get list of rooms
   */
  getRooms: async (params = {}) => {
    const queryParams = new URLSearchParams(params);
    const endpoint = queryParams.toString() ? `/api/rooms?${queryParams}` : '/api/rooms';
    return apiRequest(endpoint);
  },
  
  /**
   * Get specific room by ID
   */
  getRoom: async (roomId) => {
    return apiRequest(`/api/rooms/${roomId}`);
  },
  
  /**
   * Update room settings
   */
  updateRoom: async (roomId, roomData) => {
    return apiRequest(`/api/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
  },
  
  /**
   * Delete/deactivate room
   */
  deleteRoom: async (roomId) => {
    return apiRequest(`/api/rooms/${roomId}`, {
      method: 'DELETE',
    });
  },
  
  /**
   * Get room participants
   */
  getRoomParticipants: async (roomId) => {
    return apiRequest(`/api/rooms/${roomId}/participants`);
  },
  
  /**
   * Get room chat history
   */
  getRoomChat: async (roomId, limit = 50) => {
    return apiRequest(`/api/rooms/${roomId}/chat?limit=${limit}`);
  },
};

/**
 * User API methods
 */
export const userAPI = {
  /**
   * Create a new user
   */
  createUser: async (userData) => {
    return apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  /**
   * Get user by ID
   */
  getUser: async (userId) => {
    return apiRequest(`/api/users/${userId}`);
  },
  
  /**
   * Update user preferences
   */
  updateUser: async (userId, userData) => {
    return apiRequest(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },
};

/**
 * Health check
 */
export const healthCheck = async () => {
  return apiRequest('/health');
};

/**
 * Check if backend is available
 */
export const checkBackendHealth = async () => {
  try {
    const health = await healthCheck();
    return { available: true, health };
  } catch (error) {
    console.error('Backend health check failed:', error);
    return { available: false, error: error.message };
  }
};

const apiService = {
  roomAPI,
  userAPI,
  healthCheck,
  checkBackendHealth,
};

export default apiService;
