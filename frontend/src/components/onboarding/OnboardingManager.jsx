import React, { useState, useEffect, useContext } from 'react';
import { 
  WelcomeModal, 
  PlatformTour, 
  QuickStartTutorial,
  OnboardingSteps,
  OnboardingHelpers 
} from './index.js';

/**
 * Onboarding Manager Component
 * Orchestrates the complete user onboarding experience
 */
export function OnboardingManager({ user, children }) {
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [userProfile, setUserProfile] = useState({});

  // Check onboarding state on mount and user change
  useEffect(() => {
    if (!user) return;

    const shouldShow = OnboardingHelpers.shouldShowOnboarding(user);
    if (shouldShow) {
      const nextStep = OnboardingHelpers.getNextOnboardingStep();
      startOnboardingStep(nextStep);
    }
    
    // Load user profile
    setUserProfile(OnboardingHelpers.getUserProfile());
  }, [user]);

  const startOnboardingStep = (step) => {
    setCurrentOnboardingStep(step);
    
    switch (step) {
      case OnboardingSteps.WELCOME:
        setShowWelcome(true);
        break;
      case OnboardingSteps.PLATFORM_TOUR:
        setShowTour(true);
        break;
      case OnboardingSteps.QUICK_START:
        setShowQuickStart(true);
        break;
      default:
        break;
    }
  };

  const handleWelcomeComplete = (data) => {
    console.log('Welcome completed:', data);
    setShowWelcome(false);
    OnboardingHelpers.markWelcomeCompleted();
    
    // Save user profile data
    if (data?.profile) {
      localStorage.setItem('cql-clinic-profile', JSON.stringify(data.profile));
      setUserProfile(data.profile);
    }
    
    // Move to next step
    const nextStep = OnboardingHelpers.getNextOnboardingStep();
    if (nextStep) {
      setTimeout(() => startOnboardingStep(nextStep), 500);
    }
  };

  const handleWelcomeSkip = () => {
    setShowWelcome(false);
    OnboardingHelpers.markWelcomeCompleted();
    
    // Show tour after a brief delay
    setTimeout(() => {
      if (!OnboardingHelpers.isTourCompleted()) {
        startOnboardingStep(OnboardingSteps.PLATFORM_TOUR);
      }
    }, 1000);
  };

  const handleStartTutorial = (tutorialType = 'welcome-to-cql') => {
    setShowWelcome(false);
    OnboardingHelpers.markWelcomeCompleted();
    
    // Start the appropriate tutorial
    setTimeout(() => startOnboardingStep(OnboardingSteps.QUICK_START), 500);
  };

  const handleTourComplete = () => {
    console.log('Platform tour completed');
    setShowTour(false);
    OnboardingHelpers.markTourCompleted();
    
    // Move to quick start if not completed
    if (!OnboardingHelpers.isQuickStartCompleted()) {
      setTimeout(() => startOnboardingStep(OnboardingSteps.QUICK_START), 500);
    }
  };

  const handleTourSkip = () => {
    setShowTour(false);
    OnboardingHelpers.markTourCompleted();
  };

  const handleQuickStartComplete = (data) => {
    console.log('Quick start completed:', data);
    setShowQuickStart(false);
    
    // Show completion celebration
    showOnboardingCompleteNotification(data);
  };

  const handleQuickStartSkip = () => {
    setShowQuickStart(false);
  };

  const showOnboardingCompleteNotification = (data) => {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'onboarding-complete-notification';
    notification.innerHTML = `
      <div class="alert alert-success alert-dismissible fade show position-fixed" 
           style="top: 20px; right: 20px; z-index: 10000; min-width: 300px;">
        <h6 class="mb-2">🎉 Welcome aboard!</h6>
        <p class="mb-2">You've completed the onboarding process!</p>
        <small class="text-muted">
          ${data?.stepsCompleted || 0} of ${data?.totalSteps || 5} steps completed
        </small>
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  };

  // Provide methods to manually trigger onboarding steps
  const triggerOnboarding = {
    welcome: () => startOnboardingStep(OnboardingSteps.WELCOME),
    tour: () => startOnboardingStep(OnboardingSteps.PLATFORM_TOUR),
    quickStart: () => startOnboardingStep(OnboardingSteps.QUICK_START),
    reset: () => {
      OnboardingHelpers.resetOnboarding();
      if (user && OnboardingHelpers.shouldShowOnboarding(user)) {
        startOnboardingStep(OnboardingHelpers.getNextOnboardingStep());
      }
    }
  };

  return (
    <OnboardingContext.Provider value={{ triggerOnboarding, currentOnboardingStep }}>
      {children}
      
      {/* Welcome Modal */}
      <WelcomeModal
        show={showWelcome}
        onHide={handleWelcomeSkip}
        onStartTutorial={handleStartTutorial}
        onSkipTutorial={handleWelcomeSkip}
        onComplete={handleWelcomeComplete}
        user={user}
      />
      
      {/* Platform Tour */}
      <PlatformTour
        isActive={showTour}
        onComplete={handleTourComplete}
        onSkip={handleTourSkip}
      />
      
      {/* Quick Start Tutorial */}
      <QuickStartTutorial
        show={showQuickStart}
        onHide={handleQuickStartSkip}
        onComplete={handleQuickStartComplete}
        userProfile={userProfile}
      />
    </OnboardingContext.Provider>
  );
}

// Context for accessing onboarding controls from anywhere in the app
const OnboardingContext = React.createContext({});

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingManager');
  }
  return context;
};

export default OnboardingManager;