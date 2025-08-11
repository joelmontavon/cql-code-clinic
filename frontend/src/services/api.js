import axios from 'axios';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle common error scenarios
        if (error.response?.status === 401) {
          // Unauthorized - redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // CQL execution endpoint
  async executeCQL(code, options = {}) {
    try {
      const response = await this.client.post('/cql/execute', {
        code: code,
        terminologyServiceUri: options.terminologyServiceUri,
        dataServiceUri: options.dataServiceUri, 
        patientId: options.patientId || 'example-patient-id',
        parameters: options.parameters || []
      });
      
      return response.data;
    } catch (error) {
      console.error('CQL execution error:', error);
      throw error;
    }
  }

  // Health check endpoint
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Generic request methods
  async get(endpoint) {
    const response = await this.client.get(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }
    
    return response.data.data;
  }

  async post(endpoint, data) {
    const response = await this.client.post(endpoint, data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }
    
    return response.data.data;
  }

  async put(endpoint, data) {
    const response = await this.client.put(endpoint, data);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }
    
    return response.data.data;
  }

  async delete(endpoint) {
    const response = await this.client.delete(endpoint);
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'API request failed');
    }
    
    return response.data.data;
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export individual methods for convenience (with proper binding)
export const executeCQL = (...args) => apiService.executeCQL(...args);
export const healthCheck = (...args) => apiService.healthCheck(...args);