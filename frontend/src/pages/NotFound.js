/**
 * 404 Not Found Page Component
 * 
 * Displays when a route is not found
 * Includes accessibility features and navigation options
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout/Layout';

/**
 * 404 Not Found Page Component
 * 
 * Provides a user-friendly 404 error page with navigation options
 * Includes accessibility features for screen readers
 */
const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          {/* 404 Icon */}
          <div className="text-6xl mb-4" role="img" aria-label="Page not found">
            🔍
          </div>
          
          {/* Error message */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Page Not Found
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          {/* Action buttons */}
          <div className="space-y-4">
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary w-full"
              aria-label="Return to dashboard"
            >
              Return to Dashboard
            </button>
            
            <button
              onClick={() => navigate(-1)}
              className="btn btn-outline w-full"
              aria-label="Go back to previous page"
            >
              Go Back
            </button>
          </div>
          
          {/* Help text */}
          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>
              If you believe this is an error, please check the URL or contact support.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
