import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Authentication action types
const AUTH_ACTIONS = {
  LOGIN_REQUEST: 'LOGIN_REQUEST',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_REQUEST: 'REGISTER_REQUEST',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  SET_LOADING: 'SET_LOADING',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Initial authentication state
const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  loginAttempts: 0,
  lastLoginAttempt: null
};

// Authentication reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_REQUEST:
    case AUTH_ACTIONS.REGISTER_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        loading: false,
        error: null,
        loginAttempts: 0,
        lastLoginAttempt: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        loginAttempts: state.loginAttempts + 1,
        lastLoginAttempt: Date.now(),
        isAuthenticated: false,
        user: null,
        token: null
      };

    case AUTH_ACTIONS.REGISTER_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload.error,
        isAuthenticated: false,
        user: null,
        token: null
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false
      };

    case AUTH_ACTIONS.REFRESH_TOKEN:
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
}

// Create authentication context
const AuthContext = createContext();

/**
 * Authentication Provider Component
 * Manages user authentication state and provides auth methods
 */
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load authentication state from localStorage on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token');
        const storedRefreshToken = localStorage.getItem('refresh_token');
        const storedUser = localStorage.getItem('user_data');

        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser);
          
          // Verify token is still valid
          const isValid = await verifyToken(storedToken);
          
          if (isValid) {
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: {
                user,
                token: storedToken,
                refreshToken: storedRefreshToken
              }
            });
          } else {
            // Try to refresh token
            if (storedRefreshToken) {
              const refreshResult = await refreshAuthToken(storedRefreshToken);
              if (refreshResult.success) {
                dispatch({
                  type: AUTH_ACTIONS.LOGIN_SUCCESS,
                  payload: refreshResult
                });
              } else {
                clearStoredAuth();
                dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
              }
            } else {
              clearStoredAuth();
              dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
            }
          }
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Error loading stored auth:', error);
        clearStoredAuth();
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    loadStoredAuth();
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    let refreshInterval;

    if (state.isAuthenticated && state.refreshToken) {
      // Refresh token every 50 minutes (assuming 60-minute token expiry)
      refreshInterval = setInterval(async () => {
        try {
          const result = await refreshAuthToken(state.refreshToken);
          if (result.success) {
            dispatch({
              type: AUTH_ACTIONS.REFRESH_TOKEN,
              payload: result
            });
            
            // Update stored tokens
            localStorage.setItem('auth_token', result.token);
            if (result.refreshToken) {
              localStorage.setItem('refresh_token', result.refreshToken);
            }
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
      }, 50 * 60 * 1000); // 50 minutes
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [state.isAuthenticated, state.refreshToken]);

  /**
   * Login user with email and password
   */
  const login = async ({ email, password, rememberMe = false }) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_REQUEST });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, rememberMe })
      });

      const data = await response.json();

      if (data.success) {
        const { user, token, refreshToken } = data.data;
        
        // Store authentication data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token, refreshToken }
        });

        return { success: true, user };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: { error: data.error }
        });

        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please check your connection and try again.';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: errorMessage }
      });

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Register new user
   */
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.REGISTER_REQUEST });

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (data.success) {
        const { user, token, refreshToken } = data.data;
        
        // Store authentication data
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }

        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: { user, token, refreshToken }
        });

        return { success: true, user };
      } else {
        dispatch({
          type: AUTH_ACTIONS.REGISTER_FAILURE,
          payload: { error: data.error }
        });

        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMessage = 'Network error. Please check your connection and try again.';
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: { error: errorMessage }
      });

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Login with social provider (Google, GitHub, Microsoft)
   */
  const loginWithProvider = async (provider) => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_REQUEST });

    try {
      // Redirect to backend OAuth endpoint
      const authUrl = `/api/auth/${provider}`;
      
      // For development, we'll simulate the OAuth flow
      // In production, this would redirect to the actual OAuth provider
      const response = await fetch(authUrl, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.redirected) {
        // Handle OAuth redirect
        window.location.href = response.url;
        return { success: true, redirected: true };
      }

      const data = await response.json();

      if (data.success) {
        const { user, token, refreshToken } = data.data;
        
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(user));
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }

        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token, refreshToken }
        });

        return { success: true, user };
      } else {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_FAILURE,
          payload: { error: data.error }
        });

        return { success: false, error: data.error };
      }
    } catch (error) {
      const errorMessage = `${provider} authentication failed. Please try again.`;
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: errorMessage }
      });

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      // Call backend logout endpoint
      if (state.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${state.token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      clearStoredAuth();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (updates) => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = { ...state.user, ...data.data };
        localStorage.setItem('user_data', JSON.stringify(updatedUser));
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { 
            user: updatedUser, 
            token: state.token, 
            refreshToken: state.refreshToken 
          }
        });

        return { success: true, user: updatedUser };
      }

      return { success: false, error: data.error };
    } catch (error) {
      return { success: false, error: 'Failed to update profile' };
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      return { success: data.success, message: data.message, error: data.error };
    } catch (error) {
      return { success: false, error: 'Failed to send reset email' };
    }
  };

  /**
   * Clear authentication error
   */
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  /**
   * Get authentication headers for API calls
   */
  const getAuthHeaders = () => {
    if (state.token) {
      return {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json'
      };
    }
    return { 'Content-Type': 'application/json' };
  };

  // Context value
  const contextValue = {
    ...state,
    login,
    register,
    loginWithProvider,
    logout,
    updateProfile,
    resetPassword,
    clearError,
    getAuthHeaders,
    isRateLimited: state.loginAttempts >= 5 && 
      state.lastLoginAttempt && 
      (Date.now() - state.lastLoginAttempt < 15 * 60 * 1000) // 15 minutes
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// Helper functions

/**
 * Verify if token is still valid
 */
async function verifyToken(token) {
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Refresh authentication token
 */
async function refreshAuthToken(refreshToken) {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        user: data.data.user,
        token: data.data.token,
        refreshToken: data.data.refreshToken
      };
    }

    return { success: false, error: data.error };
  } catch (error) {
    return { success: false, error: 'Token refresh failed' };
  }
}

/**
 * Clear stored authentication data
 */
function clearStoredAuth() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_data');
}

export default AuthContext;