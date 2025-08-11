import { useState, useEffect, useCallback } from 'react';
import { useExerciseStore } from '../stores/exerciseStore';
import { validateExercise as validateCQFExercise } from '../services/exerciseImporter';

/**
 * Enhanced Exercise Hook
 * Provides comprehensive exercise management functionality
 */
export function useExercise() {
  const {
    exercises,
    currentExercise,
    currentIndex,
    completedExercises,
    setCurrentExercise,
    setCurrentIndex,
    markExerciseComplete,
    setExerciseProgress,
    exerciseProgress
  } = useExerciseStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Navigation functions
  const goToExercise = useCallback((index) => {
    if (index >= 0 && index < exercises.length) {
      setCurrentIndex(index);
      setCurrentExercise(exercises[index]);
      setError(null);
    }
  }, [exercises, setCurrentIndex, setCurrentExercise]);

  const nextExercise = useCallback(() => {
    const nextIndex = Math.min(currentIndex + 1, exercises.length - 1);
    if (nextIndex !== currentIndex) {
      goToExercise(nextIndex);
    }
  }, [currentIndex, exercises.length, goToExercise]);

  const previousExercise = useCallback(() => {
    const prevIndex = Math.max(currentIndex - 1, 0);
    if (prevIndex !== currentIndex) {
      goToExercise(prevIndex);
    }
  }, [currentIndex, goToExercise]);

  // Exercise completion
  const completeExercise = useCallback((index = currentIndex, score = 100) => {
    if (index >= 0 && index < exercises.length) {
      markExerciseComplete(index, score);
      
      // Auto-advance to next exercise if not the last one
      if (index === currentIndex && index < exercises.length - 1) {
        setTimeout(() => {
          nextExercise();
        }, 1000);
      }
    }
  }, [currentIndex, exercises.length, markExerciseComplete, nextExercise]);

  // Progress tracking
  const updateProgress = useCallback((index = currentIndex, progress) => {
    if (index >= 0 && index < exercises.length) {
      setExerciseProgress(index, progress);
    }
  }, [currentIndex, exercises.length, setExerciseProgress]);

  // Exercise validation
  const validateExercise = useCallback(async (code, exerciseIndex = currentIndex) => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) {
      return { isValid: false, score: 0, message: 'Invalid exercise' };
    }

    setLoading(true);
    setError(null);

    try {
      // Use CQF exercise validation system if exercise has an ID (new format)
      if (exercise.id && exercise.validation) {
        const result = await validateCQFExercise(exercise.id, code);
        return result;
      }
      
      // Legacy exercise validation for old format
      if (exercise.tabs && exercise.tabs[0]) {
        const tab = exercise.tabs[0];
        
        // If exercise has custom evaluation function
        if (typeof tab.eval === 'function') {
          try {
            const isValid = tab.eval({ code, status: 'success' }, { detail: tab.key });
            return {
              isValid,
              score: isValid ? 100 : 0,
              message: isValid ? 'Exercise completed successfully!' : 'Code does not meet requirements',
              validationResults: [{
                name: 'Legacy Validation',
                isValid,
                message: isValid ? 'Requirements met' : 'Requirements not met'
              }]
            };
          } catch (evalError) {
            console.error('Exercise evaluation error:', evalError);
            return {
              isValid: false,
              score: 0,
              message: 'Error validating exercise',
              validationResults: [{
                name: 'Legacy Validation',
                isValid: false,
                message: 'Validation error: ' + evalError.message
              }]
            };
          }
        }

        // Simple string comparison fallback
        const expectedCode = tab.key || '';
        const isExactMatch = code.trim() === expectedCode.trim();
        
        if (isExactMatch) {
          return {
            isValid: true,
            score: 100,
            message: 'Perfect match!',
            validationResults: [{
              name: 'Code Comparison',
              isValid: true,
              message: 'Code matches expected solution exactly'
            }]
          };
        }

        // Partial credit based on similarity
        const similarity = calculateSimilarity(code, expectedCode);
        const score = Math.round(similarity * 100);
        
        return {
          isValid: score >= 80,
          score,
          message: score >= 80 ? 
            'Good solution!' : 
            `Close, but not quite right (${score}% match)`,
          validationResults: [{
            name: 'Code Similarity',
            isValid: score >= 80,
            message: `${score}% similarity to expected solution`
          }]
        };
      }
      
      // No validation available
      return {
        isValid: false,
        score: 0,
        message: 'No validation available for this exercise',
        validationResults: [{
          name: 'No Validation',
          isValid: false,
          message: 'Exercise does not have validation configured'
        }]
      };
      
    } catch (error) {
      console.error('Exercise validation error:', error);
      setError(error.message);
      return {
        isValid: false,
        score: 0,
        message: 'Error validating exercise: ' + error.message,
        validationResults: [{
          name: 'Validation Error',
          isValid: false,
          message: error.message
        }]
      };
    } finally {
      setLoading(false);
    }
  }, [currentIndex, exercises]);

  // Get exercise statistics
  const getStatistics = useCallback(() => {
    const total = exercises.length;
    const completed = completedExercises.size;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    const averageScore = completed > 0 ? 
      Array.from(completedExercises).reduce((sum, index) => {
        const progress = exerciseProgress[index];
        return sum + (progress?.score || 0);
      }, 0) / completed : 0;

    return {
      total,
      completed,
      remaining: total - completed,
      completionRate,
      averageScore: Math.round(averageScore),
      currentProgress: currentIndex + 1
    };
  }, [exercises.length, completedExercises, exerciseProgress, currentIndex]);

  // Check if can navigate
  const canNavigate = {
    next: currentIndex < exercises.length - 1,
    previous: currentIndex > 0
  };

  // Current exercise status
  const currentStatus = {
    isCompleted: completedExercises.has(currentIndex),
    progress: exerciseProgress[currentIndex],
    isFirst: currentIndex === 0,
    isLast: currentIndex === exercises.length - 1
  };

  return {
    // Data
    exercises,
    currentExercise,
    currentIndex,
    completedExercises,
    exerciseProgress,
    
    // Navigation
    goToExercise,
    nextExercise,
    previousExercise,
    canNavigate,
    
    // Progress
    completeExercise,
    updateProgress,
    validateExercise,
    getStatistics,
    
    // Status
    currentStatus,
    loading,
    error,
    
    // Utilities
    setError
  };
}

// Helper function to calculate string similarity
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  // Simple Levenshtein distance-based similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Levenshtein distance implementation
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}