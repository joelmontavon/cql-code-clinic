import React, { Suspense } from 'react';
import { Spinner } from 'react-bootstrap';

/**
 * Lazy Loading Utilities for React Components
 * Provides optimized component loading with error boundaries and fallbacks
 */

/**
 * Default loading fallback component
 */
const DefaultLoadingFallback = ({ text = 'Loading...', size = 'sm' }) => (
  <div className="d-flex justify-content-center align-items-center p-3">
    <Spinner animation="border" size={size} className="me-2" />
    <span>{text}</span>
  </div>
);

/**
 * Error fallback component
 */
const ErrorFallback = ({ error, retry }) => (
  <div className="alert alert-warning d-flex justify-content-between align-items-center">
    <div>
      <strong>Failed to load component</strong>
      {error && <div className="small text-muted mt-1">{error.message}</div>}
    </div>
    {retry && (
      <button className="btn btn-outline-primary btn-sm" onClick={retry}>
        Retry
      </button>
    )}
  </div>
);

/**
 * Enhanced lazy loading with retry and error handling
 * @param {Function} importFn - Dynamic import function
 * @param {Object} options - Loading options
 * @returns {React.Component} Lazy component with error handling
 */
export const createLazyComponent = (importFn, options = {}) => {
  const {
    fallback = <DefaultLoadingFallback />,
    errorFallback = ErrorFallback,
    retries = 3,
    retryDelay = 1000,
    chunkName = null,
    preload = false
  } = options;

  let retryCount = 0;

  const LazyComponent = React.lazy(() => {
    return new Promise((resolve, reject) => {
      const loadWithRetry = async () => {
        try {
          const module = await importFn();
          
          // Reset retry count on successful load
          retryCount = 0;
          
          // Preload related chunks if specified
          if (preload && module.preloadDependencies) {
            module.preloadDependencies();
          }
          
          resolve(module);
        } catch (error) {
          retryCount++;
          
          if (retryCount <= retries) {
            // Exponential backoff delay
            const delay = retryDelay * Math.pow(2, retryCount - 1);
            
            console.warn(`Component load failed, retrying in ${delay}ms (attempt ${retryCount}/${retries}):`, error);
            
            setTimeout(() => {
              loadWithRetry();
            }, delay);
          } else {
            console.error('Component load failed after maximum retries:', error);
            reject(error);
          }
        }
      };

      loadWithRetry();
    });
  });

  // Add display name for debugging
  if (chunkName) {
    LazyComponent.displayName = `Lazy(${chunkName})`;
  }

  return LazyComponent;
};

/**
 * Lazy component wrapper with Suspense and error boundary
 * @param {React.Component} LazyComponent - Lazy loaded component
 * @param {Object} options - Wrapper options
 * @returns {React.Component} Wrapped component
 */
export const withLazyWrapper = (LazyComponent, options = {}) => {
  const {
    fallback = <DefaultLoadingFallback />,
    errorFallback = ErrorFallback,
    onError = null
  } = options;

  class LazyErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { hasError: false, error: null, retryCount: 0 };
    }

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
      console.error('Lazy component error:', error, errorInfo);
      if (onError) {
        onError(error, errorInfo);
      }
    }

    retry = () => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        retryCount: prevState.retryCount + 1
      }));
    };

    render() {
      if (this.state.hasError) {
        if (React.isValidElement(errorFallback)) {
          return errorFallback;
        }
        
        if (typeof errorFallback === 'function') {
          return errorFallback({
            error: this.state.error,
            retry: this.retry,
            retryCount: this.state.retryCount
          });
        }
        
        return <ErrorFallback error={this.state.error} retry={this.retry} />;
      }

      return (
        <Suspense fallback={fallback}>
          <LazyComponent {...this.props} />
        </Suspense>
      );
    }
  }

  LazyErrorBoundary.displayName = `LazyWrapper(${LazyComponent.displayName || 'Component'})`;

  return LazyErrorBoundary;
};

/**
 * Route-based lazy loading for React Router
 * @param {Function} importFn - Dynamic import function
 * @param {Object} options - Route options
 * @returns {React.Component} Route-ready lazy component
 */
export const createLazyRoute = (importFn, options = {}) => {
  const {
    fallback = <DefaultLoadingFallback text="Loading page..." />,
    ...lazyOptions
  } = options;

  const LazyComponent = createLazyComponent(importFn, lazyOptions);
  return withLazyWrapper(LazyComponent, { fallback, ...options });
};

/**
 * Modal lazy loading utility
 * @param {Function} importFn - Dynamic import function
 * @param {Object} options - Modal options
 * @returns {Object} Modal utilities
 */
export const createLazyModal = (importFn, options = {}) => {
  const {
    fallback = <DefaultLoadingFallback text="Loading modal..." size="sm" />,
    ...lazyOptions
  } = options;

  const LazyModalComponent = createLazyComponent(importFn, lazyOptions);
  const WrappedModal = withLazyWrapper(LazyModalComponent, { fallback, ...options });

  return {
    component: WrappedModal,
    preload: () => importFn(),
    isLoaded: () => {
      // Simple check to see if module is likely cached
      return Promise.resolve(importFn()).then(() => true).catch(() => false);
    }
  };
};

/**
 * Intersection Observer based lazy loading for components
 * @param {Function} importFn - Dynamic import function
 * @param {Object} options - Observer options
 * @returns {React.Component} Intersection-based lazy component
 */
export const createIntersectionLazyComponent = (importFn, options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '100px',
    triggerOnce = true,
    fallback = <div style={{ minHeight: '200px' }} />,
    loadingFallback = <DefaultLoadingFallback />,
    ...lazyOptions
  } = options;

  const LazyComponent = createLazyComponent(importFn, lazyOptions);

  const IntersectionLazyComponent = React.forwardRef((props, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const [shouldLoad, setShouldLoad] = React.useState(false);
    const elementRef = React.useRef();

    React.useEffect(() => {
      const element = elementRef.current;
      if (!element || shouldLoad) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setShouldLoad(true);
            
            if (triggerOnce) {
              observer.unobserve(element);
            }
          }
        },
        { threshold, rootMargin }
      );

      observer.observe(element);

      return () => {
        observer.unobserve(element);
      };
    }, [shouldLoad, threshold, rootMargin, triggerOnce]);

    if (!shouldLoad) {
      return <div ref={elementRef}>{fallback}</div>;
    }

    return (
      <Suspense fallback={loadingFallback}>
        <LazyComponent ref={ref} {...props} />
      </Suspense>
    );
  });

  IntersectionLazyComponent.displayName = 'IntersectionLazyComponent';
  
  return IntersectionLazyComponent;
};

/**
 * Preload utilities for optimizing component loading
 */
export const PreloadUtils = {
  /**
   * Preload multiple components
   * @param {Array} importFunctions - Array of import functions
   * @returns {Promise<Array>} Preload results
   */
  preloadComponents: async (importFunctions) => {
    const results = await Promise.allSettled(
      importFunctions.map(importFn => importFn())
    );
    
    const successful = results.filter(result => result.status === 'fulfilled');
    const failed = results.filter(result => result.status === 'rejected');
    
    if (failed.length > 0) {
      console.warn(`Failed to preload ${failed.length} components:`, failed);
    }
    
    return {
      successful: successful.length,
      failed: failed.length,
      total: results.length
    };
  },

  /**
   * Preload on hover with debouncing
   * @param {Function} importFn - Import function
   * @param {number} delay - Delay in ms
   * @returns {Object} Event handlers
   */
  createHoverPreloader: (importFn, delay = 200) => {
    let timeoutId = null;
    let isPreloaded = false;

    const preload = () => {
      if (isPreloaded) return;
      
      importFn()
        .then(() => {
          isPreloaded = true;
        })
        .catch(error => {
          console.warn('Hover preload failed:', error);
        });
    };

    return {
      onMouseEnter: () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(preload, delay);
      },
      onMouseLeave: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      },
      onFocus: preload
    };
  },

  /**
   * Preload critical route components on idle
   * @param {Array} criticalRoutes - Array of import functions for critical routes
   * @returns {Promise} Preload promise
   */
  preloadCriticalRoutes: (criticalRoutes) => {
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          PreloadUtils.preloadComponents(criticalRoutes).then(resolve);
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          PreloadUtils.preloadComponents(criticalRoutes).then(resolve);
        }, 100);
      }
    });
  }
};

/**
 * Performance monitoring for lazy components
 */
export const LazyPerformanceMonitor = {
  /**
   * Track component load time
   * @param {string} componentName - Component name
   * @param {Function} loadFunction - Load function
   * @returns {Function} Monitored load function
   */
  monitorLoadTime: (componentName, loadFunction) => {
    return async () => {
      const startTime = performance.now();
      
      try {
        const result = await loadFunction();
        const loadTime = performance.now() - startTime;
        
        // Report to performance monitoring service
        if (window.performanceMonitor) {
          window.performanceMonitor.recordCustomMetric('component_load_time', {
            component: componentName,
            loadTime: Math.round(loadTime),
            success: true
          });
        }
        
        console.debug(`Component ${componentName} loaded in ${Math.round(loadTime)}ms`);
        return result;
      } catch (error) {
        const loadTime = performance.now() - startTime;
        
        if (window.performanceMonitor) {
          window.performanceMonitor.recordCustomMetric('component_load_error', {
            component: componentName,
            loadTime: Math.round(loadTime),
            error: error.message,
            success: false
          });
        }
        
        throw error;
      }
    };
  }
};

// Commonly used lazy components for the application
export const LazyComponents = {
  // Create lazy versions of major components
  createLazyCodeEditor: () => createLazyComponent(
    () => import('../components/CodeEditor'),
    { chunkName: 'CodeEditor', preload: true }
  ),
  
  createLazyExerciseList: () => createLazyComponent(
    () => import('../components/ExerciseList'),
    { chunkName: 'ExerciseList' }
  ),
  
  createLazyProgressTracker: () => createLazyComponent(
    () => import('../components/ProgressTracker'),
    { chunkName: 'ProgressTracker' }
  ),
  
  createLazyAnalyticsDashboard: () => createIntersectionLazyComponent(
    () => import('../components/AnalyticsDashboard'),
    { chunkName: 'AnalyticsDashboard', threshold: 0.1 }
  ),
  
  createLazyTutorialModal: () => createLazyModal(
    () => import('../components/TutorialModal'),
    { chunkName: 'TutorialModal' }
  )
};

export default {
  createLazyComponent,
  withLazyWrapper,
  createLazyRoute,
  createLazyModal,
  createIntersectionLazyComponent,
  PreloadUtils,
  LazyPerformanceMonitor,
  LazyComponents
};