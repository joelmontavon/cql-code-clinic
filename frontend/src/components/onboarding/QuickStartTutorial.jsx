import React, { useState, useEffect } from 'react';
import { 
  Modal, Card, Button, Alert, Badge, ProgressBar, 
  Row, Col, Form, Accordion
} from 'react-bootstrap';
import { 
  PlayCircle, CheckCircle, Clock, Target, Code, 
  ArrowRight, BookOpen, Lightbulb, Trophy,
  ChevronRight, ChevronLeft
} from 'react-bootstrap-icons';
import MonacoEditor from '@monaco-editor/react';
import { useCQLExecution } from '../../hooks/useCQLExecution.js';

/**
 * Quick Start Tutorial Component
 * Interactive 5-minute tutorial to get users started with CQL basics
 */
export function QuickStartTutorial({ 
  show, 
  onHide, 
  onComplete, 
  userProfile = {} 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [code, setCode] = useState('');
  const [stepResults, setStepResults] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);

  const { executeCode, isLoading, error, result } = useCQLExecution();

  const quickStartSteps = getQuickStartSteps(userProfile);

  // Initialize with first step code
  useEffect(() => {
    if (quickStartSteps[currentStep]?.initialCode) {
      setCode(quickStartSteps[currentStep].initialCode);
    }
  }, [currentStep, quickStartSteps]);

  const currentStepData = quickStartSteps[currentStep];
  const progress = ((currentStep + 1) / quickStartSteps.length) * 100;
  const isLastStep = currentStep === quickStartSteps.length - 1;

  const handleRunCode = async () => {
    if (!code.trim()) return;

    setIsExecuting(true);
    try {
      const executionResult = await executeCode(code);
      
      // Validate the result if step has validation
      if (currentStepData.validation) {
        const isValid = currentStepData.validation(code, executionResult);
        setStepResults(prev => ({
          ...prev,
          [currentStep]: { result: executionResult, isValid }
        }));
        
        if (isValid) {
          setCompletedSteps(prev => new Set([...prev, currentStep]));
        }
      } else {
        // Mark as completed if no validation required
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        setStepResults(prev => ({
          ...prev,
          [currentStep]: { result: executionResult, isValid: true }
        }));
      }
    } catch (err) {
      console.error('Code execution failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < quickStartSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const jumpToStep = (stepIndex) => {
    setCurrentStep(stepIndex);
  };

  const handleComplete = () => {
    // Record completion
    localStorage.setItem('cql-clinic-quickstart-completed', JSON.stringify({
      completedAt: new Date().toISOString(),
      stepsCompleted: Array.from(completedSteps),
      totalSteps: quickStartSteps.length,
      userProfile
    }));

    onComplete?.({
      stepsCompleted: Array.from(completedSteps),
      totalSteps: quickStartSteps.length,
      timeSpent: Date.now() - startTime
    });
  };

  const canProceed = () => {
    if (!currentStepData.requiresExecution) return true;
    return completedSteps.has(currentStep);
  };

  const startTime = React.useRef(Date.now()).current;
  const currentStepResult = stepResults[currentStep];

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      backdrop="static"
    >
      <Modal.Header closeButton className="border-bottom">
        <Modal.Title className="d-flex align-items-center gap-2">
          <PlayCircle className="text-primary" />
          CQL Quick Start Tutorial
          <Badge bg="info" className="ms-2">5 min</Badge>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-0">
        {/* Progress Header */}
        <div className="px-4 py-3 bg-light border-bottom">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">
              Step {currentStep + 1}: {currentStepData.title}
            </h6>
            <div className="d-flex align-items-center gap-2">
              <Clock size={16} className="text-muted" />
              <small className="text-muted">{currentStepData.duration}</small>
            </div>
          </div>
          <ProgressBar 
            now={progress} 
            variant="success" 
            style={{ height: '6px' }}
            className="mb-2"
          />
          <div className="d-flex justify-content-center gap-1">
            {quickStartSteps.map((_, index) => (
              <button
                key={index}
                className={`quick-start-step-indicator ${
                  index === currentStep ? 'active' : ''
                } ${completedSteps.has(index) ? 'completed' : ''}`}
                onClick={() => jumpToStep(index)}
                title={quickStartSteps[index].title}
              >
                {completedSteps.has(index) ? (
                  <CheckCircle size={12} />
                ) : (
                  <span className="step-number">{index + 1}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <Row className="g-0" style={{ height: '600px' }}>
          {/* Instructions Panel */}
          <Col md={5} className="border-end">
            <div className="p-4 h-100 overflow-auto">
              <div className="mb-3">
                <Badge 
                  bg={getDifficultyColor(currentStepData.difficulty)} 
                  className="me-2"
                >
                  {currentStepData.difficulty}
                </Badge>
                {currentStepData.concept && (
                  <Badge bg="outline-secondary">
                    {currentStepData.concept}
                  </Badge>
                )}
              </div>

              <div className="mb-4">
                <div dangerouslySetInnerHTML={{ __html: currentStepData.content }} />
              </div>

              {currentStepData.tips && (
                <Alert variant="info" className="mb-3">
                  <Lightbulb className="me-2" size={16} />
                  <strong>Tips:</strong>
                  <ul className="mb-0 mt-2">
                    {currentStepData.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {currentStepData.expectedOutput && (
                <Alert variant="success" className="mb-3">
                  <Target className="me-2" size={16} />
                  <strong>Expected Result:</strong> {currentStepData.expectedOutput}
                </Alert>
              )}

              {currentStepData.commonMistakes && (
                <Accordion className="mb-3">
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>
                      <small>Common Mistakes & Solutions</small>
                    </Accordion.Header>
                    <Accordion.Body className="py-2">
                      <ul className="mb-0">
                        {currentStepData.commonMistakes.map((mistake, index) => (
                          <li key={index} className="small text-muted mb-1">
                            {mistake}
                          </li>
                        ))}
                      </ul>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              )}

              {/* Step Result */}
              {currentStepResult && (
                <Alert 
                  variant={currentStepResult.isValid ? "success" : "warning"}
                  className="mb-0"
                >
                  {currentStepResult.isValid ? (
                    <>
                      <CheckCircle className="me-2" />
                      <strong>Great job!</strong> You've completed this step correctly.
                    </>
                  ) : (
                    <>
                      <strong>Not quite right.</strong> Check your code and try again.
                    </>
                  )}
                </Alert>
              )}
            </div>
          </Col>

          {/* Code Editor Panel */}
          <Col md={7}>
            <div className="h-100 d-flex flex-column">
              <div className="flex-grow-1">
                <MonacoEditor
                  height="100%"
                  language="cql"
                  value={code}
                  onChange={setCode}
                  options={{
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true
                  }}
                />
              </div>

              {/* Editor Controls */}
              <div className="border-top p-3 bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex gap-2">
                    <Button
                      variant="primary"
                      onClick={handleRunCode}
                      disabled={isExecuting || isLoading || !code.trim()}
                      className="d-flex align-items-center gap-2"
                    >
                      <Code size={16} />
                      {isExecuting || isLoading ? 'Running...' : 'Run Code'}
                    </Button>
                    
                    {currentStepData.showSolution && (
                      <Button
                        variant="outline-info"
                        size="sm"
                        onClick={() => setCode(currentStepData.solution)}
                      >
                        Show Solution
                      </Button>
                    )}
                  </div>

                  {currentStepData.keyboardHint && (
                    <small className="text-muted">
                      💡 Keyboard shortcut: <Badge bg="secondary">{currentStepData.keyboardHint}</Badge>
                    </small>
                  )}
                </div>

                {/* Results Display */}
                {(result || error) && (
                  <div className="mt-3 p-3 border rounded bg-white">
                    {error ? (
                      <Alert variant="danger" className="mb-0">
                        <strong>Error:</strong> {error}
                      </Alert>
                    ) : (
                      <div>
                        <h6 className="text-success mb-2">
                          <CheckCircle className="me-2" />
                          Execution Result:
                        </h6>
                        <pre className="mb-0 text-sm">{JSON.stringify(result, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button
          variant="outline-secondary"
          onClick={previousStep}
          disabled={currentStep === 0}
          className="d-flex align-items-center gap-2"
        >
          <ChevronLeft />
          Previous
        </Button>

        <div className="d-flex align-items-center gap-3">
          <small className="text-muted">
            {Array.from(completedSteps).length} of {quickStartSteps.length} completed
          </small>
          
          {!canProceed() && currentStepData.requiresExecution && (
            <small className="text-warning">
              Complete this step to continue
            </small>
          )}
        </div>

        <Button
          variant={isLastStep ? "success" : "primary"}
          onClick={nextStep}
          disabled={currentStepData.requiresExecution && !canProceed()}
          className="d-flex align-items-center gap-2"
        >
          {isLastStep ? (
            <>
              <Trophy />
              Complete Tutorial
            </>
          ) : (
            <>
              Next Step
              <ChevronRight />
            </>
          )}
        </Button>
      </Modal.Footer>

      <style jsx>{`
        .quick-start-step-indicator {
          width: 28px;
          height: 28px;
          border: 2px solid #dee2e6;
          border-radius: 50%;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 2px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 12px;
          font-weight: 600;
        }
        
        .quick-start-step-indicator:hover {
          border-color: #007bff;
          transform: scale(1.05);
        }
        
        .quick-start-step-indicator.active {
          border-color: #007bff;
          background-color: #007bff;
          color: white;
        }
        
        .quick-start-step-indicator.completed {
          border-color: #28a745;
          background-color: #28a745;
          color: white;
        }
        
        .step-number {
          font-size: 11px;
        }
      `}</style>
    </Modal>
  );
}

function getQuickStartSteps(userProfile) {
  const isBeginnerFriendly = userProfile.experience === 'none' || 
                           userProfile.experience === 'some-clinical';

  return [
    {
      title: 'Welcome to CQL',
      duration: '1 min',
      difficulty: 'beginner',
      concept: 'Introduction',
      content: `
        <h5>What is Clinical Quality Language (CQL)?</h5>
        <p>CQL is a high-level, domain-specific language for expressing clinical quality rules and decision support logic.</p>
        <h6>Key Features:</h6>
        <ul>
          <li><strong>Human-readable:</strong> Designed to be understood by clinicians</li>
          <li><strong>Precise:</strong> Mathematical precision for clinical calculations</li>
          <li><strong>Interoperable:</strong> Works with FHIR and other healthcare standards</li>
        </ul>
        <p>Let's start with the most basic CQL concept - defining simple values.</p>
      `,
      initialCode: `// Welcome to CQL Code Clinic!
// Let's start with a simple example

library QuickStart

define "Hello": 'Hello, CQL!'`,
      requiresExecution: true,
      expectedOutput: 'The string "Hello, CQL!"',
      keyboardHint: 'Ctrl+Enter',
      tips: [
        'Every CQL file starts with a library declaration',
        'Use "define" to create named expressions',
        'String values are enclosed in single quotes'
      ],
      validation: (code, result) => {
        return code.includes('define') && code.includes('Hello');
      }
    },

    {
      title: 'Working with Numbers',
      duration: '1 min', 
      difficulty: 'beginner',
      concept: 'Data Types',
      content: `
        <h5>CQL Data Types</h5>
        <p>CQL supports several data types commonly used in healthcare:</p>
        <ul>
          <li><strong>Integer:</strong> Whole numbers (1, 42, 100)</li>
          <li><strong>Decimal:</strong> Numbers with decimals (3.14, 98.6)</li>
          <li><strong>String:</strong> Text values ('Patient Name')</li>
          <li><strong>Boolean:</strong> True/false values</li>
        </ul>
        <p><strong>Try it:</strong> Define a patient's age and temperature.</p>
      `,
      initialCode: `library QuickStart

define "PatientAge": 45
define "BodyTemperature": 98.6

// Now try creating a Boolean - is the patient a minor?
define "IsMinor": PatientAge < 18`,
      requiresExecution: true,
      expectedOutput: 'Age: 45, Temperature: 98.6, IsMinor: false',
      tips: [
        'Integers don\'t need quotes: 45',
        'Decimals use a dot: 98.6', 
        'Comparison operators return true/false',
        'You can reference other definitions in your expressions'
      ],
      validation: (code, result) => {
        return code.includes('PatientAge') && code.includes('BodyTemperature') && code.includes('IsMinor');
      }
    },

    {
      title: 'Simple Calculations',
      duration: '1 min',
      difficulty: 'beginner', 
      concept: 'Expressions',
      content: `
        <h5>Mathematical Operations</h5>
        <p>CQL supports standard mathematical operations for clinical calculations:</p>
        <ul>
          <li><strong>+</strong> Addition</li>
          <li><strong>-</strong> Subtraction</li>
          <li><strong>*</strong> Multiplication</li>
          <li><strong>/</strong> Division</li>
        </ul>
        <p><strong>Try it:</strong> Calculate BMI (Body Mass Index).</p>
        <p><em>BMI = weight (kg) / height (m)²</em></p>
      `,
      initialCode: `library QuickStart

define "WeightKg": 70.5
define "HeightM": 1.75

// Calculate BMI
define "BMI": WeightKg / (HeightM * HeightM)

// Is the patient overweight? (BMI >= 25)
define "IsOverweight": BMI >= 25`,
      requiresExecution: true,
      expectedOutput: 'BMI around 23, IsOverweight: false',
      tips: [
        'Use parentheses to control order of operations',
        'BMI = weight(kg) / height(m)²',
        'Comparison operators: >=, <=, >, <, =, !='
      ],
      validation: (code, result) => {
        return code.includes('BMI') && code.includes('IsOverweight');
      }
    },

    {
      title: 'Working with Dates',
      duration: '1 min',
      difficulty: 'intermediate',
      concept: 'DateTime',
      content: `
        <h5>Dates and Times in Healthcare</h5>
        <p>Healthcare data heavily involves dates and times. CQL provides powerful date/time operations:</p>
        <ul>
          <li><strong>@2023-12-15</strong> - Date literal</li>
          <li><strong>@2023-12-15T10:30:00</strong> - DateTime literal</li>
          <li><strong>Today()</strong> - Current date</li>
        </ul>
        <p><strong>Try it:</strong> Calculate a patient's age from their birth date.</p>
      `,
      initialCode: `library QuickStart

define "BirthDate": @1978-05-15
define "Today": @2023-12-15

// Calculate age in years
define "AgeInYears": years between BirthDate and Today

// Is patient eligible for senior discount? (65+)
define "IsSenior": AgeInYears >= 65`,
      requiresExecution: true,
      expectedOutput: 'Age: 45 years, IsSenior: false',
      tips: [
        'Date literals start with @ symbol',
        '"years between" calculates complete years',
        'CQL handles leap years automatically'
      ],
      validation: (code, result) => {
        return code.includes('AgeInYears') && code.includes('between');
      }
    },

    {
      title: 'Congratulations!',
      duration: '1 min',
      difficulty: 'beginner',
      concept: 'Complete',
      content: `
        <h5>🎉 You've completed the CQL Quick Start!</h5>
        <p>In just 5 minutes, you've learned:</p>
        <ul>
          <li>✅ CQL library structure and definitions</li>
          <li>✅ Basic data types (numbers, strings, booleans)</li>
          <li>✅ Mathematical operations and comparisons</li>
          <li>✅ Date calculations for age</li>
        </ul>
        
        <h6>What's Next?</h6>
        <p>Ready to dive deeper? Try these next steps:</p>
        <ul>
          <li><strong>Beginner Track:</strong> Learn about clinical data and FHIR</li>
          <li><strong>Practice Exercises:</strong> Apply what you've learned</li>
          <li><strong>Real-world Projects:</strong> Build quality measures</li>
        </ul>
        
        <div class="alert alert-success">
          <strong>Pro Tip:</strong> The best way to learn CQL is through practice. 
          Start with simple exercises and gradually work up to complex clinical logic.
        </div>
      `,
      initialCode: `library QuickStart

// Congratulations! You now know CQL basics
define "Completed": 'Quick Start Tutorial Complete!'

// Challenge: Can you create a definition that 
// checks if today is your birthday?
define "IsBirthday": month from Today() = 12 and day from Today() = 15`,
      requiresExecution: false,
      showSolution: true,
      solution: `library QuickStart

define "Completed": 'Quick Start Tutorial Complete!'
define "MyBirthDate": @1990-12-15
define "Today": Today()
define "IsBirthday": 
  month from Today = month from MyBirthDate and 
  day from Today = day from MyBirthDate`,
      tips: [
        'You can extract month/day from dates using "month from" and "day from"',
        'Practice with different date functions',
        'Try building more complex clinical logic'
      ]
    }
  ];
}

function getDifficultyColor(difficulty) {
  const colors = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'danger'
  };
  return colors[difficulty] || 'secondary';
}

export default QuickStartTutorial;