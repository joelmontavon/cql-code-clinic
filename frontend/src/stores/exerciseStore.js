import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { getAllExercises } from '../services/exerciseImporter.js';

// Get comprehensive CQF exercises
const exerciseData = getAllExercises();

/**
 * Exercise Store
 * Manages exercise data, progress, and navigation state
 */
export const useExerciseStore = create()(
  devtools(
    persist(
      (set, get) => ({
        // Data
        exercises: exerciseData,
        currentIndex: 0,
        currentExercise: exerciseData[0] || null,
        code: '',
        isExecuting: false,
        lastResult: undefined,
        hasUnsavedChanges: false,
        
        // Progress tracking
        completedExercises: new Set(),
        exerciseProgress: {}, // { exerciseIndex: { score, timestamp, attempts } }
        
        // Actions
        setCurrentIndex: (index) => set((state) => {
          if (index >= 0 && index < state.exercises.length) {
            const exercise = state.exercises[index];
            return {
              currentIndex: index,
              currentExercise: exercise,
              code: exercise?.tabs?.[0]?.template || '',
              lastResult: undefined,
              hasUnsavedChanges: false
            };
          }
          return state;
        }),
        
        setCurrentExercise: (exercise) => set({ 
          currentExercise: exercise,
          code: exercise?.tabs?.[0]?.template || '',
          lastResult: undefined,
          hasUnsavedChanges: false
        }),

        setCode: (code) => {
          const { currentExercise } = get();
          const hasChanges = currentExercise?.tabs?.[0]?.template !== code;
          
          set({
            code,
            hasUnsavedChanges: hasChanges,
          });
        },

        setExecuting: (isExecuting) => {
          set({ isExecuting });
        },

        setLastResult: (result) => {
          set({ lastResult: result });
        },

        setUnsavedChanges: (hasChanges) => {
          set({ hasUnsavedChanges: hasChanges });
        },

        resetExercise: () => {
          const { currentExercise } = get();
          set({
            code: currentExercise?.tabs?.[0]?.template || '',
            lastResult: undefined,
            hasUnsavedChanges: false,
          });
        },
        
        markExerciseComplete: (index, score = 100) => set((state) => {
          const newCompletedExercises = new Set(state.completedExercises);
          newCompletedExercises.add(index);
          
          const newProgress = {
            ...state.exerciseProgress,
            [index]: {
              score,
              timestamp: new Date().toISOString(),
              attempts: (state.exerciseProgress[index]?.attempts || 0) + 1,
              completed: true
            }
          };
          
          return {
            completedExercises: newCompletedExercises,
            exerciseProgress: newProgress
          };
        }),
        
        setExerciseProgress: (index, progress) => set((state) => ({
          exerciseProgress: {
            ...state.exerciseProgress,
            [index]: {
              ...state.exerciseProgress[index],
              ...progress,
              timestamp: new Date().toISOString()
            }
          }
        })),
        
        // Navigation helpers
        goToNext: () => set((state) => {
          const nextIndex = Math.min(state.currentIndex + 1, state.exercises.length - 1);
          if (nextIndex !== state.currentIndex) {
            const exercise = state.exercises[nextIndex];
            return {
              currentIndex: nextIndex,
              currentExercise: exercise,
              code: exercise?.tabs?.[0]?.template || '',
              lastResult: undefined,
              hasUnsavedChanges: false
            };
          }
          return state;
        }),
        
        goToPrevious: () => set((state) => {
          const prevIndex = Math.max(state.currentIndex - 1, 0);
          if (prevIndex !== state.currentIndex) {
            const exercise = state.exercises[prevIndex];
            return {
              currentIndex: prevIndex,
              currentExercise: exercise,
              code: exercise?.tabs?.[0]?.template || '',
              lastResult: undefined,
              hasUnsavedChanges: false
            };
          }
          return state;
        }),
        
        // Reset progress
        resetProgress: () => set({
          completedExercises: new Set(),
          exerciseProgress: {},
          currentIndex: 0,
          currentExercise: exerciseData[0] || null,
          code: exerciseData[0]?.tabs?.[0]?.template || '',
          lastResult: undefined,
          hasUnsavedChanges: false
        }),
        
        // Get statistics
        getStatistics: () => {
          const state = get();
          const total = state.exercises.length;
          const completed = state.completedExercises.size;
          const completionRate = total > 0 ? (completed / total) * 100 : 0;
          
          const averageScore = completed > 0 ? 
            Array.from(state.completedExercises).reduce((sum, index) => {
              const progress = state.exerciseProgress[index];
              return sum + (progress?.score || 0);
            }, 0) / completed : 0;

          return {
            total,
            completed,
            remaining: total - completed,
            completionRate,
            averageScore: Math.round(averageScore),
            currentProgress: state.currentIndex + 1
          };
        }
      }),
      {
        name: 'cql-exercise-store',
        partialize: (state) => ({
          currentIndex: state.currentIndex,
          completedExercises: Array.from(state.completedExercises), // Convert Set to Array for persistence
          exerciseProgress: state.exerciseProgress,
          code: state.code,
          hasUnsavedChanges: state.hasUnsavedChanges
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Convert Array back to Set after persistence
            state.completedExercises = new Set(state.completedExercises || []);
            // Ensure current exercise is set
            state.currentExercise = state.exercises[state.currentIndex] || state.exercises[0];
            // Initialize code if not present
            if (!state.code && state.currentExercise) {
              state.code = state.currentExercise.tabs?.[0]?.template || '';
            }
          }
        }
      }
    ),
    {
      name: 'exercise-store',
    }
  )
);