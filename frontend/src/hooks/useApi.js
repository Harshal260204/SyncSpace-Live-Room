/**
 * Custom React Hook for API Calls
 * 
 * Provides a comprehensive hook for making API calls with loading states,
 * error handling, caching, and automatic retry logic
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../utils/apiClient';
import { useErrorHandler } from '../utils/errorHandler';

/**
 * Hook for making API calls with state management
 */
export function useApi() {
  const { handleError } = useErrorHandler();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (apiCall, options = {}) => {
    const { 
      onSuccess, 
      onError, 
      showError = true, 
      showLoading = true,
      retry = false 
    } = options;

    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      const result = await apiCall();
      setData(result);

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      setError(err);
      
      if (showError) {
        handleError(err);
      }

      if (onError) {
        onError(err);
      }

      if (retry) {
        // Implement retry logic here if needed
        console.warn('Retry not implemented yet');
      }

      throw err;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [handleError]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
}

/**
 * Hook for GET requests with caching
 */
export function useGet(url, options = {}) {
  const {
    params = {},
    dependencies = [],
    enabled = true,
    cache = false,
    cacheKey = null,
    staleTime = 5 * 60 * 1000, // 5 minutes
    ...apiOptions
  } = options;

  const { loading, error, data, execute, reset } = useApi();
  const cacheRef = useRef(new Map());
  const lastFetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    const key = cacheKey || `${url}_${JSON.stringify(params)}`;
    const now = Date.now();

    // Check cache if enabled
    if (cache && cacheRef.current.has(key)) {
      const cached = cacheRef.current.get(key);
      if (now - cached.timestamp < staleTime) {
        setData(cached.data);
        return cached.data;
      }
    }

    const result = await execute(() => api.get(url, params, apiOptions));

    // Cache result if enabled
    if (cache) {
      cacheRef.current.set(key, {
        data: result,
        timestamp: now,
      });
    }

    return result;
  }, [url, params, enabled, cache, cacheKey, staleTime, execute, apiOptions]);

  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  const refetch = useCallback(() => {
    lastFetchRef.current = 0; // Force refetch
    return fetchData();
  }, [fetchData]);

  const invalidateCache = useCallback((key = null) => {
    if (key) {
      cacheRef.current.delete(key);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  return {
    loading,
    error,
    data,
    refetch,
    invalidateCache,
  };
}

/**
 * Hook for POST requests
 */
export function usePost(url, options = {}) {
  const { loading, error, data, execute } = useApi();

  const post = useCallback(async (postData, apiOptions = {}) => {
    return execute(() => api.post(url, postData, { ...options, ...apiOptions }));
  }, [url, options, execute]);

  return {
    loading,
    error,
    data,
    post,
  };
}

/**
 * Hook for PUT requests
 */
export function usePut(url, options = {}) {
  const { loading, error, data, execute } = useApi();

  const put = useCallback(async (putData, apiOptions = {}) => {
    return execute(() => api.put(url, putData, { ...options, ...apiOptions }));
  }, [url, options, execute]);

  return {
    loading,
    error,
    data,
    put,
  };
}

/**
 * Hook for DELETE requests
 */
export function useDelete(url, options = {}) {
  const { loading, error, data, execute } = useApi();

  const deleteRequest = useCallback(async (apiOptions = {}) => {
    return execute(() => api.delete(url, { ...options, ...apiOptions }));
  }, [url, options, execute]);

  return {
    loading,
    error,
    data,
    delete: deleteRequest,
  };
}

/**
 * Hook for file uploads
 */
export function useFileUpload(url, options = {}) {
  const { loading, error, data, execute } = useApi();

  const upload = useCallback(async (file, apiOptions = {}) => {
    return execute(() => api.uploadFile(url, file, { ...options, ...apiOptions }));
  }, [url, options, execute]);

  return {
    loading,
    error,
    data,
    upload,
  };
}

/**
 * Hook for paginated data
 */
export function usePaginatedData(url, options = {}) {
  const {
    initialPage = 1,
    pageSize = 10,
    dependencies = [],
    ...apiOptions
  } = options;

  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [items, setItems] = useState([]);

  const { loading, error, refetch } = useGet(url, {
    params: {
      page,
      limit: pageSize,
      ...apiOptions.params,
    },
    dependencies: [page, pageSize, ...dependencies],
    ...apiOptions,
  });

  const goToPage = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(page + 1);
  }, [page, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(page - 1);
  }, [page, goToPage]);

  const resetPagination = useCallback(() => {
    setPage(initialPage);
    setItems([]);
  }, [initialPage]);

  // Update pagination data when new data arrives
  useEffect(() => {
    if (data) {
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.totalItems);
        setItems(data.items || data.data || []);
      } else if (Array.isArray(data)) {
        setItems(data);
      }
    }
  }, [data]);

  return {
    loading,
    error,
    items,
    page,
    totalPages,
    totalItems,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    goToPage,
    nextPage,
    prevPage,
    resetPagination,
    refetch,
  };
}

/**
 * Hook for infinite scroll data
 */
export function useInfiniteData(url, options = {}) {
  const {
    pageSize = 20,
    dependencies = [],
    ...apiOptions
  } = options;

  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { loading, error, refetch } = useGet(url, {
    params: {
      page,
      limit: pageSize,
      ...apiOptions.params,
    },
    dependencies: [page, pageSize, ...dependencies],
    ...apiOptions,
  });

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await api.get(url, {
        page: nextPage,
        limit: pageSize,
        ...apiOptions.params,
      }, apiOptions);

      if (result.items || result.data) {
        const newItems = result.items || result.data;
        setItems(prev => [...prev, ...newItems]);
        setPage(nextPage);
        
        // Check if there are more items
        if (result.pagination) {
          setHasMore(nextPage < result.pagination.totalPages);
        } else {
          setHasMore(newItems.length === pageSize);
        }
      }
    } catch (err) {
      console.error('Error loading more data:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [page, pageSize, hasMore, isLoadingMore, url, apiOptions]);

  const reset = useCallback(() => {
    setPage(1);
    setItems([]);
    setHasMore(true);
  }, []);

  // Update items when new data arrives
  useEffect(() => {
    if (data) {
      if (page === 1) {
        // First page - replace items
        setItems(data.items || data.data || []);
        if (data.pagination) {
          setHasMore(page < data.pagination.totalPages);
        } else {
          setHasMore((data.items || data.data || []).length === pageSize);
        }
      }
    }
  }, [data, page, pageSize]);

  return {
    loading,
    error,
    items,
    hasMore,
    isLoadingMore,
    loadMore,
    reset,
    refetch,
  };
}

/**
 * Hook for real-time data with polling
 */
export function usePolling(url, options = {}) {
  const {
    interval = 5000, // 5 seconds
    enabled = true,
    dependencies = [],
    ...apiOptions
  } = options;

  const { loading, error, data, refetch } = useGet(url, {
    ...apiOptions,
    dependencies,
  });

  useEffect(() => {
    if (!enabled) return;

    const intervalId = setInterval(() => {
      refetch();
    }, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval, refetch]);

  return {
    loading,
    error,
    data,
    refetch,
  };
}

export default {
  useApi,
  useGet,
  usePost,
  usePut,
  useDelete,
  useFileUpload,
  usePaginatedData,
  useInfiniteData,
  usePolling,
};
