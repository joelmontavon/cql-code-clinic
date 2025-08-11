import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Card, Button, ProgressBar, Badge, Alert, Offcanvas, 
  Overlay, Tooltip, Modal 
} from 'react-bootstrap';
import { 
  ChevronLeft, ChevronRight, Play, Pause, RotateCcw, 
  X, Lightbulb, CheckCircle, Circle, Target, Eye
} from 'react-bootstrap-icons';
import { useTutorial } from '../hooks/useTutorial.js';
import { useHint } from '../contexts/HintContext.jsx';
import MonacoEditor from '@monaco-editor/react';

/**
 * Interactive Tutorial Component
 * Provides guided, step-by-step tutorial experiences with highlighting, callouts, and progression
 */
export function InteractiveTutorial({ 
  tutorial, 
  onComplete, 
  onExit, 
  onStepChange,
  isActive = true 
}) {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [highlightElements, setHighlightElements] = useState([]);
  const [activeCallouts, setActiveCallouts] = useState([]);
  const [tutorialCode, setTutorialCode] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const editorRef = useRef(null);
  const tutorialContainerRef = useRef(null);

  const {
    currentStep,
    totalSteps,
    progress,
    canGoNext,
    canGoPrevious,
    nextStep,
    previousStep,
    jumpToStep,
    resetTutorial,
    completeTutorial,
    validateStep,
    getTutorialState,
    saveTutorialState
  } = useTutorial(tutorial);

  const { addContextualHint } = useHint();

  // Get current step data
  const stepData = tutorial?.steps?.[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  // Handle step changes
  useEffect(() => {
    if (stepData) {
      handleStepTransition(stepData);
      onStepChange?.(currentStep, stepData);
    }
  }, [currentStep, stepData]);

  // Handle tutorial auto-play
  useEffect(() => {
    let autoPlayTimer;
    if (isPlaying && stepData?.autoAdvance) {
      autoPlayTimer = setTimeout(() => {
        if (canGoNext) {
          nextStep();
        } else {
          setIsPlaying(false);
        }
      }, stepData.autoAdvance.delay || 3000);
    }
    return () => clearTimeout(autoPlayTimer);
  }, [isPlaying, stepData, canGoNext, nextStep]);

  const handleStepTransition = useCallback((step) => {
    // Update code if step has code content
    if (step.code !== undefined) {
      setTutorialCode(step.code);
    }

    // Apply highlighting
    if (step.highlights) {
      applyHighlighting(step.highlights);
    }

    // Show callouts
    if (step.callouts) {
      setActiveCallouts(step.callouts);
    }

    // Add contextual hints if available
    if (step.hint) {
      addContextualHint({
        type: 'tutorial',
        text: step.hint,
        priority: 0.9
      });
    }
  }, [addContextualHint]);

  const applyHighlighting = (highlights) => {
    const elements = highlights.map(highlight => ({
      ...highlight,
      id: Math.random().toString(36).substr(2, 9)
    }));
    setHighlightElements(elements);

    // Apply Monaco editor highlighting if targeting code
    if (editorRef.current && highlights.some(h => h.target === 'editor')) {
      const editor = editorRef.current;
      const codeHighlights = highlights.filter(h => h.target === 'editor');
      
      codeHighlights.forEach(highlight => {
        if (highlight.range) {
          editor.deltaDecorations([], [{
            range: new editor.getModel().constructor.Range(
              highlight.range.startLine,
              highlight.range.startColumn,
              highlight.range.endLine,
              highlight.range.endColumn
            ),
            options: {
              className: `tutorial-highlight-${highlight.style || 'primary'}`,
              hoverMessage: { value: highlight.message || '' }
            }
          }]);
        }
      });
    }
  };

  const handleNextStep = async () => {
    // Validate current step if required
    if (stepData?.validation) {
      const isValid = await validateStep(currentStep, {
        code: tutorialCode,
        userInput: getUserInput()
      });

      if (!isValid && stepData.validation.required) {
        return; // Don't advance if validation fails
      }
    }

    if (isLastStep) {
      handleCompleteTutorial();
    } else {
      nextStep();
    }
  };

  const handleCompleteTutorial = () => {
    completeTutorial();
    onComplete?.({
      tutorial: tutorial.id,
      completedSteps: totalSteps,
      timeSpent: getTutorialState().timeSpent,
      code: tutorialCode
    });
  };

  const handleExitTutorial = () => {
    // Save progress before exiting
    saveTutorialState();
    setShowExitConfirm(false);
    onExit?.();
  };

  const toggleAutoPlay = () => {
    setIsPlaying(!isPlaying);
  };

  const getUserInput = () => {
    // Collect any user input from interactive elements
    return {
      code: tutorialCode,
      // Add other input sources as needed
    };
  };

  const renderStepContent = () => {
    if (!stepData) return null;

    return (
      <div className="tutorial-step-content">
        {/* Step Title */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h4 className="tutorial-step-title">{stepData.title}</h4>
            <Badge bg="info" className="me-2">
              Step {currentStep + 1} of {totalSteps}
            </Badge>
            {stepData.type && (
              <Badge bg="secondary">{stepData.type}</Badge>
            )}
          </div>
          
          {stepData.difficulty && (
            <Badge 
              bg={getDifficultyColor(stepData.difficulty)}
              className="difficulty-badge"
            >
              {stepData.difficulty}
            </Badge>
          )}
        </div>

        {/* Step Description */}
        {stepData.description && (
          <Alert variant="info" className="tutorial-description">
            <div dangerouslySetInnerHTML={{ __html: stepData.description }} />
          </Alert>
        )}

        {/* Interactive Code Section */}
        {stepData.codeSection && (
          <Card className="mb-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <span className="fw-semibold">Interactive Code</span>
              {stepData.codeSection.editable && (
                <Badge bg="success">Editable</Badge>
              )}
            </Card.Header>
            <Card.Body className="p-0">
              <MonacoEditor
                ref={editorRef}
                height="300px"
                language="cql"
                value={tutorialCode}
                onChange={stepData.codeSection.editable ? setTutorialCode : undefined}
                options={{
                  readOnly: !stepData.codeSection.editable,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  lineNumbers: 'on',
                  folding: false,
                  renderLineHighlight: 'gutter'
                }}
                onMount={(editor) => {
                  editorRef.current = editor;
                  if (stepData.highlights) {
                    applyHighlighting(stepData.highlights);
                  }
                }}
              />
            </Card.Body>
          </Card>
        )}

        {/* Practice Checkpoint */}
        {stepData.checkpoint && (
          <TutorialCheckpoint
            checkpoint={stepData.checkpoint}
            code={tutorialCode}
            onComplete={(result) => {
              if (result.success) {
                stepData.checkpointCompleted = true;
              }
            }}
          />
        )}

        {/* Step Instructions */}
        {stepData.instructions && (
          <Card className="tutorial-instructions mb-3">
            <Card.Header>
              <Target className="me-2" />
              What to do
            </Card.Header>
            <Card.Body>
              <div dangerouslySetInnerHTML={{ __html: stepData.instructions }} />
            </Card.Body>
          </Card>
        )}

        {/* Expected Outcome */}
        {stepData.expectedOutcome && (
          <Alert variant="success" className="expected-outcome">
            <CheckCircle className="me-2" />
            <strong>Expected Result:</strong> {stepData.expectedOutcome}
          </Alert>
        )}
      </div>
    );
  };

  const renderCallouts = () => {
    return activeCallouts.map(callout => (
      <TutorialCallout
        key={callout.id}
        callout={callout}
        onClose={() => {
          setActiveCallouts(prev => prev.filter(c => c.id !== callout.id));
        }}
      />
    ));
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      beginner: 'success',
      intermediate: 'warning', 
      advanced: 'danger'
    };
    return colors[difficulty] || 'secondary';
  };

  if (!isActive || !tutorial) {
    return null;
  }

  return (
    <div ref={tutorialContainerRef} className="interactive-tutorial">
      {/* Tutorial Header */}
      <Card className="tutorial-header mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <h5 className="mb-0">
              <Play className="me-2" />
              {tutorial.title}
            </h5>
            {tutorial.estimatedTime && (
              <Badge bg="outline-secondary">
                ~{tutorial.estimatedTime} min
              </Badge>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Auto-play Toggle */}
            <Button
              variant="outline-primary"
              size="sm"
              onClick={toggleAutoPlay}
              title={isPlaying ? "Pause auto-advance" : "Auto-advance steps"}
            >
              {isPlaying ? <Pause /> : <Play />}
            </Button>

            {/* Reset Tutorial */}
            <Button
              variant="outline-warning"
              size="sm"
              onClick={resetTutorial}
              title="Reset tutorial"
            >
              <RotateCcw />
            </Button>

            {/* Exit Tutorial */}
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => setShowExitConfirm(true)}
              title="Exit tutorial"
            >
              <X />
            </Button>
          </div>
        </Card.Header>

        {/* Progress Bar */}
        <div className="px-3 pb-3">
          <ProgressBar
            now={progress}
            label={`${Math.round(progress)}%`}
            variant="info"
            style={{ height: '8px' }}
          />
        </div>
      </Card>

      {/* Tutorial Content */}
      <div className="tutorial-content">
        {renderStepContent()}
      </div>

      {/* Tutorial Navigation */}
      <Card className="tutorial-navigation mt-3">
        <Card.Body className="d-flex justify-content-between align-items-center">
          <Button
            variant="outline-secondary"
            onClick={previousStep}
            disabled={!canGoPrevious}
            className="d-flex align-items-center gap-2"
          >
            <ChevronLeft />
            Previous
          </Button>

          <div className="d-flex align-items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <button
                key={i}
                className={`step-indicator ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
                onClick={() => jumpToStep(i)}
                title={`Go to step ${i + 1}`}
              >
                {i < currentStep ? <CheckCircle /> : <Circle />}
              </button>
            ))}
          </div>

          <Button
            variant={isLastStep ? "success" : "primary"}
            onClick={handleNextStep}
            disabled={!canGoNext}
            className="d-flex align-items-center gap-2"
          >
            {isLastStep ? "Complete Tutorial" : "Next"}
            {!isLastStep && <ChevronRight />}
          </Button>
        </Card.Body>
      </Card>

      {/* Callouts */}
      {renderCallouts()}

      {/* Exit Confirmation Modal */}
      <Modal
        show={showExitConfirm}
        onHide={() => setShowExitConfirm(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Exit Tutorial?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to exit the tutorial?</p>
          <p className="text-muted">Your progress will be saved and you can resume later.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExitConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleExitTutorial}>
            Exit Tutorial
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .tutorial-highlight-primary {
          background-color: rgba(0, 123, 255, 0.2);
          border: 2px solid #007bff;
        }
        
        .tutorial-highlight-success {
          background-color: rgba(40, 167, 69, 0.2);
          border: 2px solid #28a745;
        }
        
        .tutorial-highlight-warning {
          background-color: rgba(255, 193, 7, 0.2);
          border: 2px solid #ffc107;
        }

        .step-indicator {
          background: none;
          border: none;
          padding: 4px;
          border-radius: 50%;
          cursor: pointer;
        }

        .step-indicator.active {
          color: #007bff;
        }

        .step-indicator.completed {
          color: #28a745;
        }

        .tutorial-description {
          border-left: 4px solid #17a2b8;
        }

        .tutorial-instructions {
          border-left: 4px solid #28a745;
        }

        .expected-outcome {
          border-left: 4px solid #28a745;
        }
      `}</style>
    </div>
  );
}

/**
 * Tutorial Checkpoint Component
 * Mini-exercises within tutorial steps
 */
function TutorialCheckpoint({ checkpoint, code, onComplete }) {
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleValidate = () => {
    // Simple validation logic - in real implementation, this would be more sophisticated
    const result = {
      success: checkpoint.validation(code),
      feedback: checkpoint.successMessage || 'Great job!'
    };

    if (result.success) {
      setCompleted(true);
      setFeedback(result.feedback);
      onComplete(result);
    } else {
      setFeedback(checkpoint.failureMessage || 'Try again - check your code against the instructions');
    }
  };

  return (
    <Card className="tutorial-checkpoint mb-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <span className="fw-semibold">
          <Target className="me-2" />
          Practice Checkpoint
        </span>
        {completed && <CheckCircle className="text-success" />}
      </Card.Header>
      <Card.Body>
        <p>{checkpoint.instructions}</p>
        {feedback && (
          <Alert variant={completed ? "success" : "warning"}>
            {feedback}
          </Alert>
        )}
        {!completed && (
          <Button variant="primary" onClick={handleValidate}>
            Check My Work
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

/**
 * Tutorial Callout Component
 * Interactive explanations and additional information
 */
function TutorialCallout({ callout, onClose }) {
  const [show, setShow] = useState(true);

  return (
    <Offcanvas
      show={show}
      onHide={() => {
        setShow(false);
        onClose();
      }}
      placement={callout.placement || 'end'}
      backdrop={false}
    >
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>
          <Lightbulb className="me-2" />
          {callout.title}
        </Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <div dangerouslySetInnerHTML={{ __html: callout.content }} />
        {callout.action && (
          <Button
            variant="primary"
            className="mt-3"
            onClick={callout.action.handler}
          >
            {callout.action.label}
          </Button>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export default InteractiveTutorial;