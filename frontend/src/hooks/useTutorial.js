import { useState, useEffect, useCallback, useMemo } from 'react';
import { tutorialAPI } from '../services/tutorialAPI.js';

/**
 * Tutorial Management Hook
 * Handles tutorial state, progress, navigation, and analytics
 */
export function useTutorial(tutorial) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialState, setTutorialState] = useState({
    startTime: null,
    timeSpent: 0,
    stepsCompleted: [],
    userChoices: {},
    checkpointsCompleted: [],
    lastSaved: null
  });
  const [validationResults, setValidationResults] = useState({});

  const totalSteps = tutorial?.steps?.length || 0;

  // Initialize tutorial
  useEffect(() => {
    if (tutorial?.id) {
      initializeTutorial();
    }
  }, [tutorial?.id]);

  // Update time spent
  useEffect(() => {
    let timeTracker;
    if (tutorialState.startTime) {
      timeTracker = setInterval(() => {
        setTutorialState(prev => ({
          ...prev,
          timeSpent: Date.now() - prev.startTime
        }));
      }, 1000);
    }
    return () => clearInterval(timeTracker);
  }, [tutorialState.startTime]);

  const initializeTutorial = async () => {
    try {
      // Load saved tutorial state if exists
      const savedState = await tutorialAPI.getTutorialState(tutorial.id);
      
      if (savedState) {
        setCurrentStep(savedState.currentStep || 0);
        setTutorialState({
          ...savedState,
          timeSpent: Date.now() - (savedState.lastSaved || savedState.startTime)
        });
      } else {
        // Initialize new tutorial session
        setTutorialState(prev => ({
          ...prev,
          startTime: Date.now()
        }));
        
        // Track tutorial start
        await tutorialAPI.trackTutorialEvent({
          tutorialId: tutorial.id,
          event: 'tutorial_started',
          step: 0,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.warn('Could not load tutorial state:', error);
      // Continue with fresh state
      setTutorialState(prev => ({
        ...prev,
        startTime: Date.now()
      }));
    }
  };

  // Calculate progress percentage
  const progress = useMemo(() => {
    if (totalSteps === 0) return 0;
    return ((currentStep + 1) / totalSteps) * 100;
  }, [currentStep, totalSteps]);

  // Navigation helpers
  const canGoNext = useMemo(() => {
    if (currentStep >= totalSteps - 1) return false;
    
    const currentStepData = tutorial?.steps?.[currentStep];
    
    // Check if current step requires validation
    if (currentStepData?.validation?.required) {
      return validationResults[currentStep]?.isValid === true;
    }
    
    // Check if checkpoint is required and completed
    if (currentStepData?.checkpoint?.required) {
      return tutorialState.checkpointsCompleted.includes(currentStep);
    }
    
    return true;
  }, [currentStep, totalSteps, tutorial?.steps, validationResults, tutorialState.checkpointsCompleted]);

  const canGoPrevious = useMemo(() => {
    return currentStep > 0;
  }, [currentStep]);

  // Navigation actions
  const nextStep = useCallback(async () => {
    if (!canGoNext) return;

    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    
    // Mark current step as completed
    setTutorialState(prev => ({
      ...prev,
      stepsCompleted: [...new Set([...prev.stepsCompleted, currentStep])]
    }));

    // Track step completion
    await tutorialAPI.trackTutorialEvent({
      tutorialId: tutorial.id,
      event: 'step_completed',
      step: currentStep,
      timestamp: Date.now(),
      timeOnStep: calculateTimeOnStep()
    });

    // Track step start
    await tutorialAPI.trackTutorialEvent({
      tutorialId: tutorial.id,
      event: 'step_started',
      step: newStep,
      timestamp: Date.now()
    });
  }, [canGoNext, currentStep, tutorial?.id]);

  const previousStep = useCallback(() => {
    if (!canGoPrevious) return;
    
    const newStep = currentStep - 1;
    setCurrentStep(newStep);
    
    // Track backward navigation
    tutorialAPI.trackTutorialEvent({
      tutorialId: tutorial.id,
      event: 'step_back',
      step: newStep,
      timestamp: Date.now()
    });
  }, [canGoPrevious, currentStep, tutorial?.id]);

  const jumpToStep = useCallback((stepIndex) => {
    if (stepIndex < 0 || stepIndex >= totalSteps) return;
    
    setCurrentStep(stepIndex);
    
    // Track jump navigation
    tutorialAPI.trackTutorialEvent({
      tutorialId: tutorial.id,
      event: 'step_jumped',
      step: stepIndex,
      previousStep: currentStep,
      timestamp: Date.now()
    });
  }, [totalSteps, currentStep, tutorial?.id]);

  const resetTutorial = useCallback(async () => {
    setCurrentStep(0);
    setTutorialState({
      startTime: Date.now(),
      timeSpent: 0,
      stepsCompleted: [],
      userChoices: {},
      checkpointsCompleted: [],
      lastSaved: null
    });
    setValidationResults({});
    
    // Clear saved state
    await tutorialAPI.clearTutorialState(tutorial.id);
    
    // Track reset
    await tutorialAPI.trackTutorialEvent({
      tutorialId: tutorial.id,
      event: 'tutorial_reset',
      timestamp: Date.now()
    });
  }, [tutorial?.id]);

  const completeTutorial = useCallback(async () => {
    // Mark all steps as completed
    setTutorialState(prev => ({
      ...prev,
      stepsCompleted: Array.from({ length: totalSteps }, (_, i) => i)
    }));

    // Track tutorial completion
    const completionData = {
      tutorialId: tutorial.id,
      event: 'tutorial_completed',
      totalSteps,
      timeSpent: tutorialState.timeSpent,
      checkpointsCompleted: tutorialState.checkpointsCompleted.length,
      timestamp: Date.now()
    };

    await tutorialAPI.trackTutorialEvent(completionData);
    await tutorialAPI.completeTutorial(tutorial.id, completionData);
  }, [tutorial?.id, totalSteps, tutorialState]);

  // Validation
  const validateStep = useCallback(async (stepIndex, data) => {
    const stepData = tutorial?.steps?.[stepIndex];
    if (!stepData?.validation) return true;

    try {
      const result = await tutorialAPI.validateStep(
        tutorial.id,
        stepIndex,
        data,
        stepData.validation
      );

      setValidationResults(prev => ({
        ...prev,
        [stepIndex]: result
      }));

      // Track validation attempt
      await tutorialAPI.trackTutorialEvent({
        tutorialId: tutorial.id,
        event: 'step_validated',
        step: stepIndex,
        result: result.isValid,
        attempts: (validationResults[stepIndex]?.attempts || 0) + 1,
        timestamp: Date.now()
      });

      return result.isValid;
    } catch (error) {
      console.error('Step validation failed:', error);
      return false;
    }
  }, [tutorial, validationResults]);

  // State management
  const saveTutorialState = useCallback(async () => {
    const stateToSave = {
      ...tutorialState,
      currentStep,
      lastSaved: Date.now(),
      validationResults
    };

    try {
      await tutorialAPI.saveTutorialState(tutorial.id, stateToSave);
      setTutorialState(prev => ({ ...prev, lastSaved: Date.now() }));
    } catch (error) {
      console.warn('Could not save tutorial state:', error);
    }
  }, [tutorial?.id, tutorialState, currentStep, validationResults]);

  const getTutorialState = useCallback(() => {
    return {
      ...tutorialState,
      currentStep,
      progress,
      canGoNext,
      canGoPrevious,
      validationResults
    };
  }, [tutorialState, currentStep, progress, canGoNext, canGoPrevious, validationResults]);

  // Record user choice (for branching tutorials)
  const recordUserChoice = useCallback((choiceId, choice) => {
    setTutorialState(prev => ({
      ...prev,
      userChoices: {
        ...prev.userChoices,
        [choiceId]: choice
      }
    }));

    // Track user choice
    tutorialAPI.trackTutorialEvent({
      tutorialId: tutorial.id,
      event: 'user_choice',
      step: currentStep,
      choiceId,
      choice,
      timestamp: Date.now()
    });
  }, [tutorial?.id, currentStep]);

  // Complete checkpoint
  const completeCheckpoint = useCallback(async (stepIndex, checkpointData) => {
    setTutorialState(prev => ({
      ...prev,
      checkpointsCompleted: [...new Set([...prev.checkpointsCompleted, stepIndex])]
    }));

    // Track checkpoint completion
    await tutorialAPI.trackTutorialEvent({
      tutorialId: tutorial.id,
      event: 'checkpoint_completed',
      step: stepIndex,
      checkpointData,
      timestamp: Date.now()
    });
  }, [tutorial?.id]);

  // Auto-save periodically
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (tutorialState.startTime) {
        saveTutorialState();
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [saveTutorialState, tutorialState.startTime]);

  // Helper function to calculate time on current step
  const calculateTimeOnStep = () => {
    const stepStartTime = tutorialState.stepStartTimes?.[currentStep];
    return stepStartTime ? Date.now() - stepStartTime : 0;
  };

  // Get step-specific data
  const getCurrentStepData = () => {
    return tutorial?.steps?.[currentStep];
  };

  // Get completion statistics
  const getCompletionStats = () => {
    return {
      stepsCompleted: tutorialState.stepsCompleted.length,
      totalSteps,
      completionPercentage: (tutorialState.stepsCompleted.length / totalSteps) * 100,
      checkpointsCompleted: tutorialState.checkpointsCompleted.length,
      timeSpent: tutorialState.timeSpent,
      averageTimePerStep: tutorialState.stepsCompleted.length > 0 ? 
        tutorialState.timeSpent / tutorialState.stepsCompleted.length : 0
    };
  };

  // Determine if tutorial is branching type
  const isBranchingTutorial = () => {
    return tutorial?.type === 'branching' || 
           tutorial?.steps?.some(step => step.branches?.length > 0);
  };

  // Get next step based on branching logic
  const getNextStepIndex = () => {
    const currentStepData = getCurrentStepData();
    
    if (currentStepData?.branches && currentStepData.branches.length > 0) {
      // Find the branch that matches current state
      for (const branch of currentStepData.branches) {
        if (evaluateBranchCondition(branch.condition, tutorialState)) {
          return branch.nextStep;
        }
      }
    }
    
    return currentStep + 1;
  };

  // Evaluate branch condition
  const evaluateBranchCondition = (condition, state) => {
    try {
      // Simple condition evaluation - could be expanded
      if (condition.type === 'choice') {
        return state.userChoices[condition.choiceId] === condition.expectedValue;
      }
      if (condition.type === 'performance') {
        return state.checkpointsCompleted.length >= condition.minCheckpoints;
      }
      return true;
    } catch (error) {
      console.warn('Branch condition evaluation failed:', error);
      return true; // Default to continuing normally
    }
  };

  return {
    // Navigation state
    currentStep,
    totalSteps,
    progress,
    canGoNext,
    canGoPrevious,
    
    // Navigation actions
    nextStep,
    previousStep,
    jumpToStep,
    resetTutorial,
    completeTutorial,
    
    // Validation
    validateStep,
    validationResults,
    
    // State management
    tutorialState,
    getTutorialState,
    saveTutorialState,
    
    // User interactions
    recordUserChoice,
    completeCheckpoint,
    
    // Utilities
    getCurrentStepData,
    getCompletionStats,
    isBranchingTutorial,
    getNextStepIndex
  };
}

export default useTutorial;