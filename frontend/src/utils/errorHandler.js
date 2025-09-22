/**
 * Frontend Error Handling Utilities
 * 
 * Comprehensive error handling, logging, and user feedback system
 * Provides consistent error management across the entire frontend application
 */

import toast from 'react-hot-toast';

/**
 * Error types for categorization
 */
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  SOCKET: 'SOCKET_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Custom error class for frontend errors
 */
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, severity = ERROR_SEVERITY.MEDIUM, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.id = this.generateId();
  }

  generateId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Error logger for client-side logging
 */
class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 100; // Keep last 100 errors in memory
  }

  log(error, context = {}) {
    const errorEntry = {
      id: error.id || this.generateId(),
      message: error.message,
      type: error.type || ERROR_TYPES.UNKNOWN,
      severity: error.severity || ERROR_SEVERITY.MEDIUM,
      stack: error.stack,
      timestamp: error.timestamp || new Date().toISOString(),
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.errors.push(errorEntry);

    // Keep only the last maxErrors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorEntry);
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(errorEntry);
    }
  }

  generateId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sendToLoggingService(errorEntry) {
    // In a real application, you would send this to your logging service
    // For now, we'll just store it in localStorage for debugging
    try {
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorEntry);
      localStorage.setItem('errorLogs', JSON.stringify(existingLogs.slice(-50))); // Keep last 50
    } catch (e) {
      console.error('Failed to store error log:', e);
    }
  }

  getErrors() {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

// Global error logger instance
export const errorLogger = new ErrorLogger();

/**
 * Error handler for different error types
 */
export class ErrorHandler {
  constructor() {
    this.setupGlobalErrorHandlers();
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new AppError(
          event.reason?.message || 'Unhandled promise rejection',
          ERROR_TYPES.CLIENT,
          ERROR_SEVERITY.HIGH,
          { reason: event.reason }
        )
      );
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(
        new AppError(
          event.message || 'JavaScript error',
          ERROR_TYPES.CLIENT,
          ERROR_SEVERITY.HIGH,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          }
        )
      );
    });
  }

  /**
   * Handle different types of errors
   */
  handleError(error, context = {}) {
    // Log the error
    errorLogger.log(error, context);

    // Show user feedback based on error severity
    this.showUserFeedback(error);

    // Handle specific error types
    switch (error.type) {
      case ERROR_TYPES.NETWORK:
        this.handleNetworkError(error);
        break;
      case ERROR_TYPES.AUTHENTICATION:
        this.handleAuthenticationError(error);
        break;
      case ERROR_TYPES.SOCKET:
        this.handleSocketError(error);
        break;
      default:
        this.handleGenericError(error);
    }
  }

  /**
   * Show user feedback based on error severity
   */
  showUserFeedback(error) {
    const { severity, message } = error;

    switch (severity) {
      case ERROR_SEVERITY.LOW:
        toast(message, { duration: 3000 });
        break;
      case ERROR_SEVERITY.MEDIUM:
        toast.error(message, { duration: 5000 });
        break;
      case ERROR_SEVERITY.HIGH:
        toast.error(message, { duration: 8000 });
        break;
      case ERROR_SEVERITY.CRITICAL:
        toast.error(message, { duration: 10000 });
        // Could trigger a modal or redirect for critical errors
        break;
    }
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error) {
    // Check if it's a connection issue
    if (error.message.includes('fetch') || error.message.includes('network')) {
      toast.error('Network connection issue. Please check your internet connection.');
    } else {
      toast.error('Server communication error. Please try again.');
    }
  }

  /**
   * Handle authentication errors
   */
  handleAuthenticationError(error) {
    toast.error('Authentication required. Please log in again.');
    // Could redirect to login page
    // window.location.href = '/login';
  }

  /**
   * Handle socket errors
   */
  handleSocketError(error) {
    toast.error('Connection lost. Attempting to reconnect...');
    // Socket reconnection logic would be handled by the socket context
  }

  /**
   * Handle generic errors
   */
  handleGenericError(error) {
    // Generic error handling
    console.error('Generic error:', error);
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();

/**
 * API error handler for fetch requests
 */
export function handleApiError(response, context = {}) {
  let error;

  switch (response.status) {
    case 400:
      error = new AppError(
        'Invalid request data',
        ERROR_TYPES.VALIDATION,
        ERROR_SEVERITY.MEDIUM,
        { status: response.status, context }
      );
      break;
    case 401:
      error = new AppError(
        'Authentication required',
        ERROR_TYPES.AUTHENTICATION,
        ERROR_SEVERITY.HIGH,
        { status: response.status, context }
      );
      break;
    case 403:
      error = new AppError(
        'Access denied',
        ERROR_TYPES.AUTHORIZATION,
        ERROR_SEVERITY.HIGH,
        { status: response.status, context }
      );
      break;
    case 404:
      error = new AppError(
        'Resource not found',
        ERROR_TYPES.NOT_FOUND,
        ERROR_SEVERITY.MEDIUM,
        { status: response.status, context }
      );
      break;
    case 429:
      error = new AppError(
        'Too many requests. Please slow down.',
        ERROR_TYPES.SERVER,
        ERROR_SEVERITY.MEDIUM,
        { status: response.status, context }
      );
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      error = new AppError(
        'Server error. Please try again later.',
        ERROR_TYPES.SERVER,
        ERROR_SEVERITY.HIGH,
        { status: response.status, context }
      );
      break;
    default:
      error = new AppError(
        `Unexpected error (${response.status})`,
        ERROR_TYPES.UNKNOWN,
        ERROR_SEVERITY.MEDIUM,
        { status: response.status, context }
      );
  }

  return error;
}

/**
 * Socket error handler
 */
export function handleSocketError(error, context = {}) {
  const socketError = new AppError(
    error.message || 'Socket connection error',
    ERROR_TYPES.SOCKET,
    ERROR_SEVERITY.MEDIUM,
    { originalError: error, context }
  );

  errorHandler.handleError(socketError, context);
  return socketError;
}

/**
 * Validation error handler
 */
export function handleValidationError(errors, context = {}) {
  const validationError = new AppError(
    'Validation failed',
    ERROR_TYPES.VALIDATION,
    ERROR_SEVERITY.LOW,
    { validationErrors: errors, context }
  );

  errorHandler.handleError(validationError, context);
  return validationError;
}

/**
 * Async error wrapper for React components
 */
export function withErrorHandling(WrappedComponent) {
  return class extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      const appError = new AppError(
        error.message,
        ERROR_TYPES.CLIENT,
        ERROR_SEVERITY.HIGH,
        { componentStack: errorInfo.componentStack }
      );

      errorHandler.handleError(appError, {
        component: WrappedComponent.name,
        props: this.props,
      });
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="error-boundary">
            <h2>Something went wrong</h2>
            <p>We're sorry, but something unexpected happened.</p>
            <button onClick={() => this.setState({ hasError: false, error: null })}>
              Try again
            </button>
          </div>
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  };
}

/**
 * Hook for error handling in functional components
 */
export function useErrorHandler() {
  const handleError = React.useCallback((error, context = {}) => {
    errorHandler.handleError(error, context);
  }, []);

  const handleApiError = React.useCallback((response, context = {}) => {
    const error = handleApiError(response, context);
    errorHandler.handleError(error, context);
    return error;
  }, []);

  const handleSocketError = React.useCallback((error, context = {}) => {
    const socketError = handleSocketError(error, context);
    return socketError;
  }, []);

  return {
    handleError,
    handleApiError,
    handleSocketError,
    ERROR_TYPES,
    ERROR_SEVERITY,
  };
}

/**
 * Utility functions
 */
export const errorUtils = {
  /**
   * Check if error is of specific type
   */
  isErrorType: (error, type) => {
    return error instanceof AppError && error.type === type;
  },

  /**
   * Check if error is of specific severity
   */
  isErrorSeverity: (error, severity) => {
    return error instanceof AppError && error.severity === severity;
  },

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage: (error) => {
    if (error instanceof AppError) {
      return error.message;
    }

    // Handle different error types
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'Network connection issue. Please check your internet connection.';
    }

    if (error.name === 'ChunkLoadError') {
      return 'Application update detected. Please refresh the page.';
    }

    return 'An unexpected error occurred. Please try again.';
  },

  /**
   * Retry function with exponential backoff
   */
  retryWithBackoff: async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },
};

export default {
  AppError,
  ErrorHandler,
  errorHandler,
  errorLogger,
  handleApiError,
  handleSocketError,
  handleValidationError,
  withErrorHandling,
  useErrorHandler,
  errorUtils,
  ERROR_TYPES,
  ERROR_SEVERITY,
};
