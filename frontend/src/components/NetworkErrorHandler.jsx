import React, { useState, useEffect } from 'react';
import { Alert, Button, Toast, ToastContainer } from 'react-bootstrap';
import { 
  WifiOff, 
  ExclamationTriangleFill, 
  ArrowClockwise,
  CheckCircleFill 
} from 'react-bootstrap-icons';

/**
 * Network Status Hook
 * Tracks online/offline status and connection quality
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionSpeed, setConnectionSpeed] = useState('unknown');
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check connection speed if available
    if ('connection' in navigator) {
      const connection = navigator.connection;
      setConnectionSpeed(connection.effectiveType || 'unknown');
      
      const handleConnectionChange = () => {
        setConnectionSpeed(connection.effectiveType || 'unknown');
      };
      
      connection.addEventListener('change', handleConnectionChange);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        connection.removeEventListener('change', handleConnectionChange);
      };
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return { isOnline, connectionSpeed };
}

/**
 * Network Error Component
 */
export function NetworkError({ 
  error, 
  onRetry, 
  className = '',
  variant = 'warning',
  size = 'normal' // 'small', 'normal', 'large'
}) {
  const { isOnline, connectionSpeed } = useNetworkStatus();
  
  const getErrorMessage = () => {
    if (!isOnline) {
      return {
        title: 'No Internet Connection',
        message: 'Please check your internet connection and try again.',
        icon: <WifiOff />
      };
    }
    
    if (error?.code === 'NETWORK_ERROR') {
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server. Please try again.',
        icon: <ExclamationTriangleFill />
      };
    }
    
    if (error?.code === 'TIMEOUT_ERROR') {
      return {
        title: 'Request Timeout',
        message: 'The request took too long. Please check your connection and try again.',
        icon: <ExclamationTriangleFill />
      };
    }
    
    if (error?.status >= 500) {
      return {
        title: 'Server Error',
        message: 'The server is temporarily unavailable. Please try again in a moment.',
        icon: <ExclamationTriangleFill />
      };
    }
    
    if (error?.status === 429) {
      return {
        title: 'Too Many Requests',
        message: 'Please wait a moment before trying again.',
        icon: <ExclamationTriangleFill />
      };
    }
    
    return {
      title: 'Connection Problem',
      message: error?.message || 'Something went wrong. Please try again.',
      icon: <ExclamationTriangleFill />
    };
  };
  
  const { title, message, icon } = getErrorMessage();
  
  if (size === 'small') {
    return (
      <div className={`text-center p-2 ${className}`}>
        <div className="text-muted mb-2">
          {icon}
          <small className="ms-2">{title}</small>
        </div>
        {onRetry && (
          <Button variant="outline-primary" size="sm" onClick={onRetry}>
            <ArrowClockwise size={14} className="me-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }
  
  return (
    <Alert variant={variant} className={className}>
      <div className="d-flex align-items-start">
        <div className="me-3 mt-1">
          {icon}
        </div>
        <div className="flex-grow-1">
          <Alert.Heading className="h6 mb-2">
            {title}
          </Alert.Heading>
          <p className="mb-3">{message}</p>
          
          {connectionSpeed === 'slow-2g' || connectionSpeed === '2g' && (
            <p className="small text-muted mb-3">
              <strong>Slow connection detected:</strong> Some features may be limited.
            </p>
          )}
          
          <div className="d-flex gap-2">
            {onRetry && (
              <Button 
                variant={`outline-${variant}`} 
                size="sm" 
                onClick={onRetry}
                disabled={!isOnline}
              >
                <ArrowClockwise className="me-1" />
                {!isOnline ? 'Waiting for connection...' : 'Try Again'}
              </Button>
            )}
            
            {!isOnline && (
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  );
}

/**
 * Connection Status Toast
 */
export function ConnectionStatusToast() {
  const { isOnline } = useNetworkStatus();
  const [showToast, setShowToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowToast(true);
    } else if (wasOffline && isOnline) {
      setShowToast(true);
      // Hide the "back online" toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
        setWasOffline(false);
      }, 3000);
    }
  }, [isOnline, wasOffline]);
  
  return (
    <ToastContainer position="top-end" className="p-3">
      <Toast
        show={showToast}
        onClose={() => setShowToast(false)}
        bg={isOnline ? 'success' : 'danger'}
        autohide={isOnline}
        delay={3000}
      >
        <Toast.Body className="d-flex align-items-center text-white">
          {isOnline ? (
            <>
              <CheckCircleFill className="me-2" />
              Back online
            </>
          ) : (
            <>
              <WifiOff className="me-2" />
              No internet connection
            </>
          )}
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
}

/**
 * Offline Fallback Component
 */
export function OfflineFallback({ children }) {
  const { isOnline } = useNetworkStatus();
  
  if (!isOnline) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center min-vh-50 p-4">
        <WifiOff size={64} className="text-muted mb-4" />
        <h4 className="text-muted mb-3">You're offline</h4>
        <p className="text-center text-muted mb-4">
          Some features may not be available while you're offline. 
          Please check your internet connection.
        </p>
        <Button 
          variant="outline-primary" 
          onClick={() => window.location.reload()}
        >
          <ArrowClockwise className="me-2" />
          Try Again
        </Button>
      </div>
    );
  }
  
  return children;
}

/**
 * API Error Handler Hook
 */
export function useApiErrorHandler() {
  const handleError = (error) => {
    // Categorize the error
    if (!navigator.onLine) {
      return {
        type: 'network',
        code: 'OFFLINE',
        message: 'No internet connection available',
        userMessage: 'Please check your internet connection and try again.'
      };
    }
    
    if (error.name === 'AbortError') {
      return {
        type: 'network',
        code: 'ABORTED',
        message: 'Request was cancelled',
        userMessage: 'The request was cancelled. Please try again.'
      };
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
      return {
        type: 'network',
        code: 'NETWORK_ERROR',
        message: 'Network connection failed',
        userMessage: 'Unable to connect to the server. Please check your connection.'
      };
    }
    
    if (error.status) {
      const status = error.status;
      
      if (status >= 500) {
        return {
          type: 'server',
          code: 'SERVER_ERROR',
          status,
          message: `Server error: ${status}`,
          userMessage: 'The server is temporarily unavailable. Please try again later.'
        };
      }
      
      if (status === 429) {
        return {
          type: 'rate_limit',
          code: 'RATE_LIMITED',
          status,
          message: 'Too many requests',
          userMessage: 'Too many requests. Please wait a moment before trying again.'
        };
      }
      
      if (status >= 400) {
        return {
          type: 'client',
          code: 'CLIENT_ERROR',
          status,
          message: `Client error: ${status}`,
          userMessage: error.message || 'There was a problem with your request.'
        };
      }
    }
    
    return {
      type: 'unknown',
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      userMessage: 'Something went wrong. Please try again.'
    };
  };
  
  return { handleError };
}