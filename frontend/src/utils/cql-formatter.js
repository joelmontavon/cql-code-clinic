/**
 * CQL Code Formatter
 * Provides automatic formatting and beautification for CQL code
 */

// Formatting configuration
const FORMAT_CONFIG = {
  indentSize: 2,
  maxLineLength: 100,
  insertSpaces: true,
  trimTrailingWhitespace: true
};

/**
 * Format CQL code with proper indentation and spacing
 * @param {string} code - Raw CQL code
 * @param {object} options - Formatting options
 * @returns {string} Formatted CQL code
 */
export function formatCQLCode(code, options = {}) {
  const config = { ...FORMAT_CONFIG, ...options };
  
  // Split code into lines for processing
  let lines = code.split('\n');
  
  // Remove excessive blank lines and trim whitespace
  lines = lines.map(line => line.trimRight());
  
  // Process each line for indentation and formatting
  let indentLevel = 0;
  let formattedLines = [];
  let inMultilineComment = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line) {
      // Preserve single blank lines, remove multiple consecutive blank lines
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1].trim() !== '') {
        formattedLines.push('');
      }
      continue;
    }
    
    // Handle multi-line comments
    if (line.includes('/*') && !line.includes('*/')) {
      inMultilineComment = true;
    }
    if (inMultilineComment) {
      formattedLines.push(getIndentString(indentLevel, config) + line);
      if (line.includes('*/')) {
        inMultilineComment = false;
      }
      continue;
    }
    
    // Calculate indentation for current line
    const currentIndent = calculateIndentation(line, indentLevel);
    
    // Format the line with proper spacing
    const formattedLine = formatLine(line);
    
    // Add formatted line with proper indentation
    formattedLines.push(getIndentString(currentIndent.level, config) + formattedLine);
    
    // Update indent level for next line
    indentLevel = currentIndent.nextLevel;
  }
  
  // Join lines and ensure single trailing newline
  return formattedLines.join('\n').replace(/\n+$/, '\n');
}

/**
 * Calculate indentation level for a line
 * @param {string} line - The line to analyze
 * @param {number} currentLevel - Current indentation level
 * @returns {object} Current and next indentation levels
 */
function calculateIndentation(line, currentLevel) {
  let level = currentLevel;
  let nextLevel = currentLevel;
  
  // Decrease indentation for closing constructs
  if (line.match(/^(end|else)\b/i)) {
    level = Math.max(0, currentLevel - 1);
    nextLevel = level;
  }
  
  // Special handling for specific CQL constructs
  if (line.match(/^library\s/i)) {
    level = 0;
    nextLevel = 0;
  } else if (line.match(/^(using|include|parameter|codesystem|valueset|code|concept)\s/i)) {
    level = 0;
    nextLevel = 0;
  } else if (line.match(/^define\s/i)) {
    level = 0;
    nextLevel = 1;
  } else if (line.match(/^context\s/i)) {
    level = 0;
    nextLevel = 0;
  }
  
  // Increase indentation for opening constructs
  if (line.match(/\b(if|case|when)\b.*:/i) && !line.match(/\b(then|else|end)\b/i)) {
    nextLevel = currentLevel + 1;
  }
  
  // Handle blocks that continue indentation
  if (line.match(/:$/) && !line.match(/^define\s/i)) {
    nextLevel = currentLevel + 1;
  }
  
  return { level, nextLevel };
}

/**
 * Format a single line with proper spacing
 * @param {string} line - The line to format
 * @returns {string} Formatted line
 */
function formatLine(line) {
  let formatted = line;
  
  // Add spaces around operators
  formatted = formatted.replace(/([^<>=!~])(=|!=|<>|<=|>=|<|>|~|!~)([^=])/g, '$1 $2 $3');
  formatted = formatted.replace(/([^+\-*/^])([\+\-\*/\^])([^=])/g, '$1 $2 $3');
  
  // Add spaces around logical operators
  formatted = formatted.replace(/\b(and|or|xor|implies)\b/gi, ' $1 ');
  
  // Add space after keywords
  formatted = formatted.replace(/\b(if|then|else|case|when|end|where|return|sort|by)\b/gi, '$1 ');
  
  // Add space after commas
  formatted = formatted.replace(/,(?!\s)/g, ', ');
  
  // Clean up multiple spaces
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  // Format colons properly
  formatted = formatted.replace(/\s*:\s*/g, ': ');
  
  return formatted;
}

/**
 * Generate indentation string
 * @param {number} level - Indentation level
 * @param {object} config - Formatting configuration
 * @returns {string} Indentation string
 */
function getIndentString(level, config) {
  const char = config.insertSpaces ? ' ' : '\t';
  const size = config.insertSpaces ? config.indentSize : 1;
  return char.repeat(level * size);
}

/**
 * Monaco editor document formatting provider
 */
export function createCQLFormattingProvider(monaco) {
  return {
    provideDocumentFormattingEdits: (model, options) => {
      const code = model.getValue();
      const formatted = formatCQLCode(code, {
        indentSize: options.tabSize,
        insertSpaces: options.insertSpaces
      });
      
      return [
        {
          range: model.getFullModelRange(),
          text: formatted
        }
      ];
    },
    
    provideDocumentRangeFormattingEdits: (model, range, options) => {
      const code = model.getValueInRange(range);
      const formatted = formatCQLCode(code, {
        indentSize: options.tabSize,
        insertSpaces: options.insertSpaces
      });
      
      return [
        {
          range: range,
          text: formatted
        }
      ];
    }
  };
}

/**
 * Quick CQL code cleanup utility
 * @param {string} code - CQL code to clean
 * @returns {string} Cleaned code
 */
export function cleanCQLCode(code) {
  return code
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Remove trailing whitespace
    .replace(/[ \t]+$/gm, '')
    // Remove excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Ensure single newline at end
    .replace(/\n*$/, '\n');
}

/**
 * CQL code minifier (removes unnecessary whitespace and comments)
 * @param {string} code - CQL code to minify
 * @returns {string} Minified code
 */
export function minifyCQLCode(code) {
  return code
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace around operators and punctuation
    .replace(/\s*([{}()[\],;:])\s*/g, '$1')
    // Trim
    .trim();
}