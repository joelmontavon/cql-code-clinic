import React, { useEffect, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import { registerCQLLanguage } from '../utils/monaco-cql-language';
import { useSettings } from '../hooks/useSettings';

/**
 * Simple Code Editor Component
 * Lightweight Monaco editor for the Learn section
 * Without the complexity of exercise-specific features
 */
export function SimpleCodeEditor({
  value = '',
  onChange = () => {},
  height = '300px',
  theme = null, // null means use settings
  readOnly = false,
  language = 'cql'
}) {
  const [editorReady, setEditorReady] = useState(false);
  const { settings } = useSettings();

  const handleEditorDidMount = (editor, monaco) => {
    // Register CQL language support
    registerCQLLanguage(monaco);
    setEditorReady(true);
  };

  const handleEditorChange = (value, event) => {
    onChange(value || '');
  };

  // Determine theme from settings or prop
  const editorTheme = theme || settings.theme;

  return (
    <div style={{ height, border: '1px solid #dee2e6', borderRadius: '0.375rem' }}>
      <Editor
        height={height}
        language={language}
        theme={editorTheme}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: settings.wordWrap,
          automaticLayout: true,
          lineNumbers: 'on',
          glyphMargin: false,
          folding: false,
          renderLineHighlight: 'none',
          selectionHighlight: false,
          occurrencesHighlight: false,
          readOnly: readOnly,
          fontSize: settings.fontSize,
          fontFamily: settings.fontFamily,
          padding: { top: 10, bottom: 10 },
          suggest: {
            showKeywords: settings.autoComplete,
            showSnippets: settings.autoComplete,
          },
          quickSuggestions: {
            other: settings.autoComplete,
            comments: false,
            strings: false
          }
        }}
      />
    </div>
  );
}