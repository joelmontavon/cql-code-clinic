import React from 'react';
import { Spinner, Card, Alert, Placeholder } from 'react-bootstrap';
import { CodeSlash, PlayCircle, Book } from 'react-bootstrap-icons';

/**
 * Generic Loading Spinner Component
 */
export function LoadingSpinner({ 
  size = 'md', 
  text = 'Loading...', 
  variant = 'primary',
  className = '',
  center = true 
}) {
  const spinnerSize = size === 'sm' ? 'sm' : undefined;
  
  const content = (
    <div className={`d-flex ${center ? 'justify-content-center' : ''} align-items-center ${className}`}>
      <Spinner animation="border" variant={variant} size={spinnerSize} className="me-2" />
      {text && <span>{text}</span>}
    </div>
  );

  if (center) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Page Loading Component
 */
export function PageLoading({ message = 'Loading page...' }) {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center min-vh-100">
      <Spinner animation="border" variant="primary" className="mb-3" />
      <h5 className="text-muted">{message}</h5>
    </div>
  );
}

/**
 * Exercise Loading Skeleton
 */
export function ExerciseLoadingSkeleton() {
  return (
    <div className="container-fluid h-100 p-0">
      <div className="row h-100 g-0">
        {/* Navigation Skeleton */}
        <div className="col-lg-3 border-end bg-light p-3">
          <Card>
            <Card.Header>
              <Placeholder as={Card.Title} animation="glow">
                <Placeholder xs={6} />
              </Placeholder>
            </Card.Header>
            <Card.Body className="p-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 border-bottom">
                  <Placeholder as="div" animation="glow">
                    <div className="d-flex align-items-center">
                      <Placeholder xs={1} className="me-2 rounded-circle" style={{ height: '20px' }} />
                      <div className="flex-grow-1">
                        <Placeholder xs={8} className="mb-1" />
                        <Placeholder xs={6} size="sm" />
                      </div>
                    </div>
                  </Placeholder>
                </div>
              ))}
            </Card.Body>
          </Card>
        </div>

        <div className="col-lg-9">
          <div className="row h-100 g-0">
            {/* Instructions Skeleton */}
            <div className="col-lg-5 border-end bg-white p-3">
              <Card className="border-0">
                <Card.Header>
                  <Placeholder as="div" animation="glow">
                    <div className="d-flex align-items-center">
                      <Book className="me-2 text-muted" />
                      <Placeholder xs={4} />
                    </div>
                  </Placeholder>
                </Card.Header>
                <Card.Body>
                  <Placeholder as="div" animation="glow">
                    <Placeholder xs={7} className="mb-3" />
                    <Placeholder xs={4} className="mb-3" />
                    <Placeholder xs={6} className="mb-3" />
                    <Placeholder xs={8} className="mb-4" />
                    
                    <Placeholder xs={3} className="mb-2" />
                    <Placeholder xs={12} className="mb-2" />
                    <Placeholder xs={10} className="mb-2" />
                    <Placeholder xs={8} className="mb-4" />
                    
                    <div className="bg-light p-3 rounded mb-3">
                      <Placeholder xs={6} className="mb-1" />
                      <Placeholder xs={4} />
                    </div>
                  </Placeholder>
                </Card.Body>
              </Card>
            </div>

            {/* Editor and Results Skeleton */}
            <div className="col-lg-7 d-flex flex-column">
              {/* Editor Skeleton */}
              <div className="p-3" style={{ height: '50vh' }}>
                <Card className="h-100">
                  <Card.Header>
                    <Placeholder as="div" animation="glow">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <CodeSlash className="me-2 text-muted" />
                          <Placeholder xs={3} />
                        </div>
                        <div className="d-flex gap-2">
                          <Placeholder xs={2} className="rounded" style={{ height: '32px' }} />
                          <Placeholder xs={2} className="rounded" style={{ height: '32px' }} />
                          <Placeholder xs={2} className="rounded" style={{ height: '32px' }} />
                          <Placeholder xs={2} className="rounded" style={{ height: '32px' }} />
                        </div>
                      </div>
                    </Placeholder>
                  </Card.Header>
                  <Card.Body className="bg-light">
                    <Placeholder as="div" animation="glow" className="h-100">
                      <div className="font-monospace">
                        <Placeholder xs={4} className="mb-2" />
                        <Placeholder xs={8} className="mb-2" />
                        <Placeholder xs={6} className="mb-2" />
                        <Placeholder xs={5} className="mb-2" />
                      </div>
                    </Placeholder>
                  </Card.Body>
                </Card>
              </div>

              {/* Results Skeleton */}
              <div className="p-3 border-top" style={{ height: '50vh' }}>
                <Card className="h-100">
                  <Card.Header>
                    <Placeholder as="div" animation="glow">
                      <div className="d-flex align-items-center">
                        <PlayCircle className="me-2 text-muted" />
                        <Placeholder xs={3} />
                      </div>
                    </Placeholder>
                  </Card.Header>
                  <Card.Body className="bg-light">
                    <Placeholder as="div" animation="glow">
                      <div className="text-center py-5">
                        <PlayCircle size={48} className="mb-3 text-muted opacity-50" />
                        <Placeholder xs={6} className="mb-2" />
                        <Placeholder xs={4} />
                      </div>
                    </Placeholder>
                  </Card.Body>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Code Editor Loading Component
 */
export function CodeEditorLoading() {
  return (
    <div className="d-flex align-items-center justify-content-center h-100 bg-light">
      <div className="text-center">
        <Spinner animation="border" size="sm" className="mb-2" />
        <div className="small text-muted">Loading Monaco Editor...</div>
      </div>
    </div>
  );
}

/**
 * Exercise List Loading Component
 */
export function ExerciseListLoading() {
  return (
    <div className="p-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="mb-3">
          <Card.Body>
            <Placeholder as="div" animation="glow">
              <div className="d-flex align-items-center">
                <Placeholder xs={1} className="me-3 rounded-circle" style={{ height: '40px' }} />
                <div className="flex-grow-1">
                  <Placeholder xs={6} className="mb-2" />
                  <Placeholder xs={8} size="sm" />
                </div>
                <Placeholder xs={1} className="rounded" style={{ height: '24px' }} />
              </div>
            </Placeholder>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
}

/**
 * CQL Execution Loading Component
 */
export function CQLExecutionLoading({ message = 'Executing CQL...' }) {
  return (
    <Alert variant="info" className="m-3">
      <div className="d-flex align-items-center">
        <Spinner animation="border" size="sm" className="me-3" />
        <div>
          <strong>{message}</strong>
          <div className="small">This may take a few seconds...</div>
        </div>
      </div>
    </Alert>
  );
}

/**
 * Data Loading Component with Retry
 */
export function DataLoading({ 
  isLoading, 
  error, 
  onRetry, 
  loadingMessage = 'Loading data...',
  errorMessage = 'Failed to load data',
  children 
}) {
  if (error) {
    return (
      <Alert variant="danger" className="m-3">
        <Alert.Heading className="h6">Error</Alert.Heading>
        <p className="mb-3">{errorMessage}</p>
        {onRetry && (
          <button className="btn btn-outline-danger btn-sm" onClick={onRetry}>
            Try Again
          </button>
        )}
      </Alert>
    );
  }

  if (isLoading) {
    return <LoadingSpinner text={loadingMessage} />;
  }

  return children;
}

/**
 * Suspense Fallback Components
 */
export const SuspenseFallbacks = {
  Page: () => <PageLoading />,
  Exercise: () => <ExerciseLoadingSkeleton />,
  Editor: () => <CodeEditorLoading />,
  List: () => <ExerciseListLoading />,
  Execution: () => <CQLExecutionLoading />
};