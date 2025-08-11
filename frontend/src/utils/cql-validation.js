/**
 * CQL Validation Service
 * Provides client-side CQL syntax validation and error detection
 * 
 * This service performs basic CQL syntax validation without requiring
 * server-side compilation, providing immediate feedback to users.
 */

// Common CQL syntax errors and patterns
const CQL_SYNTAX_PATTERNS = {
  // Missing colons after define statements
  missingDefineColon: {
    pattern: /define\s+"[^"]+"\s*(?!:)/gi,
    message: 'Missing colon after define statement',
    severity: 'error'
  },
  
  // Unclosed string literals
  unclosedString: {
    pattern: /"[^"]*$/gm,
    message: 'Unclosed string literal',
    severity: 'error'
  },
  
  // Unclosed single quotes
  unclosedSingleQuote: {
    pattern: /'[^']*$/gm,
    message: 'Unclosed string literal',
    severity: 'error'
  },
  
  // Missing library statement (should be first non-comment line)
  missingLibrary: {
    pattern: /^(?!\s*(?:\/\/.*|\/\*[\s\S]*?\*\/|\s*))*(?!library\s)/gm,
    message: 'CQL library should start with a library statement',
    severity: 'warning'
  },
  
  // Invalid operators
  invalidOperators: {
    pattern: /(?:==|!=(?!=)|<>(?!=))/g,
    message: 'Use CQL operators: = (equals), != (not equals), <> is deprecated',
    severity: 'warning'
  },
  
  // Unmatched brackets
  unmatchedBrackets: {
    pattern: null, // Custom validation function
    message: 'Unmatched brackets',
    severity: 'error'
  },
  
  // Case sensitivity warnings
  caseSensitivity: {
    pattern: /\b(?:Define|Library|Using|Include|Parameter)\b/g,
    message: 'CQL is case-sensitive. Use lowercase keywords: define, library, using, include, parameter',
    severity: 'warning'
  },
  
  // Missing version in library
  libraryWithoutVersion: {
    pattern: /^library\s+[\w.]+(?!\s+version)/gm,
    message: 'Library statement should include version',
    severity: 'warning'
  }
};

// CQL Language constructs for validation
const CQL_CONSTRUCTS = {
  keywords: [
    'library', 'using', 'include', 'public', 'private', 'parameter', 'default', 
    'define', 'context', 'codesystem', 'valueset', 'code', 'concept',
    'if', 'then', 'else', 'case', 'when', 'end', 'and', 'or', 'xor', 'not', 'implies'
  ],
  
  operators: ['=', '!=', '<', '<=', '>', '>=', '~', '!~', '+', '-', '*', '/', '^', 'mod', 'div'],
  
  brackets: ['{', '}', '[', ']', '(', ')']
};

/**
 * Validate CQL code and return diagnostics
 * @param {string} code - The CQL code to validate
 * @param {object} options - Validation options
 * @returns {Array} Array of diagnostic objects
 */
export function validateCQLCode(code, options = {}) {
  const diagnostics = [];
  const lines = code.split('\n');
  
  // Run pattern-based validations
  Object.entries(CQL_SYNTAX_PATTERNS).forEach(([key, pattern]) => {
    if (pattern.pattern) {
      const matches = [...code.matchAll(pattern.pattern)];
      matches.forEach(match => {
        const position = getPositionFromIndex(code, match.index);
        diagnostics.push({
          message: pattern.message,
          severity: pattern.severity,
          startLineNumber: position.line,
          endLineNumber: position.line,
          startColumn: position.column,
          endColumn: position.column + match[0].length,
          source: 'cql-validator'
        });
      });
    }
  });
  
  // Custom validations
  diagnostics.push(...validateBracketMatching(code));
  diagnostics.push(...validateLibraryStructure(code));
  diagnostics.push(...validateIdentifiers(code));
  
  return diagnostics;
}

/**
 * Validate bracket matching
 * @param {string} code - The CQL code
 * @returns {Array} Array of bracket mismatch diagnostics
 */
function validateBracketMatching(code) {
  const diagnostics = [];
  const stack = [];
  const pairs = { '(': ')', '[': ']', '{': '}' };
  const closers = { ')': '(', ']': '[', '}': '{' };
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    
    if (pairs[char]) {
      // Opening bracket
      stack.push({ char, index: i });
    } else if (closers[char]) {
      // Closing bracket
      if (stack.length === 0) {
        const position = getPositionFromIndex(code, i);
        diagnostics.push({
          message: `Unmatched closing bracket: ${char}`,
          severity: 'error',
          startLineNumber: position.line,
          endLineNumber: position.line,
          startColumn: position.column,
          endColumn: position.column + 1,
          source: 'cql-validator'
        });
      } else {
        const last = stack.pop();
        if (pairs[last.char] !== char) {
          const position = getPositionFromIndex(code, i);
          diagnostics.push({
            message: `Mismatched bracket: expected ${pairs[last.char]}, found ${char}`,
            severity: 'error',
            startLineNumber: position.line,
            endLineNumber: position.line,
            startColumn: position.column,
            endColumn: position.column + 1,
            source: 'cql-validator'
          });
        }
      }
    }
  }
  
  // Check for unclosed brackets
  stack.forEach(item => {
    const position = getPositionFromIndex(code, item.index);
    diagnostics.push({
      message: `Unclosed bracket: ${item.char}`,
      severity: 'error',
      startLineNumber: position.line,
      endLineNumber: position.line,
      startColumn: position.column,
      endColumn: position.column + 1,
      source: 'cql-validator'
    });
  });
  
  return diagnostics;
}

/**
 * Validate basic library structure
 * @param {string} code - The CQL code
 * @returns {Array} Array of structure diagnostics
 */
function validateLibraryStructure(code) {
  const diagnostics = [];
  const lines = code.split('\n');
  
  // Check if library statement exists and is in correct position
  let hasLibrary = false;
  let libraryLineIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('/*')) {
      continue;
    }
    
    if (line.startsWith('library ')) {
      hasLibrary = true;
      libraryLineIndex = i;
      break;
    } else {
      // Non-library statement found before library
      diagnostics.push({
        message: 'Library statement should be the first non-comment statement',
        severity: 'warning',
        startLineNumber: i + 1,
        endLineNumber: i + 1,
        startColumn: 1,
        endColumn: line.length + 1,
        source: 'cql-validator'
      });
      break;
    }
  }
  
  if (!hasLibrary && code.trim()) {
    diagnostics.push({
      message: 'CQL library should start with a library statement',
      severity: 'warning',
      startLineNumber: 1,
      endLineNumber: 1,
      startColumn: 1,
      endColumn: 1,
      source: 'cql-validator'
    });
  }
  
  return diagnostics;
}

/**
 * Validate identifiers and references
 * @param {string} code - The CQL code
 * @returns {Array} Array of identifier diagnostics
 */
function validateIdentifiers(code) {
  const diagnostics = [];
  
  // Find all define statements to build symbol table
  const definePattern = /define\s+"([^"]+)"\s*:/gi;
  const definedSymbols = new Set();
  
  let match;
  while ((match = definePattern.exec(code)) !== null) {
    definedSymbols.add(match[1]);
  }
  
  // Check for potential undefined references (basic check)
  const referencePattern = /"([^"]+)"/g;
  const references = [];
  
  while ((match = referencePattern.exec(code)) !== null) {
    // Skip if it's part of a define statement
    const beforeMatch = code.substring(0, match.index);
    if (!beforeMatch.match(/define\s*$/i)) {
      references.push({
        name: match[1],
        index: match.index,
        length: match[0].length
      });
    }
  }
  
  // Check references (simplified - would need more sophisticated parsing for real validation)
  references.forEach(ref => {
    if (!definedSymbols.has(ref.name) && !CQL_CONSTRUCTS.keywords.includes(ref.name.toLowerCase())) {
      const position = getPositionFromIndex(code, ref.index);
      diagnostics.push({
        message: `Potentially undefined reference: "${ref.name}"`,
        severity: 'information',
        startLineNumber: position.line,
        endLineNumber: position.line,
        startColumn: position.column,
        endColumn: position.column + ref.length,
        source: 'cql-validator'
      });
    }
  });
  
  return diagnostics;
}

/**
 * Get line and column position from string index
 * @param {string} code - The source code
 * @param {number} index - Character index
 * @returns {object} Position with line and column (1-based)
 */
function getPositionFromIndex(code, index) {
  const lines = code.substring(0, index).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

/**
 * Monaco diagnostics adapter
 * Converts our diagnostics to Monaco editor format
 */
export function createCQLDiagnosticsProvider(monaco) {
  return {
    provideDiagnostics: (model) => {
      const code = model.getValue();
      const diagnostics = validateCQLCode(code);
      
      return diagnostics.map(diag => ({
        ...diag,
        severity: getSeverityValue(monaco, diag.severity)
      }));
    }
  };
}

function getSeverityValue(monaco, severity) {
  switch (severity) {
    case 'error':
      return monaco.MarkerSeverity.Error;
    case 'warning':
      return monaco.MarkerSeverity.Warning;
    case 'information':
      return monaco.MarkerSeverity.Info;
    default:
      return monaco.MarkerSeverity.Hint;
  }
}

/**
 * Setup real-time validation for Monaco editor
 * @param {object} editor - Monaco editor instance
 * @param {object} monaco - Monaco instance
 */
export function setupCQLValidation(editor, monaco) {
  let validationTimeout;
  
  const validateCode = () => {
    const model = editor.getModel();
    const code = model.getValue();
    const diagnostics = validateCQLCode(code);
    
    const markers = diagnostics.map(diag => ({
      ...diag,
      severity: getSeverityValue(monaco, diag.severity)
    }));
    
    monaco.editor.setModelMarkers(model, 'cql-validator', markers);
  };
  
  // Validate on content change (debounced)
  editor.onDidChangeModelContent(() => {
    clearTimeout(validationTimeout);
    validationTimeout = setTimeout(validateCode, 500);
  });
  
  // Initial validation
  validateCode();
  
  return () => {
    clearTimeout(validationTimeout);
  };
}