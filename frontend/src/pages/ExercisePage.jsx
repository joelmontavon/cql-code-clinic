import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Container, Row, Col, Toast, ToastContainer } from 'react-bootstrap';
import { ErrorBoundary, ExerciseErrorFallback, EditorErrorFallback } from '../components/ErrorBoundary';
import { ExerciseLoadingSkeleton, CodeEditorLoading, ExerciseListLoading } from '../components/LoadingStates';
import { NetworkError, OfflineFallback, useApiErrorHandler } from '../components/NetworkErrorHandler';
import { InstructionsPanel } from '../components/exercise/InstructionsPanel';
import { CodeEditor } from '../components/exercise/CodeEditor';
import { ResultsPanel } from '../components/exercise/ResultsPanel';
import { ExerciseNavigation } from '../components/exercise/ExerciseNavigation';
import { useExerciseStore } from '../stores/exerciseStore';
import { useExercise } from '../hooks/useExercise';
import { useCQLExecution } from '../hooks/useCQLExecution';

export function ExercisePage() {
  const {
    currentExercise,
    currentIndex,
    exercises,
    completedExercises,
    code,
    setCode,
    resetExercise,
    setCurrentIndex
  } = useExerciseStore();

  const {
    goToExercise,
    nextExercise,
    previousExercise,
    completeExercise,
    validateExercise,
    canNavigate,
    currentStatus,
    loading: exerciseLoading,
    error: exerciseError
  } = useExercise();

  const {
    execute,
    isExecuting,
    lastResult,
    error: executionError,
    executionHistory,
    getFormattedResults,
    resetState
  } = useCQLExecution();

  const { handleError } = useApiErrorHandler();
  const [status, setStatus] = useState('idle');
  const [toast, setToast] = useState({ show: false, message: '', variant: 'info' });
  const [networkError, setNetworkError] = useState(null);

  // Handle code changes
  const handleCodeChange = useCallback((newCode) => {
    setCode(newCode);
  }, [setCode]);

  // Handle reset
  const handleReset = useCallback(() => {
    resetExercise();
    setToast({
      show: true,
      message: 'Code reset to template',
      variant: 'info'
    });
  }, [resetExercise]);

  // Handle run
  const handleRun = useCallback(async () => {
    if (!code?.trim()) {
      setToast({
        show: true,
        message: 'Please enter some CQL code to run',
        variant: 'warning'
      });
      return;
    }

    try {
      setStatus('running');
      setNetworkError(null);
      // Clear any previous results and error states
      resetState();
      setToast({ show: false, message: '', variant: 'info' });
      
      console.log('=== ExercisePage Execute Debug ===');
      console.log('Code to execute:', code);
      const result = await execute(code);
      console.log('Execute result:', result);
      setStatus('success');
      
      setToast({
        show: true,
        message: 'Code executed successfully!',
        variant: 'success'
      });
    } catch (error) {
      setStatus('error');
      console.error('Execution error:', error);
      console.error('Error details:', { 
        message: error.message, 
        stack: error.stack,
        name: error.name 
      });
      
      const processedError = handleError(error);
      console.log('Processed error:', processedError);
      
      if (processedError.type === 'network') {
        setNetworkError(processedError);
      } else {
        setToast({
          show: true,
          message: processedError.userMessage,
          variant: 'danger'
        });
      }
    }
  }, [code, execute, handleError]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!code?.trim()) {
      setToast({
        show: true,
        message: 'Please enter some code before submitting',
        variant: 'warning'
      });
      return;
    }

    try {
      setStatus('submitting');
      setNetworkError(null);
      // Clear any previous results and error states
      resetState();
      setToast({ show: false, message: '', variant: 'info' });
      
      // First run the code
      await execute(code);
      
      // Then validate the exercise
      const validation = await validateExercise(code);
      
      if (validation.isValid) {
        completeExercise(currentIndex, validation.score);
        setStatus('success');
        
        setToast({
          show: true,
          message: `${validation.message} (Score: ${validation.score}%)`,
          variant: 'success'
        });

        // Auto-advance to next exercise after a delay
        if (canNavigate.next) {
          setTimeout(() => {
            nextExercise();
          }, 2000);
        }
      } else {
        setStatus('error');
        
        setToast({
          show: true,
          message: validation.message,
          variant: 'warning'
        });
      }
    } catch (error) {
      setStatus('error');
      console.error('Submission error:', error);
      
      const processedError = handleError(error);
      
      if (processedError.type === 'network') {
        setNetworkError(processedError);
      } else {
        setToast({
          show: true,
          message: processedError.userMessage,
          variant: 'danger'
        });
      }
    }
  }, [code, execute, validateExercise, completeExercise, currentIndex, canNavigate.next, nextExercise, handleError]);

  // Get execution results for display
  const displayResults = lastResult?.result?.data || null;
  const displayLogs = status === 'error' 
    ? (lastResult?.error || executionError?.message || '') 
    : '';

  // Reset status when exercise changes
  useEffect(() => {
    setStatus('idle');
  }, [currentIndex]);

  return (
    <OfflineFallback>
      <Container fluid className="h-100 p-0">
        <Row className="h-100 g-0">
          {/* Left Sidebar - Exercise Navigation */}
          <Col xs={12} lg={3} className="border-end bg-light">
            <div style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
              <ErrorBoundary fallback={ExerciseErrorFallback}>
                <Suspense fallback={<ExerciseListLoading />}>
                  <ExerciseNavigation
                    exercises={exercises}
                    currentIndex={currentIndex}
                    completedExercises={completedExercises}
                    onExerciseSelect={goToExercise}
                    onNext={nextExercise}
                    onPrevious={previousExercise}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
          </Col>

          {/* Main Content */}
          <Col xs={12} lg={9}>
            <Row className="h-100 g-0">
              {/* Instructions Panel */}
              <Col xs={12} lg={5} className="border-end bg-white">
                <div style={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
                  <div className="p-3 h-100">
                    <ErrorBoundary fallback={ExerciseErrorFallback}>
                      <InstructionsPanel 
                        exercise={currentExercise}
                        className="border-0"
                      />
                    </ErrorBoundary>
                  </div>
                </div>
              </Col>
              
              {/* Code Editor and Results */}
              <Col xs={12} lg={7} className="d-flex flex-column">
                {/* Network Error Display */}
                {networkError && (
                  <div className="p-3">
                    <NetworkError 
                      error={networkError} 
                      onRetry={() => {
                        setNetworkError(null);
                        if (status === 'running') {
                          handleRun();
                        } else if (status === 'submitting') {
                          handleSubmit();
                        }
                      }}
                    />
                  </div>
                )}
                
                {/* Code Editor - Top Half */}
                <div className="p-3" style={{ height: '50vh' }}>
                  <ErrorBoundary fallback={EditorErrorFallback}>
                    <Suspense fallback={<CodeEditorLoading />}>
                      <CodeEditor
                        exercise={currentExercise}
                        status={status}
                        height="calc(50vh - 40px)"
                        onReset={handleReset}
                        onRun={handleRun}
                        onSubmit={handleSubmit}
                        onCodeChange={handleCodeChange}
                        showCheat={true}
                      />
                    </Suspense>
                  </ErrorBoundary>
                </div>
                
                {/* Results Panel - Bottom Half */}
                <div className="p-3 border-top" style={{ height: '50vh' }}>
                  <ErrorBoundary fallback={ExerciseErrorFallback}>
                    <ResultsPanel
                      results={displayResults}
                      status={status}
                      logs={displayLogs}
                      height="100%"
                      onClear={() => {
                        setStatus('idle');
                        setNetworkError(null);
                      }}
                    />
                  </ErrorBoundary>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Toast Notifications */}
        <ToastContainer position="top-end" className="p-3">
          <Toast 
            show={toast.show}
            onClose={() => setToast({ ...toast, show: false })}
            delay={4000}
            autohide
            bg={toast.variant}
          >
            <Toast.Header>
              <strong className="me-auto">CQL Code Clinic</strong>
            </Toast.Header>
            <Toast.Body className={toast.variant === 'light' ? 'text-dark' : 'text-white'}>
              {toast.message}
            </Toast.Body>
          </Toast>
        </ToastContainer>
      </Container>
    </OfflineFallback>
  );
}