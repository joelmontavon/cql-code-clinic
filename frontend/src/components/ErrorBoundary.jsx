import React from 'react';
import { Alert, Button, Container, Row, Col } from 'react-bootstrap';
import { ExclamationTriangleFill, ArrowClockwise } from 'react-bootstrap-icons';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Report error to monitoring service (if available)
    if (window.reportError) {
      window.reportError(error, errorInfo);
    }
  }

  handleReload = () => {
    // Clear error state and reload the component
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handlePageReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, showDetails = false } = this.props;
      const { error, errorInfo, errorId } = this.state;

      // If a custom fallback is provided, use it
      if (Fallback) {
        return (
          <Fallback
            error={error}
            errorInfo={errorInfo}
            errorId={errorId}
            onRetry={this.handleReload}
            onReload={this.handlePageReload}
          />
        );
      }

      // Default error UI
      return (
        <Container className="my-5">
          <Row className="justify-content-center">
            <Col md={8} lg={6}>
              <Alert variant="danger" className="text-center">
                <ExclamationTriangleFill size={48} className="mb-3 text-danger" />
                <Alert.Heading>Oops! Something went wrong</Alert.Heading>
                <p className="mb-4">
                  We encountered an unexpected error. Please try refreshing the page or 
                  contact support if the problem persists.
                </p>
                
                <div className="d-flex gap-2 justify-content-center">
                  <Button 
                    variant="outline-danger" 
                    onClick={this.handleReload}
                  >
                    <ArrowClockwise className="me-2" />
                    Try Again
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={this.handlePageReload}
                  >
                    Reload Page
                  </Button>
                </div>

                {showDetails && error && (
                  <details className="mt-4 text-start">
                    <summary className="mb-2">Technical Details</summary>
                    <div className="small">
                      <p><strong>Error ID:</strong> {errorId}</p>
                      <p><strong>Error:</strong> {error.toString()}</p>
                      {errorInfo && (
                        <div>
                          <strong>Stack Trace:</strong>
                          <pre className="mt-1 p-2 bg-light rounded font-monospace">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </Alert>
            </Col>
          </Row>
        </Container>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-Order Component for Error Boundaries
 */
export function withErrorBoundary(Component, fallback) {
  return function WithErrorBoundaryComponent(props) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Specialized Error Fallback Components
 */
export function ExerciseErrorFallback({ error, onRetry }) {
  return (
    <Alert variant="warning" className="m-3">
      <Alert.Heading className="h6">
        <ExclamationTriangleFill className="me-2" />
        Exercise Loading Error
      </Alert.Heading>
      <p className="mb-3">
        There was a problem loading this exercise. This might be a temporary issue.
      </p>
      <Button variant="outline-warning" size="sm" onClick={onRetry}>
        <ArrowClockwise className="me-1" />
        Retry
      </Button>
    </Alert>
  );
}

export function EditorErrorFallback({ error, onRetry }) {
  return (
    <Alert variant="danger" className="m-3">
      <Alert.Heading className="h6">
        <ExclamationTriangleFill className="me-2" />
        Code Editor Error
      </Alert.Heading>
      <p className="mb-3">
        The code editor encountered an error and couldn't load properly.
      </p>
      <Button variant="outline-danger" size="sm" onClick={onRetry}>
        <ArrowClockwise className="me-1" />
        Reload Editor
      </Button>
    </Alert>
  );
}