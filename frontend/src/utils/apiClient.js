/**
 * API Client
 * 
 * Centralized HTTP client with comprehensive error handling,
 * request/response interceptors, and automatic retry logic
 */

import { handleApiError, errorUtils, ERROR_TYPES } from './errorHandler';

/**
 * API Client Configuration
 */
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * Request interceptor type
 */
class RequestInterceptor {
  constructor() {
    this.interceptors = [];
  }

  use(onFulfilled, onRejected) {
    this.interceptors.push({ onFulfilled, onRejected });
  }

  async execute(config) {
    let processedConfig = config;
    
    for (const interceptor of this.interceptors) {
      try {
        if (interceptor.onFulfilled) {
          processedConfig = await interceptor.onFulfilled(processedConfig);
        }
      } catch (error) {
        if (interceptor.onRejected) {
          await interceptor.onRejected(error);
        }
        throw error;
      }
    }
    
    return processedConfig;
  }
}

/**
 * Response interceptor type
 */
class ResponseInterceptor {
  constructor() {
    this.interceptors = [];
  }

  use(onFulfilled, onRejected) {
    this.interceptors.push({ onFulfilled, onRejected });
  }

  async execute(response) {
    let processedResponse = response;
    
    for (const interceptor of this.interceptors) {
      try {
        if (interceptor.onFulfilled) {
          processedResponse = await interceptor.onFulfilled(processedResponse);
        }
      } catch (error) {
        if (interceptor.onRejected) {
          await interceptor.onRejected(error);
        }
        throw error;
      }
    }
    
    return processedResponse;
  }
}

/**
 * Main API Client Class
 */
class ApiClient {
  constructor(config = {}) {
    this.config = { ...API_CONFIG, ...config };
    this.requestInterceptors = new RequestInterceptor();
    this.responseInterceptors = new ResponseInterceptor();
    this.setupDefaultInterceptors();
  }

  /**
   * Setup default interceptors
   */
  setupDefaultInterceptors() {
    // Request interceptor for authentication
    this.requestInterceptors.use(
      (config) => {
        // Add authentication token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add request timestamp
        config.metadata = {
          ...config.metadata,
          timestamp: Date.now(),
        };
        
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        throw error;
      }
    );

    // Response interceptor for error handling
    this.responseInterceptors.use(
      (response) => {
        // Log successful requests in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.data);
        }
        return response;
      },
      async (error) => {
        // Handle response errors
        if (error.response) {
          const apiError = handleApiError(error.response, {
            url: error.config?.url,
            method: error.config?.method,
            data: error.config?.data,
          });
          throw apiError;
        } else if (error.request) {
          // Network error
          throw new Error('Network error. Please check your connection.');
        } else {
          // Other error
          throw error;
        }
      }
    );
  }

  /**
   * Create request configuration
   */
  createRequestConfig(method, url, data = null, options = {}) {
    const config = {
      method: method.toUpperCase(),
      url: url.startsWith('http') ? url : `${this.config.baseURL}${url}`,
      headers: { ...this.config.headers, ...options.headers },
      timeout: options.timeout || this.config.timeout,
      metadata: options.metadata || {},
    };

    if (data) {
      if (method.toLowerCase() === 'get') {
        // For GET requests, append data as query parameters
        const params = new URLSearchParams(data);
        config.url += `?${params.toString()}`;
      } else {
        // For other methods, include data in body
        config.data = data;
      }
    }

    return config;
  }

  /**
   * Execute HTTP request with retry logic
   */
  async executeRequest(config) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        // Apply request interceptors
        const processedConfig = await this.requestInterceptors.execute(config);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), processedConfig.timeout);
        
        // Execute request
        const response = await fetch(processedConfig.url, {
          method: processedConfig.method,
          headers: processedConfig.headers,
          body: processedConfig.data ? JSON.stringify(processedConfig.data) : undefined,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Parse response
        const responseData = await this.parseResponse(response);
        
        const responseConfig = {
          ...processedConfig,
          status: response.status,
          statusText: response.statusText,
        };
        
        const fullResponse = {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          config: responseConfig,
        };
        
        // Apply response interceptors
        return await this.responseInterceptors.execute(fullResponse);
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error, attempt)) {
          throw error;
        }
        
        // Wait before retry
        if (attempt < this.config.retryAttempts) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Check if request should not be retried
   */
  shouldNotRetry(error, attempt) {
    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
      return true;
    }
    
    // Don't retry on authentication errors
    if (error.response?.status === 401 || error.response?.status === 403) {
      return true;
    }
    
    // Don't retry on validation errors
    if (error.type === ERROR_TYPES.VALIDATION) {
      return true;
    }
    
    return false;
  }

  /**
   * Parse response based on content type
   */
  async parseResponse(response) {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else if (contentType && contentType.includes('text/')) {
      return await response.text();
    } else {
      return await response.blob();
    }
  }

  /**
   * HTTP Methods
   */
  async get(url, params = {}, options = {}) {
    const config = this.createRequestConfig('GET', url, params, options);
    const response = await this.executeRequest(config);
    return response.data;
  }

  async post(url, data = {}, options = {}) {
    const config = this.createRequestConfig('POST', url, data, options);
    const response = await this.executeRequest(config);
    return response.data;
  }

  async put(url, data = {}, options = {}) {
    const config = this.createRequestConfig('PUT', url, data, options);
    const response = await this.executeRequest(config);
    return response.data;
  }

  async patch(url, data = {}, options = {}) {
    const config = this.createRequestConfig('PATCH', url, data, options);
    const response = await this.executeRequest(config);
    return response.data;
  }

  async delete(url, options = {}) {
    const config = this.createRequestConfig('DELETE', url, null, options);
    const response = await this.executeRequest(config);
    return response.data;
  }

  /**
   * Upload file
   */
  async uploadFile(url, file, options = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    const config = {
      method: 'POST',
      url: url.startsWith('http') ? url : `${this.config.baseURL}${url}`,
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
        ...options.headers,
      },
      data: formData,
      timeout: options.timeout || 60000, // 60 seconds for file uploads
      metadata: options.metadata || {},
    };
    
    // Remove Content-Type from headers for FormData
    delete config.headers['Content-Type'];
    
    const response = await this.executeRequest(config);
    return response.data;
  }

  /**
   * Download file
   */
  async downloadFile(url, options = {}) {
    const config = this.createRequestConfig('GET', url, null, {
      ...options,
      headers: {
        ...options.headers,
        'Accept': 'application/octet-stream',
      },
    });
    
    const response = await this.executeRequest(config);
    return response.data;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    localStorage.setItem('authToken', token);
  }

  /**
   * Remove authentication token
   */
  removeAuthToken() {
    localStorage.removeItem('authToken');
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    return localStorage.getItem('authToken');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.getAuthToken();
  }
}

// Create default API client instance
export const apiClient = new ApiClient();

// Export the class for custom instances
export { ApiClient };

// Convenience methods using the default instance
export const api = {
  get: (url, params, options) => apiClient.get(url, params, options),
  post: (url, data, options) => apiClient.post(url, data, options),
  put: (url, data, options) => apiClient.put(url, data, options),
  patch: (url, data, options) => apiClient.patch(url, data, options),
  delete: (url, options) => apiClient.delete(url, options),
  uploadFile: (url, file, options) => apiClient.uploadFile(url, file, options),
  downloadFile: (url, options) => apiClient.downloadFile(url, options),
  setAuthToken: (token) => apiClient.setAuthToken(token),
  removeAuthToken: () => apiClient.removeAuthToken(),
  getAuthToken: () => apiClient.getAuthToken(),
  isAuthenticated: () => apiClient.isAuthenticated(),
};

export default api;
