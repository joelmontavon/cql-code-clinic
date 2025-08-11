import React, { useState, useEffect, useRef } from 'react';
import { 
  Overlay, Popover, Button, Badge, Card, Alert
} from 'react-bootstrap';
import { 
  ArrowLeft, ArrowRight, X, Lightbulb, Target, 
  CheckCircle, Play, BookOpen, Code, BarChart
} from 'react-bootstrap-icons';

/**
 * Platform Tour Component
 * Interactive guided tour with spotlight highlighting and contextual tips
 */
export function PlatformTour({ 
  isActive, 
  onComplete, 
  onSkip,
  tourSteps = defaultTourSteps 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState(null);
  const [overlayTarget, setOverlayTarget] = useState(null);
  const [showSpotlight, setShowSpotlight] = useState(false);

  const tourOverlayRef = useRef(null);
  const spotlightRef = useRef(null);

  // Initialize tour
  useEffect(() => {
    if (isActive) {
      document.body.classList.add('tour-active');
      startTourStep(0);
    }
    
    return () => {
      document.body.classList.remove('tour-active');
      clearHighlight();
    };
  }, [isActive]);

  // Handle step changes
  useEffect(() => {
    if (isActive && currentStep < tourSteps.length) {
      startTourStep(currentStep);
    }
  }, [currentStep, isActive]);

  const startTourStep = (stepIndex) => {
    const step = tourSteps[stepIndex];
    if (!step) return;

    // Find target element
    const targetElement = document.querySelector(step.target);
    
    if (targetElement) {
      highlightElement(targetElement, step);
      setOverlayTarget(targetElement);
      
      // Scroll element into view if needed
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    } else {
      console.warn(`Tour target not found: ${step.target}`);
      // Continue to next step if target not found
      if (stepIndex < tourSteps.length - 1) {
        setTimeout(() => setCurrentStep(stepIndex + 1), 1000);
      }
    }
  };

  const highlightElement = (element, step) => {
    clearHighlight();
    
    // Add highlight class
    element.classList.add('tour-highlighted');
    setHighlightedElement(element);
    
    // Create spotlight effect
    if (step.spotlight !== false) {
      createSpotlight(element);
    }
    
    // Add pulsing animation for important elements
    if (step.emphasis === 'high') {
      element.classList.add('tour-pulse');
    }
    
    // Temporarily disable interactive elements to prevent accidental clicks
    if (step.preventInteraction) {
      element.style.pointerEvents = 'none';
      setTimeout(() => {
        element.style.pointerEvents = '';
      }, 2000);
    }
  };

  const createSpotlight = (element) => {
    const rect = element.getBoundingClientRect();
    const spotlight = document.createElement('div');
    
    spotlight.className = 'tour-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      top: ${rect.top - 8}px;
      left: ${rect.left - 8}px;
      width: ${rect.width + 16}px;
      height: ${rect.height + 16}px;
      border-radius: 8px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      z-index: 9998;
      transition: all 0.3s ease;
    `;
    
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;
    setShowSpotlight(true);
  };

  const clearHighlight = () => {
    if (highlightedElement) {
      highlightedElement.classList.remove('tour-highlighted', 'tour-pulse');
      highlightedElement.style.pointerEvents = '';
      setHighlightedElement(null);
    }
    
    if (spotlightRef.current) {
      spotlightRef.current.remove();
      spotlightRef.current = null;
      setShowSpotlight(false);
    }
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    clearHighlight();
    document.body.classList.remove('tour-active');
    onSkip?.();
  };

  const completeTour = () => {
    clearHighlight();
    document.body.classList.remove('tour-active');
    
    // Mark tour as completed
    localStorage.setItem('cql-clinic-tour-completed', 'true');
    
    onComplete?.();
  };

  const jumpToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < tourSteps.length) {
      setCurrentStep(stepIndex);
    }
  };

  if (!isActive || currentStep >= tourSteps.length) {
    return null;
  }

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  return (
    <>
      {/* Tour Overlay */}
      <Overlay
        show={isActive && !!overlayTarget}
        target={overlayTarget}
        placement={step?.placement || 'bottom'}
        rootClose={false}
        ref={tourOverlayRef}
      >
        <Popover 
          className="tour-popover" 
          style={{ 
            maxWidth: '400px', 
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Popover.Header className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              {step.icon && <span style={{ fontSize: '1.2em' }}>{step.icon}</span>}
              <span className="fw-semibold">{step.title}</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <Badge bg="primary" pill>
                {currentStep + 1}/{tourSteps.length}
              </Badge>
              <Button 
                variant="link" 
                size="sm" 
                onClick={skipTour}
                className="p-0 text-muted"
              >
                <X />
              </Button>
            </div>
          </Popover.Header>
          
          <Popover.Body>
            <div className="mb-3">
              <p className="mb-2">{step.content}</p>
              
              {step.tip && (
                <Alert variant="info" className="py-2 px-3 mb-2">
                  <Lightbulb className="me-2" size={16} />
                  <small><strong>Tip:</strong> {step.tip}</small>
                </Alert>
              )}
              
              {step.warning && (
                <Alert variant="warning" className="py-2 px-3 mb-2">
                  <strong>Note:</strong> {step.warning}
                </Alert>
              )}
              
              {step.keyboardShortcut && (
                <div className="mb-2">
                  <small className="text-muted">
                    <strong>Keyboard shortcut:</strong>{' '}
                    <Badge bg="secondary">{step.keyboardShortcut}</Badge>
                  </small>
                </div>
              )}
            </div>
            
            {step.actionRequired && (
              <Alert variant="success" className="py-2 px-3 mb-3">
                <Target className="me-2" size={16} />
                <small><strong>Try it:</strong> {step.actionRequired}</small>
              </Alert>
            )}
            
            <div className="d-flex justify-content-between align-items-center">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={previousStep}
                disabled={isFirstStep}
                className="d-flex align-items-center gap-1"
              >
                <ArrowLeft size={14} />
                Previous
              </Button>
              
              <div className="d-flex align-items-center gap-1">
                {tourSteps.map((_, index) => (
                  <button
                    key={index}
                    className={`tour-step-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                    onClick={() => jumpToStep(index)}
                    title={`Go to step ${index + 1}: ${tourSteps[index].title}`}
                  />
                ))}
              </div>
              
              <Button
                variant={isLastStep ? "success" : "primary"}
                size="sm"
                onClick={nextStep}
                className="d-flex align-items-center gap-1"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle size={14} />
                    Finish Tour
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </div>
          </Popover.Body>
        </Popover>
      </Overlay>

      {/* Tour Progress Indicator */}
      {isActive && (
        <div className="tour-progress-indicator">
          <div className="tour-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* Tour Styles */}
      <style jsx global>{`
        body.tour-active {
          overflow: hidden;
        }
        
        .tour-highlighted {
          position: relative;
          z-index: 9997 !important;
          box-shadow: 0 0 0 4px #007bff !important;
          border-radius: 4px;
        }
        
        .tour-pulse {
          animation: tourPulse 2s infinite;
        }
        
        @keyframes tourPulse {
          0% { box-shadow: 0 0 0 4px #007bff; }
          50% { box-shadow: 0 0 0 8px rgba(0, 123, 255, 0.5); }
          100% { box-shadow: 0 0 0 4px #007bff; }
        }
        
        .tour-popover {
          font-size: 0.9rem;
        }
        
        .tour-step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background-color: #dee2e6;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 0 2px;
        }
        
        .tour-step-dot:hover {
          background-color: #adb5bd;
          transform: scale(1.2);
        }
        
        .tour-step-dot.active {
          background-color: #007bff;
          transform: scale(1.3);
        }
        
        .tour-step-dot.completed {
          background-color: #28a745;
        }
        
        .tour-progress-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background-color: rgba(0, 0, 0, 0.1);
          z-index: 9999;
        }
        
        .tour-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #007bff, #28a745);
          transition: width 0.3s ease;
        }
        
        .tour-spotlight {
          animation: spotlightAppear 0.3s ease-out;
        }
        
        @keyframes spotlightAppear {
          from {
            box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
          }
          to {
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
          }
        }
      `}</style>
    </>
  );
}

// Default tour steps for the CQL Code Clinic platform
const defaultTourSteps = [
  {
    target: '.navbar-brand, .app-header',
    title: 'Welcome to CQL Code Clinic',
    content: 'This is your dashboard for learning Clinical Quality Language. Let\'s take a quick tour to get you familiar with the platform.',
    icon: '👋',
    placement: 'bottom',
    spotlight: true,
    emphasis: 'high'
  },
  {
    target: '.exercise-nav, .sidebar, .navigation',
    title: 'Exercise Navigation',
    content: 'Browse through different exercises organized by difficulty and topic. Your progress is automatically saved.',
    icon: '📚',
    tip: 'Exercises are color-coded by difficulty: green (beginner), yellow (intermediate), red (advanced)',
    placement: 'right'
  },
  {
    target: '.code-editor, .monaco-editor',
    title: 'Professional Code Editor',
    content: 'Write and edit CQL code with full syntax highlighting, auto-completion, and real-time validation.',
    icon: '💻',
    keyboardShortcut: 'Ctrl+Enter',
    actionRequired: 'Try typing some CQL code to see the syntax highlighting in action',
    placement: 'top'
  },
  {
    target: '.results-panel, .output-panel',
    title: 'Results and Feedback',
    content: 'See your code execution results instantly. Get detailed error messages and hints to help you learn.',
    icon: '📊',
    tip: 'Error messages include line numbers and suggestions for fixes',
    placement: 'left'
  },
  {
    target: '.instructions-panel, .exercise-instructions',
    title: 'Exercise Instructions',
    content: 'Read the exercise requirements and background information here. Instructions include examples and expected outcomes.',
    icon: '📋',
    placement: 'bottom'
  },
  {
    target: '.hint-button, [title*="hint"], .help-button',
    title: 'Intelligent Hints',
    content: 'Stuck? Click for progressive hints that guide you toward the solution without giving it away.',
    icon: '💡',
    tip: 'Hints become more specific the more you use them',
    placement: 'bottom',
    actionRequired: 'Click the hint button to see how it works'
  },
  {
    target: '.progress-indicator, .progress-bar',
    title: 'Track Your Progress',
    content: 'Monitor your learning journey with detailed progress tracking and achievement badges.',
    icon: '🏆',
    placement: 'bottom'
  },
  {
    target: '.user-menu, .profile-menu, .account-dropdown',
    title: 'Your Account',
    content: 'Access your profile, view achievements, and customize your learning preferences.',
    icon: '👤',
    placement: 'bottom-start'
  }
];

export { defaultTourSteps };
export default PlatformTour;