/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the component tree
 * Displays fallback UI and logs errors for debugging
 * Includes accessibility features for error reporting
 */

import React from 'react';
import { useAccessibility } from '../../contexts/AccessibilityContext';

/**
 * Error Boundary Class Component
 * 
 * Catches errors in child components and displays fallback UI
 * Provides accessible error reporting and recovery options
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Static method to update state when an error occurs
   * 
   * @param {Error} error - The error that occurred
   * @returns {Object} New state with error information
   */
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called when an error occurs
   * 
   * @param {Error} error - The error that occurred
   * @param {Object} errorInfo - Additional error information
   */
  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Update state with error information
    this.setState({
      error,
      errorInfo,
    });

    // Log error to external service if available
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send error to logging service
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle error recovery
   */
  handleRecovery = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Handle page refresh
   */
  handleRefresh = () => {
    window.location.reload();
  };

  /**
   * Render method
   * 
   * @returns {JSX.Element} Error boundary content
   */
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRecovery={this.handleRecovery}
          onRefresh={this.handleRefresh}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback Component
 * 
 * Displays error information and recovery options
 * Includes accessibility features for error reporting
 */
const ErrorFallback = ({ error, errorInfo, onRecovery, onRefresh }) => {
  const { announce, screenReader } = useAccessibility();

  // Announce error to screen readers
  React.useEffect(() => {
    if (screenReader) {
      announce('An error occurred. Please try refreshing the page or contact support if the problem persists.', 'assertive');
    }
  }, [screenReader, announce]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {/* Error icon */}
        <div className="text-6xl mb-4" role="img" aria-label="Error occurred">
          ⚠️
        </div>
        
        {/* Error message */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          An unexpected error occurred. We're sorry for the inconvenience.
        </p>

        {/* Error details for development */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Error Details (Development)
            </summary>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-xs text-red-800 dark:text-red-200 overflow-auto max-h-40">
              <p className="font-medium mb-2">Error:</p>
              <pre className="whitespace-pre-wrap mb-3">{error.message}</pre>
              
              {errorInfo && (
                <>
                  <p className="font-medium mb-2">Component Stack:</p>
                  <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                </>
              )}
            </div>
          </details>
        )}

        {/* Recovery options */}
        <div className="space-y-3">
          <button
            onClick={onRecovery}
            className="btn btn-primary w-full"
            aria-label="Try to recover from error"
          >
            Try Again
          </button>
          
          <button
            onClick={onRefresh}
            className="btn btn-outline w-full"
            aria-label="Refresh the page"
          >
            Refresh Page
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="btn btn-outline w-full"
            aria-label="Go back to previous page"
          >
            Go Back
          </button>
        </div>

        {/* Help text */}
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>
            If this problem persists, please contact support with the error details above.
          </p>
        </div>

        {/* Accessibility information */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Accessibility Note:</strong> If you're using a screen reader, 
            the error has been announced. You can use the recovery options above 
            or refresh the page to continue.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
