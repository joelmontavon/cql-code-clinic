import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { hintAPI } from '../services/hintAPI.js';

// Hint Context
const HintContext = createContext();

// Action types
const HINT_ACTIONS = {
  SET_HINTS: 'SET_HINTS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  REVEAL_HINT: 'REVEAL_HINT',
  TRACK_USAGE: 'TRACK_USAGE',
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  SET_PROFILE: 'SET_PROFILE',
  SET_SHOULD_SUGGEST: 'SET_SHOULD_SUGGEST',
  ADD_CONTEXTUAL_HINT: 'ADD_CONTEXTUAL_HINT',
  CLEAR_HINTS: 'CLEAR_HINTS'
};

// Initial state
const initialState = {
  hints: {
    base: [],
    contextual: [],
    recommendations: []
  },
  revealedHints: new Set(),
  loading: false,
  error: null,
  userProfile: null,
  preferences: {
    hintStyle: 'balanced',
    maxHintLevel: 5,
    autoSuggestEnabled: true
  },
  shouldSuggestHint: false,
  usageLog: [],
  analytics: {
    hintsUsed: 0,
    successRate: 0,
    learningSpeed: 'Steady'
  }
};

// Reducer
function hintReducer(state, action) {
  switch (action.type) {
    case HINT_ACTIONS.SET_HINTS:
      return {
        ...state,
        hints: action.payload,
        loading: false,
        error: null
      };

    case HINT_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case HINT_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case HINT_ACTIONS.REVEAL_HINT:
      return {
        ...state,
        revealedHints: new Set([...state.revealedHints, action.payload.index]),
        analytics: {
          ...state.analytics,
          hintsUsed: state.analytics.hintsUsed + 1
        }
      };

    case HINT_ACTIONS.TRACK_USAGE:
      return {
        ...state,
        usageLog: [...state.usageLog, action.payload]
      };

    case HINT_ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload
        }
      };

    case HINT_ACTIONS.SET_PROFILE:
      return {
        ...state,
        userProfile: action.payload,
        preferences: {
          ...state.preferences,
          ...action.payload.preferences
        }
      };

    case HINT_ACTIONS.SET_SHOULD_SUGGEST:
      return {
        ...state,
        shouldSuggestHint: action.payload
      };

    case HINT_ACTIONS.ADD_CONTEXTUAL_HINT:
      return {
        ...state,
        hints: {
          ...state.hints,
          contextual: [...state.hints.contextual, action.payload]
        }
      };

    case HINT_ACTIONS.CLEAR_HINTS:
      return {
        ...state,
        hints: { base: [], contextual: [], recommendations: [] },
        revealedHints: new Set(),
        shouldSuggestHint: false
      };

    default:
      return state;
  }
}

/**
 * Hint Context Provider
 * Manages hint state, preferences, and analytics across the application
 */
export function HintProvider({ children }) {
  const [state, dispatch] = useReducer(hintReducer, initialState);

  // Load user hint profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await hintAPI.getUserProfile();
      dispatch({ type: HINT_ACTIONS.SET_PROFILE, payload: profile });
    } catch (error) {
      console.warn('Could not load hint profile:', error);
      // Continue with defaults
    }
  };

  const getHints = async (exerciseId, context) => {
    dispatch({ type: HINT_ACTIONS.SET_LOADING, payload: true });
    
    try {
      const hintsData = await hintAPI.getPersonalizedHints(exerciseId, context);
      dispatch({ type: HINT_ACTIONS.SET_HINTS, payload: hintsData });
      
      // Determine if we should suggest hints
      const shouldSuggest = calculateShouldSuggest(context, hintsData);
      dispatch({ type: HINT_ACTIONS.SET_SHOULD_SUGGEST, payload: shouldSuggest });
      
      return hintsData;
    } catch (error) {
      dispatch({ type: HINT_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  };

  const revealHint = async (hintIndex, hint, exerciseId, context) => {
    dispatch({ type: HINT_ACTIONS.REVEAL_HINT, payload: { index: hintIndex } });
    
    // Track the hint usage
    const usageData = {
      level: hint.level,
      type: hint.type || 'progressive',
      timeToReveal: context.timeSpent || 0,
      codeAtTime: context.currentCode || '',
      contextRelevance: hint.contextRelevance || 0.5
    };
    
    try {
      await hintAPI.trackHintUsage(exerciseId, usageData);
      dispatch({ type: HINT_ACTIONS.TRACK_USAGE, payload: usageData });
    } catch (error) {
      console.warn('Could not track hint usage:', error);
      // Don't block the UI for tracking failures
    }
  };

  const updatePreferences = async (newPreferences) => {
    try {
      await hintAPI.updatePreferences(newPreferences);
      dispatch({ type: HINT_ACTIONS.UPDATE_PREFERENCES, payload: newPreferences });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  };

  const addContextualHint = (hint) => {
    dispatch({ type: HINT_ACTIONS.ADD_CONTEXTUAL_HINT, payload: hint });
  };

  const clearHints = () => {
    dispatch({ type: HINT_ACTIONS.CLEAR_HINTS });
  };

  // Calculate hint analytics
  const hintAnalytics = useMemo(() => {
    const { usageLog, revealedHints } = state;
    
    if (usageLog.length === 0) {
      return state.analytics;
    }

    const averageLevel = usageLog.reduce((sum, usage) => sum + usage.level, 0) / usageLog.length;
    const successfulHints = usageLog.filter(usage => usage.contextRelevance > 0.7).length;
    const successRate = Math.round((successfulHints / usageLog.length) * 100);
    
    const learningSpeed = averageLevel < 2.5 ? 'Fast' : 
                         averageLevel < 4.0 ? 'Steady' : 'Thorough';

    return {
      hintsUsed: usageLog.length,
      successRate,
      learningSpeed,
      averageLevel: averageLevel.toFixed(1),
      effectiveHints: successfulHints
    };
  }, [state.usageLog, state.revealedHints]);

  // Context value
  const value = {
    // State
    hints: state.hints,
    revealedHints: state.revealedHints,
    loading: state.loading,
    error: state.error,
    userProfile: state.userProfile,
    preferences: state.preferences,
    shouldSuggestHint: state.shouldSuggestHint,
    hintAnalytics,
    
    // Actions
    getHints,
    revealHint,
    updatePreferences,
    addContextualHint,
    clearHints,
    
    // Utilities
    isHintRevealed: (index) => state.revealedHints.has(index),
    canRevealHint: (index) => index === 0 || state.revealedHints.has(index - 1),
    getNextAvailableHint: () => {
      const nextIndex = state.revealedHints.size;
      return state.hints.base[nextIndex] || null;
    }
  };

  return (
    <HintContext.Provider value={value}>
      {children}
    </HintContext.Provider>
  );
}

// Helper function to determine if hints should be suggested
function calculateShouldSuggest(context, hintsData) {
  const { timeSpent = 0, lastError = '', currentCode = '' } = context;
  
  // Suggest hints if user has been working for a while
  if (timeSpent > 300) return true; // 5 minutes
  
  // Suggest if there are errors
  if (lastError.length > 0) return true;
  
  // Suggest if there are high-priority contextual hints
  const hasHighPriorityHints = hintsData?.contextual?.some(hint => hint.priority > 0.8);
  if (hasHighPriorityHints) return true;
  
  // Suggest if code appears stuck (very little content after some time)
  if (timeSpent > 120 && currentCode.trim().length < 50) return true;
  
  return false;
}

// Custom hook to use hint context
export function useHint() {
  const context = useContext(HintContext);
  if (!context) {
    throw new Error('useHint must be used within a HintProvider');
  }
  return context;
}

export { HintContext, HINT_ACTIONS };
export default HintContext;