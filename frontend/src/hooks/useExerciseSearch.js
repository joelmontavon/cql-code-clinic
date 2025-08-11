/**
 * Exercise Search Hook
 * Provides search functionality and state management for exercises
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import exerciseService from '../services/exerciseService.js';

/**
 * Custom hook for exercise search and filtering
 * @param {Object} initialCriteria - Initial search criteria
 * @returns {Object} Search state and functions
 */
export function useExerciseSearch(initialCriteria = {}) {
  const [criteria, setCriteria] = useState({
    query: '',
    difficulty: '',
    type: '',
    concepts: [],
    tags: [],
    estimatedTimeMin: undefined,
    estimatedTimeMax: undefined,
    sortBy: 'title',
    sortOrder: 'asc',
    limit: undefined,
    offset: 0,
    ...initialCriteria
  });
  
  const [debouncedCriteria, setDebouncedCriteria] = useState(criteria);
  
  // Debounce search criteria to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCriteria(criteria);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [criteria]);
  
  // Query for search results
  const {
    data: searchResults = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['exercise-search', debouncedCriteria],
    queryFn: () => exerciseService.searchExercises(debouncedCriteria),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Search functions
  const updateCriteria = useCallback((updates) => {
    setCriteria(prev => ({
      ...prev,
      ...updates,
      offset: updates.query !== prev.query ? 0 : prev.offset // Reset offset if query changed
    }));
  }, []);
  
  const setQuery = useCallback((query) => {
    updateCriteria({ query });
  }, [updateCriteria]);
  
  const setDifficulty = useCallback((difficulty) => {
    updateCriteria({ difficulty });
  }, [updateCriteria]);
  
  const setType = useCallback((type) => {
    updateCriteria({ type });
  }, [updateCriteria]);
  
  const setConcepts = useCallback((concepts) => {
    updateCriteria({ concepts });
  }, [updateCriteria]);
  
  const setTags = useCallback((tags) => {
    updateCriteria({ tags });
  }, [updateCriteria]);
  
  const setTimeRange = useCallback((min, max) => {
    updateCriteria({ 
      estimatedTimeMin: min,
      estimatedTimeMax: max 
    });
  }, [updateCriteria]);
  
  const setSorting = useCallback((sortBy, sortOrder = 'asc') => {
    updateCriteria({ sortBy, sortOrder });
  }, [updateCriteria]);
  
  const clearFilters = useCallback(() => {
    setCriteria({
      query: '',
      difficulty: '',
      type: '',
      concepts: [],
      tags: [],
      estimatedTimeMin: undefined,
      estimatedTimeMax: undefined,
      sortBy: 'title',
      sortOrder: 'asc',
      limit: undefined,
      offset: 0
    });
  }, []);
  
  const nextPage = useCallback(() => {
    if (criteria.limit) {
      updateCriteria({ 
        offset: criteria.offset + criteria.limit 
      });
    }
  }, [criteria.offset, criteria.limit, updateCriteria]);
  
  const previousPage = useCallback(() => {
    if (criteria.limit && criteria.offset > 0) {
      updateCriteria({ 
        offset: Math.max(0, criteria.offset - criteria.limit)
      });
    }
  }, [criteria.offset, criteria.limit, updateCriteria]);
  
  const goToPage = useCallback((page) => {
    if (criteria.limit) {
      updateCriteria({ 
        offset: (page - 1) * criteria.limit 
      });
    }
  }, [criteria.limit, updateCriteria]);
  
  // Computed values
  const hasActiveFilters = useMemo(() => {
    return !!(
      criteria.query ||
      criteria.difficulty ||
      criteria.type ||
      criteria.concepts.length > 0 ||
      criteria.tags.length > 0 ||
      criteria.estimatedTimeMin !== undefined ||
      criteria.estimatedTimeMax !== undefined
    );
  }, [criteria]);
  
  const currentPage = useMemo(() => {
    return criteria.limit ? Math.floor(criteria.offset / criteria.limit) + 1 : 1;
  }, [criteria.offset, criteria.limit]);
  
  const hasNextPage = useMemo(() => {
    return criteria.limit ? searchResults.length === criteria.limit : false;
  }, [criteria.limit, searchResults.length]);
  
  const hasPreviousPage = useMemo(() => {
    return criteria.offset > 0;
  }, [criteria.offset]);
  
  return {
    // Search state
    criteria,
    searchResults,
    isLoading,
    error,
    
    // Search functions
    updateCriteria,
    setQuery,
    setDifficulty,
    setType,
    setConcepts,
    setTags,
    setTimeRange,
    setSorting,
    clearFilters,
    refetch,
    
    // Pagination
    nextPage,
    previousPage,
    goToPage,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    
    // Computed values
    hasActiveFilters,
    resultCount: searchResults.length
  };
}

/**
 * Hook for exercise recommendations
 * @param {Object} userProgress - User progress data
 * @param {Object} options - Recommendation options
 * @returns {Object} Recommendations state and functions
 */
export function useExerciseRecommendations(userProgress, options = {}) {
  const {
    data: recommendations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['exercise-recommendations', userProgress, options],
    queryFn: () => exerciseService.getRecommendations(userProgress, options),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!userProgress,
  });
  
  return {
    recommendations,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for exercise analytics
 * @returns {Object} Analytics state
 */
export function useExerciseAnalytics() {
  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['exercise-analytics'],
    queryFn: () => exerciseService.getExerciseAnalytics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return {
    analytics,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for loading all exercises
 * @returns {Object} Exercises state
 */
export function useAllExercises() {
  const queryClient = useQueryClient();
  
  const {
    data: exercises = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => exerciseService.loadExercises(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Prefetch individual exercises
  useEffect(() => {
    exercises.forEach(exercise => {
      queryClient.prefetchQuery({
        queryKey: ['exercise', exercise.id],
        queryFn: () => exerciseService.loadExercise(exercise.id),
        staleTime: 10 * 60 * 1000,
      });
    });
  }, [exercises, queryClient]);
  
  return {
    exercises,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for loading a single exercise
 * @param {string} exerciseId - Exercise ID
 * @returns {Object} Exercise state
 */
export function useExercise(exerciseId) {
  const {
    data: exercise,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['exercise', exerciseId],
    queryFn: () => exerciseService.loadExercise(exerciseId),
    enabled: !!exerciseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  return {
    exercise,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook for exercise filtering utilities
 * @returns {Object} Filter utilities
 */
export function useExerciseFilters() {
  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => exerciseService.loadExercises(),
  });
  
  // Extract unique filter values from exercises
  const filterOptions = useMemo(() => {
    const difficulties = [...new Set(exercises.map(ex => ex.difficulty))];
    const types = [...new Set(exercises.map(ex => ex.type))];
    const concepts = [...new Set(exercises.flatMap(ex => ex.concepts))];
    const tags = [...new Set(exercises.flatMap(ex => ex.tags))];
    
    const timeRanges = [
      { label: '< 10 min', min: 0, max: 9 },
      { label: '10-20 min', min: 10, max: 20 },
      { label: '21-30 min', min: 21, max: 30 },
      { label: '31-45 min', min: 31, max: 45 },
      { label: '> 45 min', min: 46, max: 999 }
    ];
    
    return {
      difficulties: difficulties.sort(),
      types: types.sort(),
      concepts: concepts.sort(),
      tags: tags.sort(),
      timeRanges
    };
  }, [exercises]);
  
  return {
    filterOptions,
    exercises
  };
}

export default useExerciseSearch;