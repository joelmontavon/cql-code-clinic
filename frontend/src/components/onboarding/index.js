export { WelcomeModal } from './WelcomeModal.jsx';
export { PlatformTour } from './PlatformTour.jsx';
export { QuickStartTutorial } from './QuickStartTutorial.jsx';

// Onboarding utilities and configurations
export const OnboardingSteps = {
  WELCOME: 'welcome',
  PLATFORM_TOUR: 'platform_tour', 
  QUICK_START: 'quick_start'
};

export const OnboardingConfig = {
  STORAGE_KEY: 'cql-clinic-onboarding-state',
  WELCOME_COMPLETED_KEY: 'cql-clinic-welcome-completed',
  TOUR_COMPLETED_KEY: 'cql-clinic-tour-completed',
  QUICKSTART_COMPLETED_KEY: 'cql-clinic-quickstart-completed'
};

// Helper functions for onboarding state management
export const OnboardingHelpers = {
  isWelcomeCompleted: () => {
    return localStorage.getItem(OnboardingConfig.WELCOME_COMPLETED_KEY) === 'true';
  },
  
  isTourCompleted: () => {
    return localStorage.getItem(OnboardingConfig.TOUR_COMPLETED_KEY) === 'true';
  },
  
  isQuickStartCompleted: () => {
    return localStorage.getItem(OnboardingConfig.QUICKSTART_COMPLETED_KEY) !== null;
  },
  
  isOnboardingComplete: () => {
    return OnboardingHelpers.isWelcomeCompleted() && 
           OnboardingHelpers.isTourCompleted() &&
           OnboardingHelpers.isQuickStartCompleted();
  },
  
  markWelcomeCompleted: () => {
    localStorage.setItem(OnboardingConfig.WELCOME_COMPLETED_KEY, 'true');
  },
  
  markTourCompleted: () => {
    localStorage.setItem(OnboardingConfig.TOUR_COMPLETED_KEY, 'true');
  },
  
  resetOnboarding: () => {
    Object.values(OnboardingConfig).forEach(key => {
      localStorage.removeItem(key);
    });
  },
  
  shouldShowOnboarding: (user) => {
    // Show onboarding for new users or if they haven't completed it
    if (!user) return false;
    
    // Check if user is new (created recently)
    const userCreatedAt = new Date(user.createdAt || user.created_at);
    const daysSinceCreation = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Show onboarding for users created within last 7 days who haven't completed it
    return daysSinceCreation <= 7 && !OnboardingHelpers.isOnboardingComplete();
  },
  
  getNextOnboardingStep: () => {
    if (!OnboardingHelpers.isWelcomeCompleted()) {
      return OnboardingSteps.WELCOME;
    }
    if (!OnboardingHelpers.isTourCompleted()) {
      return OnboardingSteps.PLATFORM_TOUR;
    }
    if (!OnboardingHelpers.isQuickStartCompleted()) {
      return OnboardingSteps.QUICK_START;
    }
    return null;
  },
  
  getUserProfile: () => {
    try {
      const profile = localStorage.getItem('cql-clinic-profile');
      return profile ? JSON.parse(profile) : {};
    } catch (error) {
      console.warn('Failed to parse user profile:', error);
      return {};
    }
  }
};