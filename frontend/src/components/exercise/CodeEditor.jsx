import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, ButtonGroup, Tab, Tabs, Spinner, Alert } from 'react-bootstrap';
import { 
  PlayFill, 
  ArrowClockwise, 
  Key, 
  CheckCircle,
  CodeSlash,
  Braces
} from 'react-bootstrap-icons';
import { Editor } from '@monaco-editor/react';
import { registerCQLLanguage } from '../../utils/monaco-cql-language';
import { setupCQLValidation } from '../../utils/cql-validation';
import { useSettings } from '../../hooks/useSettings';

/**
 * Code Editor Component
 * Monaco-based CQL code editor with run/submit functionality
 * Migrated from code-editor.vue (ACE editor)
 */
export function CodeEditor({
  exercise,
  status = 'idle', // 'idle', 'running', 'submitting'
  height = '400px',
  width = '100%',
  onReset = () => {},
  onRun = () => {},
  onSubmit = () => {},
  onCodeChange = () => {},
  className = '',
  showCheat = true,
  hideButtons = false,
  theme = null // null means use settings
}) {
  const [code, setCode] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorRef = useRef(null);
  const [editorReady, setEditorReady] = useState(false);
  const validationCleanupRef = useRef(null);
  const { settings } = useSettings();

  // Initialize code when exercise changes
  useEffect(() => {
    if (exercise && exercise.tabs && exercise.tabs[0]) {
      const initialCode = exercise.tabs[0].template || '';
      setCode(initialCode);
      setHasUnsavedChanges(false);
    }
  }, [exercise]);
  
  // Cleanup validation on unmount
  useEffect(() => {
    return () => {
      if (validationCleanupRef.current) {
        validationCleanupRef.current();
      }
    };
  }, []);

  // Handle code changes
  const handleCodeChange = (value) => {
    setCode(value || '');
    setHasUnsavedChanges(true);
    onCodeChange(value || '');
  };

  // Handle editor before mount (setup Monaco environment)
  const handleEditorWillMount = (monaco) => {
    try {
      // Register comprehensive CQL language support
      registerCQLLanguage(monaco);
      console.log('CQL language registered successfully');
    } catch (error) {
      console.error('Failed to register CQL language:', error);
    }
  };

  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    setEditorReady(true);
    
    // Set CQL as the language
    try {
      monaco.editor.setModelLanguage(editor.getModel(), 'cql');
      console.log('Monaco Editor mounted successfully with CQL language');
    } catch (error) {
      console.error('Failed to set CQL language on model:', error);
    }

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRun();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      handleSubmit();
    });
    
    // Add format shortcut (Shift+Alt+F)
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
      handleFormat();
    });
    
    // Setup CQL validation
    if (validationCleanupRef.current) {
      validationCleanupRef.current();
    }
    validationCleanupRef.current = setupCQLValidation(editor, monaco);
  };

  // Action handlers
  const handleReset = () => {
    if (exercise && exercise.tabs && exercise.tabs[0]) {
      const resetCode = exercise.tabs[0].template || '';
      setCode(resetCode);
      setHasUnsavedChanges(false);
      if (editorRef.current) {
        editorRef.current.setValue(resetCode);
        editorRef.current.setSelection({ startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });
      }
      onReset(resetCode);
    }
  };

  const handleCheat = () => {
    if (exercise && exercise.tabs && exercise.tabs[0] && exercise.tabs[0].key) {
      const cheatCode = exercise.tabs[0].key;
      setCode(cheatCode);
      setHasUnsavedChanges(true);
      if (editorRef.current) {
        editorRef.current.setValue(cheatCode);
      }
      onCodeChange(cheatCode);
    }
  };

  const handleRun = () => {
    if (code.trim()) {
      setHasUnsavedChanges(false);
      onRun(code);
    }
  };

  const handleSubmit = () => {
    if (code.trim()) {
      setHasUnsavedChanges(false);
      onSubmit(code);
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };

  // Get button text based on status
  const getRunButtonText = () => {
    switch (status) {
      case 'running':
        return 'Running...';
      default:
        return 'Run Code';
    }
  };

  const getSubmitButtonText = () => {
    switch (status) {
      case 'submitting':
        return 'Submitting...';
      default:
        return 'Submit Answer';
    }
  };

  const isLoading = status === 'running' || status === 'submitting';
  const canShowCheat = showCheat && exercise?.tabs?.[0]?.key;
  
  // Determine theme from settings or prop
  const editorTheme = theme || (settings.theme === 'vs-dark' ? 'cql-dark' : 'cql-light');

  return (
    <Card className={`h-100 ${className}`}>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <CodeSlash className="me-2" size={20} />
            <h5 className="mb-0">Code Editor</h5>
            {hasUnsavedChanges && (
              <span className="badge bg-warning text-dark ms-2 small">
                Unsaved Changes
              </span>
            )}
          </div>
          
          {!hideButtons && (
            <ButtonGroup size="sm">
              <Button
                variant="outline-secondary"
                onClick={handleReset}
                disabled={isLoading}
                title="Reset to template (Ctrl+R)"
              >
                <ArrowClockwise size={14} />
              </Button>
              
              {canShowCheat && (
                <Button
                  variant="outline-warning"
                  onClick={handleCheat}
                  disabled={isLoading}
                  title="Show solution"
                >
                  <Key size={14} />
                </Button>
              )}
              
              <Button
                variant="outline-secondary"
                onClick={handleFormat}
                disabled={isLoading || !editorReady}
                title="Format code (Shift+Alt+F)"
              >
                <Braces size={14} />
              </Button>
              
              <Button
                variant="outline-primary"
                onClick={handleRun}
                disabled={isLoading || !code.trim()}
                title="Run code (Ctrl+Enter)"
              >
                {status === 'running' ? (
                  <Spinner size="sm" />
                ) : (
                  <PlayFill size={14} />
                )}
                <span className="ms-1 d-none d-sm-inline">{getRunButtonText()}</span>
              </Button>
              
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isLoading || !code.trim()}
                title="Submit answer (Ctrl+Shift+Enter)"
              >
                {status === 'submitting' ? (
                  <Spinner size="sm" />
                ) : (
                  <CheckCircle size={14} />
                )}
                <span className="ms-1 d-none d-sm-inline">{getSubmitButtonText()}</span>
              </Button>
            </ButtonGroup>
          )}
        </div>
      </Card.Header>

      <Card.Body className="p-0">
        {exercise && exercise.tabs && exercise.tabs.length > 0 ? (
          <Tabs defaultActiveKey="0" className="border-0">
            {exercise.tabs.map((tab, index) => (
              <Tab
                eventKey={index.toString()}
                title={tab.name || `Tab ${index + 1}`}
                key={index}
              >
                <div style={{ height }}>
                  <Editor
                    height={height}
                    width={width}
                    language="cql"
                    theme={editorTheme}
                    value={code}
                    onChange={handleCodeChange}
                    beforeMount={handleEditorWillMount}
                    onMount={handleEditorDidMount}
                    loading={
                      <div className="d-flex align-items-center justify-content-center" style={{ height }}>
                        <div className="text-center">
                          <Spinner animation="border" size="sm" className="mb-2" />
                          <div>Loading Monaco Editor...</div>
                        </div>
                      </div>
                    }
                    options={{
                      fontSize: settings.fontSize,
                      fontFamily: settings.fontFamily,
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: settings.wordWrap,
                      wrappingIndent: 'indent',
                      minimap: { enabled: false },
                      contextmenu: true,
                      selectOnLineNumbers: true,
                      lineHeight: 22,
                      renderWhitespace: 'selection',
                      showFoldingControls: 'always',
                      foldingHighlight: true,
                      smoothScrolling: true,
                      cursorBlinking: 'blink',
                      cursorSmoothCaretAnimation: true,
                      // Enhanced CQL-specific options
                      suggest: {
                        showKeywords: settings.autoComplete,
                        showSnippets: settings.autoComplete,
                        showFunctions: settings.autoComplete,
                        showConstants: settings.autoComplete,
                        showOperators: settings.autoComplete
                      },
                      quickSuggestions: {
                        other: settings.autoComplete,
                        comments: false,
                        strings: false
                      },
                      suggestOnTriggerCharacters: settings.autoComplete,
                      acceptSuggestionOnEnter: settings.autoComplete ? 'on' : 'off',
                      tabCompletion: settings.autoComplete ? 'on' : 'off',
                      parameterHints: { enabled: settings.autoComplete },
                      hover: { enabled: true },
                      definitionLinkOpensInPeek: true,
                      bracketPairColorization: { enabled: settings.bracketMatching }
                    }}
                  />
                </div>
              </Tab>
            ))}
          </Tabs>
        ) : (
          <Alert variant="info" className="m-3">
            <Alert.Heading>No Exercise Selected</Alert.Heading>
            <p>Please select an exercise to start coding.</p>
          </Alert>
        )}
      </Card.Body>

      {/* Keyboard shortcuts help */}
      <Card.Footer className="text-muted small">
        <div className="d-flex justify-content-between">
          <span>
            <strong>Shortcuts:</strong> Ctrl+Enter (Run), Ctrl+Shift+Enter (Submit)
          </span>
          <span>
            <strong>Language:</strong> CQL (Clinical Quality Language)
          </span>
        </div>
      </Card.Footer>
    </Card>
  );
}