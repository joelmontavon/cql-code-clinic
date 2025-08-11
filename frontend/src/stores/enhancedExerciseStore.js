/**
 * Enhanced Exercise Store
 * Advanced exercise management with new schema support, validation, and analytics
 */

import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { validateExerciseData, performQualityChecks } from '../../../shared/utils/exercise-validator.js';
import { createTestMigration } from '../utils/exercise-migration-demo.js';

// Initialize with migrated exercises for development
const initializeExercises = () => {
  try {
    // In development, use migrated exercises
    const migratedExercises = createTestMigration();
    console.log('Loaded', migratedExercises.length, 'migrated exercises');
    return migratedExercises;
  } catch (error) {
    console.error('Failed to load migrated exercises:', error);
    return [];
  }
};

/**
 * Enhanced Exercise Store with comprehensive functionality
 */
export const useEnhancedExerciseStore = create()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        // Core Data
        exercises: [],
        currentIndex: 0,
        currentExercise: null,
        currentFile: null,
        currentFileIndex: 0,
        userCode: {},  // { exerciseId: { fileIndex: code } }
        
        // Execution State
        isExecuting: false,
        lastResult: null,
        executionHistory: [],
        
        // Progress Tracking
        completedExercises: new Set(),
        exerciseProgress: {}, // { exerciseId: ProgressObject }
        userAnswers: {}, // { exerciseId: { fileIndex: userCode } }
        hints: {}, // { exerciseId: hintsUsed[] }
        
        // Analytics & Tracking
        sessionStats: {
          startTime: Date.now(),
          exercisesAttempted: 0,
          exercisesCompleted: 0,
          totalHintsUsed: 0,
          totalExecutions: 0,
          totalTime: 0
        },
        
        // UI State
        showHints: false,
        activeHintLevel: 0,
        sidebarCollapsed: false,
        
        // Validation & Quality
        validationResults: {}, // { exerciseId: ValidationResult }
        qualityScores: {}, // { exerciseId: QualityScore }
        
        // Actions: Initialization
        initializeExercises: async () => {
          const exercises = initializeExercises();
          set(state => ({
            exercises,
            currentExercise: exercises[0] || null,
            currentFile: exercises[0]?.files?.[0] || null,
            userCode: exercises.reduce((acc, ex) => {
              acc[ex.id] = ex.files.reduce((fileAcc, file, fileIndex) => {
                fileAcc[fileIndex] = file.template;
                return fileAcc;
              }, {});
              return acc;
            }, {}),
            sessionStats: {
              ...state.sessionStats,
              startTime: Date.now()
            }
          }));
          
          // Validate all exercises
          get().validateAllExercises();
        },
        
        // Actions: Navigation
        setCurrentExercise: (exerciseId) => {
          const { exercises, trackExerciseStart } = get();
          const exercise = exercises.find(ex => ex.id === exerciseId);
          const exerciseIndex = exercises.findIndex(ex => ex.id === exerciseId);
          
          if (exercise) {
            set(state => ({
              currentIndex: exerciseIndex,
              currentExercise: exercise,
              currentFile: exercise.files[0],
              currentFileIndex: 0,
              activeHintLevel: 0,
              showHints: false
            }));
            
            trackExerciseStart(exerciseId);
          }
        },
        
        setCurrentIndex: (index) => {
          const { exercises } = get();
          if (index >= 0 && index < exercises.length) {
            const exercise = exercises[index];
            get().setCurrentExercise(exercise.id);
          }
        },
        
        setCurrentFile: (fileIndex) => {
          const { currentExercise } = get();
          if (currentExercise && fileIndex >= 0 && fileIndex < currentExercise.files.length) {
            set({
              currentFileIndex: fileIndex,
              currentFile: currentExercise.files[fileIndex]
            });
          }
        },
        
        // Actions: Code Management
        updateUserCode: (exerciseId, fileIndex, code) => {
          set(state => ({
            userCode: {
              ...state.userCode,
              [exerciseId]: {
                ...state.userCode[exerciseId],
                [fileIndex]: code
              }
            }
          }));
        },
        
        getCurrentCode: () => {
          const { currentExercise, currentFileIndex, userCode } = get();
          if (!currentExercise) return '';
          return userCode[currentExercise.id]?.[currentFileIndex] || '';
        },
        
        resetCurrentExercise: () => {
          const { currentExercise } = get();
          if (currentExercise) {
            set(state => ({
              userCode: {
                ...state.userCode,
                [currentExercise.id]: currentExercise.files.reduce((acc, file, index) => {
                  acc[index] = file.template;
                  return acc;
                }, {})
              },
              lastResult: null,
              activeHintLevel: 0,
              showHints: false
            }));
          }
        },
        
        // Actions: Execution
        setExecuting: (isExecuting) => set({ isExecuting }),
        
        setLastResult: (result) => {
          set(state => ({
            lastResult: result,
            executionHistory: [...state.executionHistory.slice(-19), {
              timestamp: Date.now(),
              exerciseId: state.currentExercise?.id,
              result,
              code: get().getCurrentCode()
            }],
            sessionStats: {
              ...state.sessionStats,
              totalExecutions: state.sessionStats.totalExecutions + 1
            }
          }));
        },
        
        // Actions: Exercise Validation
        validateCurrentExercise: () => {
          const { currentExercise, getCurrentCode } = get();
          if (!currentExercise) return { passed: false, score: 0 };
          
          const userCode = getCurrentCode();
          const validation = currentExercise.validation;
          
          if (!validation) return { passed: true, score: 100 };
          
          let score = 0;
          let passed = false;
          const feedback = [];
          
          try {
            switch (validation.strategy) {
              case 'exact-match':
                const solution = currentExercise.files[get().currentFileIndex]?.solution || '';
                const normalizedUser = normalizeCode(userCode, validation.exactMatch);
                const normalizedSolution = normalizeCode(solution, validation.exactMatch);
                passed = normalizedUser === normalizedSolution;
                score = passed ? 100 : 0;
                break;
                
              case 'pattern-match':
                score = 0;
                if (validation.patterns) {
                  validation.patterns.forEach(pattern => {
                    const regex = new RegExp(pattern.pattern, 'gim');
                    if (regex.test(userCode)) {
                      score += pattern.points || 10;
                      feedback.push(`✓ ${pattern.description}`);
                    } else if (pattern.required) {
                      feedback.push(`✗ ${pattern.description}`);
                    }
                  });
                }
                passed = score >= (validation.passingScore || 70);
                break;
                
              case 'semantic-match':
                // TODO: Implement semantic analysis
                passed = true;
                score = 100;
                break;
                
              case 'custom-function':
                // TODO: Implement custom validation function execution
                passed = true;
                score = 100;
                break;
                
              default:
                passed = true;
                score = 100;
            }
          } catch (error) {
            console.error('Validation error:', error);
            passed = false;
            score = 0;
            feedback.push('Validation error occurred');
          }
          
          const result = {
            passed,
            score: Math.min(100, Math.max(0, score)),
            feedback,
            timestamp: Date.now()
          };
          
          // Update progress if passed
          if (passed) {
            get().markExerciseComplete(currentExercise.id, score);
          }
          
          return result;
        },
        
        // Actions: Progress Tracking
        markExerciseComplete: (exerciseId, score = 100) => {
          set(state => {
            const newCompletedExercises = new Set(state.completedExercises);
            newCompletedExercises.add(exerciseId);
            
            const existingProgress = state.exerciseProgress[exerciseId] || {};
            const newProgress = {
              ...existingProgress,
              exerciseId,
              score: Math.max(existingProgress.score || 0, score),
              completed: true,
              completedAt: new Date().toISOString(),
              attempts: (existingProgress.attempts || 0) + 1,
              timeSpent: (existingProgress.timeSpent || 0) + (Date.now() - (existingProgress.startTime || Date.now())),
              hintsUsed: state.hints[exerciseId]?.length || 0
            };
            
            return {
              completedExercises: newCompletedExercises,
              exerciseProgress: {
                ...state.exerciseProgress,
                [exerciseId]: newProgress
              },
              sessionStats: {
                ...state.sessionStats,
                exercisesCompleted: state.sessionStats.exercisesCompleted + 1
              }
            };
          });
        },
        
        updateExerciseProgress: (exerciseId, updates) => {
          set(state => ({
            exerciseProgress: {
              ...state.exerciseProgress,
              [exerciseId]: {
                ...state.exerciseProgress[exerciseId],
                ...updates,
                updatedAt: new Date().toISOString()
              }
            }
          }));
        },
        
        // Actions: Hint System
        requestHint: (level) => {
          const { currentExercise } = get();
          if (!currentExercise) return null;
          
          const exerciseId = currentExercise.id;
          const hints = currentExercise.content.hints || [];
          const hint = hints.find(h => h.level === level);
          
          if (hint) {
            set(state => ({
              hints: {
                ...state.hints,
                [exerciseId]: [...(state.hints[exerciseId] || []), { level, timestamp: Date.now() }]
              },
              activeHintLevel: level,
              showHints: true,
              sessionStats: {
                ...state.sessionStats,
                totalHintsUsed: state.sessionStats.totalHintsUsed + 1
              }
            }));
            
            return hint;
          }
          
          return null;
        },
        
        toggleHints: () => set(state => ({ showHints: !state.showHints })),
        
        // Actions: Analytics
        trackExerciseStart: (exerciseId) => {
          set(state => ({
            exerciseProgress: {
              ...state.exerciseProgress,
              [exerciseId]: {
                ...state.exerciseProgress[exerciseId],
                exerciseId,
                startTime: Date.now(),
                started: true
              }
            },
            sessionStats: {
              ...state.sessionStats,
              exercisesAttempted: state.sessionStats.exercisesAttempted + 1
            }
          }));
        },
        
        getSessionStatistics: () => {
          const state = get();
          const currentTime = Date.now();
          const totalTime = currentTime - state.sessionStats.startTime;
          
          return {
            ...state.sessionStats,
            totalTime,
            completionRate: state.sessionStats.exercisesAttempted > 0 
              ? (state.sessionStats.exercisesCompleted / state.sessionStats.exercisesAttempted) * 100 
              : 0,
            averageTimePerExercise: state.sessionStats.exercisesCompleted > 0
              ? totalTime / state.sessionStats.exercisesCompleted
              : 0
          };
        },
        
        // Actions: Exercise Management
        addExercise: (exercise) => {
          // Validate exercise before adding
          const validation = validateExerciseData(exercise);
          if (!validation.success) {
            console.error('Cannot add invalid exercise:', validation.errors);
            return false;
          }
          
          set(state => ({
            exercises: [...state.exercises, exercise],
            validationResults: {
              ...state.validationResults,
              [exercise.id]: validation
            }
          }));
          
          return true;
        },
        
        updateExercise: (exerciseId, updates) => {
          set(state => ({
            exercises: state.exercises.map(ex => 
              ex.id === exerciseId ? { ...ex, ...updates } : ex
            )
          }));
        },
        
        removeExercise: (exerciseId) => {
          set(state => ({
            exercises: state.exercises.filter(ex => ex.id !== exerciseId),
            completedExercises: new Set([...state.completedExercises].filter(id => id !== exerciseId)),
            exerciseProgress: Object.fromEntries(
              Object.entries(state.exerciseProgress).filter(([id]) => id !== exerciseId)
            )
          }));
        },
        
        // Actions: Validation
        validateAllExercises: () => {
          const { exercises } = get();
          const validationResults = {};
          const qualityScores = {};
          
          exercises.forEach(exercise => {
            const validation = validateExerciseData(exercise);
            const quality = performQualityChecks(exercise);
            
            validationResults[exercise.id] = validation;
            qualityScores[exercise.id] = quality.qualityScore;
          });
          
          set({ validationResults, qualityScores });
          
          const invalid = Object.values(validationResults).filter(v => !v.success).length;
          const avgQuality = Object.values(qualityScores).reduce((sum, score) => sum + score, 0) / exercises.length;
          
          console.log(`Validation complete: ${exercises.length - invalid}/${exercises.length} valid, avg quality: ${avgQuality.toFixed(1)}`);
        },
        
        // Actions: UI State
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        
        // Utility Functions
        getExerciseById: (exerciseId) => {
          return get().exercises.find(ex => ex.id === exerciseId);
        },
        
        getExerciseProgress: (exerciseId) => {
          return get().exerciseProgress[exerciseId] || {};
        },
        
        isExerciseCompleted: (exerciseId) => {
          return get().completedExercises.has(exerciseId);
        },
        
        getOverallProgress: () => {
          const { exercises, completedExercises } = get();
          return {
            total: exercises.length,
            completed: completedExercises.size,
            percentage: exercises.length > 0 ? (completedExercises.size / exercises.length) * 100 : 0
          };
        },
        
        // Navigation helpers
        goToNext: () => {
          const { currentIndex, exercises } = get();
          const nextIndex = Math.min(currentIndex + 1, exercises.length - 1);
          if (nextIndex !== currentIndex && exercises[nextIndex]) {
            get().setCurrentExercise(exercises[nextIndex].id);
          }
        },
        
        goToPrevious: () => {
          const { currentIndex, exercises } = get();
          const prevIndex = Math.max(currentIndex - 1, 0);
          if (prevIndex !== currentIndex && exercises[prevIndex]) {
            get().setCurrentExercise(exercises[prevIndex].id);
          }
        },
        
        // Reset functions
        resetProgress: () => {
          set(state => ({
            completedExercises: new Set(),
            exerciseProgress: {},
            userAnswers: {},
            hints: {},
            sessionStats: {
              startTime: Date.now(),
              exercisesAttempted: 0,
              exercisesCompleted: 0,
              totalHintsUsed: 0,
              totalExecutions: 0,
              totalTime: 0
            },
            executionHistory: []
          }));
        }
      })),
      {
        name: 'enhanced-exercise-store',
        partialize: (state) => ({
          currentIndex: state.currentIndex,
          completedExercises: Array.from(state.completedExercises),
          exerciseProgress: state.exerciseProgress,
          userCode: state.userCode,
          userAnswers: state.userAnswers,
          hints: state.hints,
          sessionStats: state.sessionStats,
          sidebarCollapsed: state.sidebarCollapsed
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert Array back to Set after persistence
            state.completedExercises = new Set(state.completedExercises || []);
            
            // Initialize exercises if not loaded
            if (!state.exercises || state.exercises.length === 0) {
              state.initializeExercises?.();
            } else {
              // Ensure current exercise is set
              if (state.exercises && state.exercises[state.currentIndex]) {
                state.currentExercise = state.exercises[state.currentIndex];
                state.currentFile = state.currentExercise?.files?.[0] || null;
              }
            }
          }
        }
      }
    ),
    {
      name: 'enhanced-exercise-store'
    }
  )
);

/**
 * Helper function to normalize code for exact matching
 */
function normalizeCode(code, options = {}) {
  let normalized = code;
  
  if (options.ignoreWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }
  
  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }
  
  if (options.ignoreComments) {
    // Remove single-line comments
    normalized = normalized.replace(/\/\/.*$/gm, '');
    // Remove multi-line comments
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, '');
  }
  
  return normalized;
}

// Create selectors for common use cases
export const useCurrentExercise = () => useEnhancedExerciseStore(state => state.currentExercise);
export const useCurrentCode = () => useEnhancedExerciseStore(state => state.getCurrentCode());
export const useExerciseProgress = () => useEnhancedExerciseStore(state => state.getOverallProgress());
export const useSessionStats = () => useEnhancedExerciseStore(state => state.getSessionStatistics());

export default useEnhancedExerciseStore;