import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { executeCQL } from '../services/api';

/**
 * Enhanced CQL Execution Hook
 * Provides comprehensive CQL execution with backend integration
 */
export function useCQLExecution(options = {}) {
  const queryClient = useQueryClient();
  const [executionHistory, setExecutionHistory] = useState([]);
  const executionCount = useRef(0);

  // Main execution mutation
  const mutation = useMutation({
    mutationFn: async ({ code, ...executeOptions }) => {
      const startTime = Date.now();
      executionCount.current += 1;
      
      const result = await executeCQL(code, executeOptions);
      
      const executionResult = {
        id: executionCount.current,
        code,
        result,
        timestamp: new Date().toISOString(),
        executionTime: Date.now() - startTime,
        success: !result.some?.(r => r.error || r['translator-error'])
      };

      // Add to history
      setExecutionHistory(prev => [executionResult, ...prev.slice(0, 9)]); // Keep last 10

      return executionResult;
    },
    onSuccess: (executionResult, { code }) => {
      // Cache the result for potential retry or reference  
      queryClient.setQueryData(['cql-result', code], executionResult);
      options?.onSuccess?.(executionResult);
    },
    onError: (error, { code }) => {
      console.error('CQL execution failed:', error);
      
      // Add error to history
      const errorResult = {
        id: executionCount.current,
        code,
        error: error.message,
        timestamp: new Date().toISOString(),
        success: false
      };
      
      setExecutionHistory(prev => [errorResult, ...prev.slice(0, 9)]);
      options?.onError?.(error);
    },
  });

  // Execute CQL with enhanced options
  const execute = useCallback((code, executeOptions = {}) => {
    if (!code?.trim()) {
      throw new Error('CQL code is required');
    }

    return mutation.mutateAsync({ 
      code: code.trim(),
      ...executeOptions 
    });
  }, [mutation]);

  // Quick execution for simple cases
  const executeSync = useCallback(async (code) => {
    try {
      const result = await execute(code);
      return {
        success: result.success,
        data: result.result,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }, [execute]);

  // Get formatted results for display
  const getFormattedResults = useCallback((results) => {
    if (!results || !Array.isArray(results)) return [];

    return results.map(result => ({
      ...result,
      hasError: !!(result.error || result['translator-error']),
      displayResult: typeof result.result === 'object' ? 
        JSON.stringify(result.result, null, 2) : 
        result.result,
      formattedResult: formatCQLResult(result.result)
    }));
  }, []);

  // Clear execution history
  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
    executionCount.current = 0;
  }, []);

  // Reset mutation state (clears lastResult and error)
  const resetState = useCallback(() => {
    mutation.reset();
  }, [mutation]);

  return {
    // Execution functions
    execute,
    executeSync,
    
    // State
    isExecuting: mutation.isPending,
    error: mutation.error,
    lastResult: mutation.data,
    
    // History
    executionHistory,
    clearHistory,
    resetState,
    
    // Utilities
    getFormattedResults,
    
    // Raw mutation for advanced use
    mutation
  };
}

/**
 * Hook for getting cached CQL execution results
 */
export function useLastCQLResult(code) {
  const queryClient = useQueryClient();
  
  if (!code) return undefined;
  
  return queryClient.getQueryData(['cql-result', code]);
}

/**
 * Hook for CQL service status monitoring
 */
export function useCQLServiceStatus() {
  return useQuery({
    queryKey: ['cql-service-status'],
    queryFn: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_CQL_EXECUTION_SERVICE_URL}/health`);
        const data = await response.json();
        
        return {
          status: response.ok ? 'healthy' : 'unhealthy',
          responseTime: data.responseTime || 0,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return {
          status: 'offline',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    },
    refetchInterval: 30000, // Check every 30 seconds
    retry: 1
  });
}

// Helper function to format CQL results for display
function formatCQLResult(result) {
  if (result === null || result === undefined) {
    return 'null';
  }
  
  if (typeof result === 'boolean') {
    return result.toString();
  }
  
  if (typeof result === 'string') {
    return `"${result}"`;
  }
  
  if (typeof result === 'number') {
    return result.toString();
  }
  
  if (Array.isArray(result)) {
    return `[${result.length} item${result.length !== 1 ? 's' : ''}]`;
  }
  
  if (typeof result === 'object') {
    const keys = Object.keys(result);
    return `{${keys.length} propert${keys.length !== 1 ? 'ies' : 'y'}}`;
  }
  
  return String(result);
}