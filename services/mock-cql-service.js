#!/usr/bin/env node

/**
 * Mock CQL Execution Service
 * 
 * This is a temporary development service that mimics the DBCG CQL Execution Service
 * API while we set up the full Java-based infrastructure.
 * 
 * Usage: node mock-cql-service.js
 * Server will run on http://localhost:8080
 */

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:4200'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

/**
 * Mock CQL evaluation function
 * This simulates basic CQL execution for development/testing purposes
 */
function mockEvaluateCQL(cqlCode) {
  const results = [];
  
  try {
    // Parse simple CQL expressions for demonstration
    const lines = cqlCode.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('//')) continue;
      
      // Match simple define statements: define "Name": expression
      const defineMatch = line.match(/define\s+"([^"]+)"\s*:\s*(.+)/i);
      if (defineMatch) {
        const [, name, expression] = defineMatch;
        const result = evaluateSimpleExpression(expression.trim());
        
        results.push({
          name: name,
          location: `[${i + 1}:1]`,
          resultType: result.type,
          result: result.value
        });
      }
    }
    
    // If no define statements found, treat as single expression
    if (results.length === 0 && cqlCode.trim()) {
      const result = evaluateSimpleExpression(cqlCode.trim());
      results.push({
        name: "Expression",
        location: "[1:1]", 
        resultType: result.type,
        result: result.value
      });
    }
    
  } catch (error) {
    results.push({
      "translator-error": `Mock evaluation error: ${error.message}`,
      name: "Error",
      location: "[1:1]"
    });
  }
  
  return results;
}

/**
 * Simple expression evaluator for basic CQL constructs
 */
function evaluateSimpleExpression(expression) {
  expression = expression.replace(/;$/, ''); // Remove trailing semicolon
  
  // String literals
  if (expression.match(/^'.*'$/)) {
    return {
      type: "System.String",
      value: expression.slice(1, -1) // Remove quotes
    };
  }
  
  // Numeric literals
  if (expression.match(/^\d+$/)) {
    return {
      type: "System.Integer", 
      value: parseInt(expression)
    };
  }
  
  if (expression.match(/^\d+\.\d+$/)) {
    return {
      type: "System.Decimal",
      value: parseFloat(expression)
    };
  }
  
  // Boolean literals
  if (expression.toLowerCase() === 'true') {
    return { type: "System.Boolean", value: true };
  }
  if (expression.toLowerCase() === 'false') {
    return { type: "System.Boolean", value: false };
  }
  
  // Simple arithmetic: number + number
  const addMatch = expression.match(/^(\d+(?:\.\d+)?)\s*\+\s*(\d+(?:\.\d+)?)$/);
  if (addMatch) {
    const a = parseFloat(addMatch[1]);
    const b = parseFloat(addMatch[2]);
    const result = a + b;
    return {
      type: Number.isInteger(result) ? "System.Integer" : "System.Decimal",
      value: result
    };
  }
  
  // String concatenation: 'string' + 'string'  
  const stringAddMatch = expression.match(/^'([^']+)'\s*\+\s*'([^']+)'$/);
  if (stringAddMatch) {
    return {
      type: "System.String",
      value: stringAddMatch[1] + stringAddMatch[2]
    };
  }
  
  // Simple functions
  if (expression.toLowerCase() === 'today()') {
    return {
      type: "System.Date",
      value: new Date().toISOString().split('T')[0]
    };
  }
  
  if (expression.toLowerCase() === 'now()') {
    return {
      type: "System.DateTime", 
      value: new Date().toISOString()
    };
  }
  
  // Default fallback
  return {
    type: "System.String",
    value: `[Mock result for: ${expression}]`
  };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Mock CQL Execution Service',
    timestamp: new Date().toISOString(),
    version: '1.0.0-mock'
  });
});

// CQL Evaluation endpoint (matches DBCG API)
app.post('/cql/evaluate', (req, res) => {
  const { code, terminologyServiceUri, dataServiceUri, patientId, parameters } = req.body;
  
  if (!code) {
    return res.status(400).json({
      error: 'Missing required parameter: code'
    });
  }
  
  console.log('Evaluating CQL code:', code);
  
  try {
    const results = mockEvaluateCQL(code);
    res.json(results);
  } catch (error) {
    console.error('CQL evaluation error:', error);
    res.status(500).json([{
      "translator-error": `Internal server error: ${error.message}`,
      name: "Error",
      location: "[1:1]"
    }]);
  }
});

// CQL Format endpoint (basic formatting)
app.post('/cql/format', (req, res) => {
  const { code } = req.body;
  
  if (!code) {
    return res.status(400).json({
      error: 'Missing required parameter: code'
    });
  }
  
  try {
    // Basic formatting - proper indentation and spacing
    const formatted = code
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        if (line.toLowerCase().startsWith('define')) {
          return line;
        }
        return '  ' + line; // Simple indentation
      })
      .join('\n');
    
    res.json([{
      "formatted-cql": formatted
    }]);
  } catch (error) {
    console.error('CQL formatting error:', error);
    res.status(500).json({
      error: `Formatting error: ${error.message}`
    });
  }
});

// FHIR base endpoint (for terminology/data services)
app.get('/baseR4/metadata', (req, res) => {
  res.json({
    resourceType: "CapabilityStatement",
    status: "active",
    date: new Date().toISOString(),
    publisher: "Mock CQL Service",
    kind: "instance",
    software: {
      name: "Mock FHIR Server",
      version: "1.0.0"
    },
    implementation: {
      description: "Mock FHIR server for CQL development"
    },
    fhirVersion: "4.0.1",
    format: ["json"]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Mock CQL Execution Service started');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 CQL evaluation: POST http://localhost:${PORT}/cql/evaluate`);
  console.log(`✨ CQL formatting: POST http://localhost:${PORT}/cql/format`);
  console.log('');
  console.log('📝 Example CQL evaluation request:');
  console.log(`curl -X POST http://localhost:${PORT}/cql/evaluate \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"code": "define \\"Test\\": 1 + 1"}'`);
  console.log('');
  console.log('⚠️  This is a MOCK service for development only!');
  console.log('   Replace with real DBCG CQL Execution Service for production.');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});