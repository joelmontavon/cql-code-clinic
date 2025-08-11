import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Alert, Badge } from 'react-bootstrap';
import { 
  Terminal, 
  XCircle, 
  CheckCircle, 
  InfoCircle,
  Trash,
  ExclamationTriangleFill
} from 'react-bootstrap-icons';
import { Editor } from '@monaco-editor/react';

/**
 * Results Panel Component
 * Displays CQL execution results and logs
 * Migrated from code-logger.vue
 */
export function ResultsPanel({
  results = null,
  status = 'idle', // 'idle', 'running', 'success', 'error'
  logs = '',
  height = '300px',
  width = '100%',
  onClear = () => {},
  className = '',
  showTimestamp = true,
  maxLogLength = 10000
}) {
  const [displayLogs, setDisplayLogs] = useState('');
  const editorRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Update display logs when logs change
  useEffect(() => {
    let newLogs = logs;
    
    // Truncate logs if they're too long
    if (newLogs.length > maxLogLength) {
      newLogs = '... (truncated)\n' + newLogs.slice(-(maxLogLength - 100));
    }

    // Add timestamp if enabled
    if (showTimestamp && newLogs && newLogs !== displayLogs) {
      const timestamp = new Date().toLocaleTimeString();
      newLogs = `[${timestamp}] ${newLogs}`;
    }

    setDisplayLogs(newLogs);
  }, [logs, showTimestamp, maxLogLength, displayLogs]);

  // Auto scroll to bottom when logs update
  useEffect(() => {
    if (autoScroll && editorRef.current) {
      setTimeout(() => {
        const editor = editorRef.current;
        const lineCount = editor.getModel().getLineCount();
        editor.revealLine(lineCount);
        editor.setPosition({ lineNumber: lineCount, column: 1 });
      }, 100);
    }
  }, [displayLogs, autoScroll]);

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure read-only editor settings
    editor.updateOptions({
      readOnly: true,
      renderLineHighlight: 'none',
      scrollBeyondLastLine: false,
      minimap: { enabled: false },
      lineNumbers: 'off',
      glyphMargin: false,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      automaticLayout: true
    });
  };

  // Handle clear
  const handleClear = () => {
    setDisplayLogs('');
    onClear();
  };

  // Get status icon and variant
  const getStatusInfo = () => {
    switch (status) {
      case 'running':
        return {
          icon: <InfoCircle className="animate-spin" />,
          variant: 'info',
          text: 'Running...'
        };
      case 'success':
        return {
          icon: <CheckCircle />,
          variant: 'success',
          text: 'Success'
        };
      case 'error':
        return {
          icon: <XCircle />,
          variant: 'danger',
          text: 'Error'
        };
      default:
        return {
          icon: <Terminal />,
          variant: 'secondary',
          text: 'Ready'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Format CQL results for display
  const formatCQLResults = (results) => {
    if (!results || !Array.isArray(results)) return null;

    return results.map((result, index) => {
      const hasError = result.error || result['translator-error'];
      
      return (
        <div key={index} className="mb-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h6 className="mb-1">
                {result.name || `Expression ${index + 1}`}
                <Badge bg="secondary" className="ms-2 font-monospace small">
                  {result.location || '[unknown]'}
                </Badge>
              </h6>
              {result.resultType && (
                <Badge bg="info" className="me-2">
                  {result.resultType}
                </Badge>
              )}
            </div>
          </div>

          {result.result !== undefined && !hasError && (
            <div className="mb-2">
              <strong>Result:</strong>
              <div className="bg-light p-2 rounded font-monospace small mt-1 border">
                {typeof result.result === 'string' 
                  ? `"${result.result}"` 
                  : JSON.stringify(result.result, null, 2)
                }
              </div>
            </div>
          )}

          {hasError && (
            <Alert variant="danger" className="mb-2">
              <div className="d-flex align-items-start">
                <ExclamationTriangleFill className="me-2 flex-shrink-0 mt-1" />
                <div>
                  <strong>
                    {result['translator-error'] ? 'Translation Error:' : 'Runtime Error:'}
                  </strong>
                  <div className="font-monospace small mt-1">
                    {result['translator-error'] || result.error}
                  </div>
                </div>
              </div>
            </Alert>
          )}
        </div>
      );
    });
  };

  return (
    <Card className={`h-100 ${className}`}>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <Terminal className="me-2" size={20} />
            <h5 className="mb-0">Results</h5>
            <Badge 
              bg={statusInfo.variant} 
              className="ms-2 d-flex align-items-center"
            >
              {statusInfo.icon}
              <span className="ms-1">{statusInfo.text}</span>
            </Badge>
          </div>

          <div className="d-flex align-items-center">
            <small className="text-muted me-2">
              Auto-scroll: 
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="form-check-input ms-1"
              />
            </small>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleClear}
              title="Clear results"
            >
              <Trash size={14} />
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Body className="p-0">
        {results && Array.isArray(results) && results.length > 0 ? (
          // Show structured CQL results
          <div className="p-3" style={{ maxHeight: height, overflowY: 'auto' }}>
            <h6 className="text-muted mb-3">CQL Execution Results:</h6>
            {formatCQLResults(results)}
          </div>
        ) : displayLogs ? (
          // Show raw logs in editor
          <div style={{ height }}>
            <Editor
              height={height}
              width={width}
              language="text"
              theme="vs"
              value={displayLogs}
              onMount={handleEditorDidMount}
              options={{
                readOnly: true,
                fontSize: 12,
                lineNumbers: 'off',
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: 'on',
                wrappingIndent: 'none',
                renderLineHighlight: 'none'
              }}
            />
          </div>
        ) : (
          // Empty state
          <div 
            className="d-flex align-items-center justify-content-center text-muted"
            style={{ height }}
          >
            <div className="text-center">
              <Terminal size={48} className="mb-3 opacity-50" />
              <h6>No Results</h6>
              <p className="mb-0">Run some CQL code to see results here</p>
            </div>
          </div>
        )}
      </Card.Body>

      {/* Footer with stats */}
      {(displayLogs || results) && (
        <Card.Footer className="text-muted small">
          <div className="d-flex justify-content-between">
            <span>
              {results && Array.isArray(results) ? 
                `${results.length} result${results.length !== 1 ? 's' : ''}` :
                `${displayLogs.split('\n').length} line${displayLogs.split('\n').length !== 1 ? 's' : ''}`
              }
            </span>
            <span>
              {displayLogs.length > maxLogLength && (
                <span className="text-warning">Log truncated</span>
              )}
            </span>
          </div>
        </Card.Footer>
      )}
    </Card>
  );
}