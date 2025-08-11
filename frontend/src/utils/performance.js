/**
 * Frontend Performance Optimization Utilities
 * Client-side performance monitoring, optimization, and lazy loading helpers
 */

/**
 * Performance metrics collector
 * Collects and reports client-side performance metrics
 */
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = new Map();
    this.config = {
      samplingRate: 0.1, // 10% sampling for production
      reportingEndpoint: '/api/performance/client-metrics',
      bufferSize: 50,
      flushInterval: 30000 // 30 seconds
    };

    this.initializeObservers();
    this.startReporting();
  }

  /**
   * Initialize performance observers
   */
  initializeObservers() {
    // Performance Observer for navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'navigation') {
              this.recordNavigationMetrics(entry);
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      } catch (error) {
        console.warn('Navigation performance observer not supported:', error);
      }

      // Performance Observer for resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'resource') {
              this.recordResourceMetrics(entry);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (error) {
        console.warn('Resource performance observer not supported:', error);
      }

      // Performance Observer for user timing
      try {
        const userObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'measure') {
              this.recordUserTiming(entry);
            }
          });
        });
        userObserver.observe({ entryTypes: ['measure'] });
        this.observers.set('user', userObserver);
      } catch (error) {
        console.warn('User timing observer not supported:', error);
      }

      // Long Task Observer
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.entryType === 'longtask') {
              this.recordLongTask(entry);
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }

    // Intersection Observer for component visibility
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.recordComponentView(entry.target);
          }
        });
      });
    }
  }

  /**
   * Record navigation metrics
   * @param {PerformanceNavigationTiming} entry - Navigation timing entry
   */
  recordNavigationMetrics(entry) {
    if (!this.shouldSample()) return;

    const metrics = {
      type: 'navigation',
      timestamp: Date.now(),
      data: {
        dns: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
        tcp: Math.round(entry.connectEnd - entry.connectStart),
        ssl: entry.secureConnectionStart > 0 ? 
          Math.round(entry.connectEnd - entry.secureConnectionStart) : 0,
        ttfb: Math.round(entry.responseStart - entry.requestStart),
        download: Math.round(entry.responseEnd - entry.responseStart),
        domContentLoaded: Math.round(entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart),
        domComplete: Math.round(entry.domComplete - entry.navigationStart),
        loadComplete: Math.round(entry.loadEventEnd - entry.loadEventStart),
        url: entry.name,
        navigationType: entry.type
      }
    };

    this.addMetric('navigation', metrics);
  }

  /**
   * Record resource metrics
   * @param {PerformanceResourceTiming} entry - Resource timing entry
   */
  recordResourceMetrics(entry) {
    if (!this.shouldSample()) return;

    // Only track significant resources
    if (entry.duration < 10) return; // Skip very fast resources

    const metrics = {
      type: 'resource',
      timestamp: Date.now(),
      data: {
        url: entry.name,
        duration: Math.round(entry.duration),
        size: entry.transferSize,
        compressed: entry.encodedBodySize !== entry.decodedBodySize,
        cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
        resourceType: this.getResourceType(entry.name),
        dns: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
        tcp: Math.round(entry.connectEnd - entry.connectStart),
        download: Math.round(entry.responseEnd - entry.responseStart)
      }
    };

    this.addMetric('resource', metrics);
  }

  /**
   * Record user timing metrics
   * @param {PerformanceMeasure} entry - User timing measure
   */
  recordUserTiming(entry) {
    const metrics = {
      type: 'user_timing',
      timestamp: Date.now(),
      data: {
        name: entry.name,
        duration: Math.round(entry.duration),
        startTime: Math.round(entry.startTime)
      }
    };

    this.addMetric('user_timing', metrics);
  }

  /**
   * Record long task
   * @param {PerformanceLongTaskTiming} entry - Long task entry
   */
  recordLongTask(entry) {
    const metrics = {
      type: 'long_task',
      timestamp: Date.now(),
      data: {
        duration: Math.round(entry.duration),
        startTime: Math.round(entry.startTime),
        attribution: entry.attribution?.map(attr => ({
          name: attr.name,
          containerType: attr.containerType,
          containerId: attr.containerId
        })) || []
      }
    };

    this.addMetric('long_task', metrics);
  }

  /**
   * Record component view
   * @param {Element} element - DOM element
   */
  recordComponentView(element) {
    if (!this.shouldSample()) return;

    const componentName = element.dataset.component || element.className;
    const metrics = {
      type: 'component_view',
      timestamp: Date.now(),
      data: {
        component: componentName,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    this.addMetric('component_view', metrics);
  }

  /**
   * Manually record custom metrics
   * @param {string} name - Metric name
   * @param {Object} data - Metric data
   */
  recordCustomMetric(name, data) {
    const metrics = {
      type: 'custom',
      timestamp: Date.now(),
      data: {
        name,
        ...data
      }
    };

    this.addMetric('custom', metrics);
  }

  /**
   * Mark performance timing
   * @param {string} name - Timing name
   */
  mark(name) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name);
    }
  }

  /**
   * Measure performance between marks
   * @param {string} name - Measure name
   * @param {string} startMark - Start mark name
   * @param {string} endMark - End mark name
   */
  measure(name, startMark, endMark) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        console.warn('Performance measure failed:', error);
      }
    }
  }

  /**
   * Add metric to buffer
   * @param {string} type - Metric type
   * @param {Object} metric - Metric data
   */
  addMetric(type, metric) {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, []);
    }

    const typeMetrics = this.metrics.get(type);
    typeMetrics.push(metric);

    // Trim buffer if too large
    if (typeMetrics.length > this.config.bufferSize) {
      typeMetrics.splice(0, typeMetrics.length - this.config.bufferSize);
    }
  }

  /**
   * Get resource type from URL
   * @param {string} url - Resource URL
   * @returns {string} Resource type
   */
  getResourceType(url) {
    const extension = url.split('.').pop()?.toLowerCase() || '';
    
    if (['js', 'mjs'].includes(extension)) return 'script';
    if (['css'].includes(extension)) return 'stylesheet';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension)) return 'image';
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Check if metric should be sampled
   * @returns {boolean} Should sample
   */
  shouldSample() {
    return Math.random() <= this.config.samplingRate;
  }

  /**
   * Start periodic reporting
   */
  startReporting() {
    setInterval(() => {
      this.flushMetrics();
    }, this.config.flushInterval);

    // Report on page unload
    if ('addEventListener' in window) {
      window.addEventListener('beforeunload', () => {
        this.flushMetrics(true);
      });
    }
  }

  /**
   * Flush metrics to server
   * @param {boolean} immediate - Send immediately
   */
  async flushMetrics(immediate = false) {
    if (this.metrics.size === 0) return;

    const payload = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      metrics: Object.fromEntries(this.metrics)
    };

    try {
      if (immediate && 'sendBeacon' in navigator) {
        // Use sendBeacon for reliable delivery on page unload
        navigator.sendBeacon(
          this.config.reportingEndpoint,
          JSON.stringify(payload)
        );
      } else {
        // Use fetch for regular reporting
        await fetch(this.config.reportingEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      // Clear metrics after successful send
      this.metrics.clear();
    } catch (error) {
      console.warn('Failed to send performance metrics:', error);
    }
  }

  /**
   * Get current Web Vitals
   * @returns {Promise<Object>} Web Vitals metrics
   */
  async getWebVitals() {
    const vitals = {};

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        await new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            let cls = 0;
            list.getEntries().forEach(entry => {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            });
            vitals.cls = Math.round(cls * 1000) / 1000;
            observer.disconnect();
            resolve();
          });
          observer.observe({ entryTypes: ['layout-shift'] });
          
          // Timeout after 5 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 5000);
        });
      } catch (error) {
        console.warn('CLS measurement failed:', error);
      }
    }

    // First Contentful Paint (FCP)
    try {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        vitals.fcp = Math.round(fcpEntry.startTime);
      }
    } catch (error) {
      console.warn('FCP measurement failed:', error);
    }

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        await new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
              vitals.lcp = Math.round(lastEntry.startTime);
            }
            observer.disconnect();
            resolve();
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Timeout after 5 seconds
          setTimeout(() => {
            observer.disconnect();
            resolve();
          }, 5000);
        });
      } catch (error) {
        console.warn('LCP measurement failed:', error);
      }
    }

    // First Input Delay (FID) - approximated
    vitals.fid = 0; // This would need to be measured on actual user interactions

    return vitals;
  }

  /**
   * Observe component for visibility tracking
   * @param {Element} element - DOM element to observe
   */
  observeComponent(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Stop observing component
   * @param {Element} element - DOM element to stop observing
   */
  unobserveComponent(element) {
    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }

  /**
   * Disconnect all observers
   */
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }
}

/**
 * Lazy loading utilities
 */
export const LazyLoader = {
  /**
   * Lazy load component with intersection observer
   * @param {Function} importFn - Dynamic import function
   * @param {Object} options - Loading options
   * @returns {React.Component} Lazy component
   */
  component(importFn, options = {}) {
    const { 
      fallback = null,
      error = null,
      delay = 0,
      retries = 3
    } = options;

    return React.lazy(() => {
      let retryCount = 0;
      
      const loadWithRetry = async () => {
        try {
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          return await importFn();
        } catch (error) {
          retryCount++;
          
          if (retryCount <= retries) {
            // Exponential backoff
            const backoffDelay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
            return loadWithRetry();
          }
          
          throw error;
        }
      };

      return loadWithRetry();
    });
  },

  /**
   * Lazy load image with intersection observer
   * @param {HTMLImageElement} img - Image element
   * @param {string} src - Image source URL
   * @param {Object} options - Loading options
   */
  image(img, src, options = {}) {
    const { 
      placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E',
      threshold = 0.1,
      rootMargin = '50px'
    } = options;

    img.src = placeholder;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const imageElement = entry.target;
          imageElement.src = src;
          
          imageElement.addEventListener('load', () => {
            imageElement.classList.add('loaded');
          });

          observer.unobserve(imageElement);
        }
      });
    }, { threshold, rootMargin });

    observer.observe(img);

    return observer;
  },

  /**
   * Preload critical resources
   * @param {Array} resources - Array of resource objects
   */
  preload(resources) {
    resources.forEach(resource => {
      const { href, as, type, crossorigin } = resource;
      
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      
      if (as) link.as = as;
      if (type) link.type = type;
      if (crossorigin) link.crossOrigin = crossorigin;
      
      document.head.appendChild(link);
    });
  },

  /**
   * Prefetch resources for future navigation
   * @param {Array} urls - Array of URLs to prefetch
   */
  prefetch(urls) {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }
};

/**
 * Bundle optimization utilities
 */
export const BundleOptimizer = {
  /**
   * Dynamic import with error handling
   * @param {Function} importFn - Import function
   * @param {Object} options - Options
   * @returns {Promise} Import promise
   */
  async dynamicImport(importFn, options = {}) {
    const { retries = 3, delay = 1000 } = options;
    
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  },

  /**
   * Load script dynamically
   * @param {string} src - Script source
   * @param {Object} options - Loading options
   * @returns {Promise} Loading promise
   */
  loadScript(src, options = {}) {
    const { async = true, defer = false, integrity } = options;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = async;
      script.defer = defer;
      
      if (integrity) {
        script.integrity = integrity;
        script.crossOrigin = 'anonymous';
      }
      
      script.addEventListener('load', resolve);
      script.addEventListener('error', reject);
      
      document.head.appendChild(script);
    });
  },

  /**
   * Get bundle analysis data
   * @returns {Object} Bundle information
   */
  getBundleInfo() {
    const scripts = Array.from(document.scripts);
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    return {
      scripts: scripts.map(script => ({
        src: script.src,
        async: script.async,
        defer: script.defer,
        size: script.src ? 'unknown' : script.textContent.length
      })),
      stylesheets: stylesheets.map(link => ({
        href: link.href,
        media: link.media
      })),
      totalScripts: scripts.length,
      totalStylesheets: stylesheets.length
    };
  }
};

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  const React = window.React;
  
  React.useEffect(() => {
    performanceMonitor.mark('component_mount');
    
    return () => {
      performanceMonitor.mark('component_unmount');
      performanceMonitor.measure(
        'component_lifetime',
        'component_mount',
        'component_unmount'
      );
    };
  }, []);

  return {
    mark: performanceMonitor.mark.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    recordCustomMetric: performanceMonitor.recordCustomMetric.bind(performanceMonitor)
  };
};

export default {
  PerformanceMonitor,
  LazyLoader,
  BundleOptimizer,
  performanceMonitor,
  usePerformanceMonitor
};