import { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert, Form, Badge } from 'react-bootstrap';
import { executeCQL } from '../services/api';

export function CQLTestPage() {
  const [cqlCode, setCqlCode] = useState('define "Test": 1 + 1');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!cqlCode.trim()) {
      setError('Please enter some CQL code');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await executeCQL(cqlCode);
      // Extract the actual CQL results array from the API response
      setResult(response.data || []);
    } catch (err) {
      setError(err.message || 'CQL execution failed');
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    {
      name: 'Simple Arithmetic',
      code: 'define "Test": 1 + 1'
    },
    {
      name: 'String Concatenation', 
      code: 'define "Greeting": \'Hello\' + \' World\''
    },
    {
      name: 'Today Function',
      code: 'define "Today": Today()'
    },
    {
      name: 'Boolean Expression',
      code: 'define "IsTrue": true'
    },
    {
      name: 'Multiple Definitions',
      code: `define "FirstName": 'John'
define "LastName": 'Doe'
define "FullName": FirstName + ' ' + LastName`
    }
  ];

  return (
    <Container className="py-4">
      <Row>
        <Col>
          <h1 className="mb-4">CQL Execution Test</h1>
          <p className="text-muted mb-4">
            Test the CQL execution service integration. This page uses the mock CQL service running on port 8080.
          </p>
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">CQL Code Input</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Enter CQL Code:</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={8}
                  value={cqlCode}
                  onChange={(e) => setCqlCode(e.target.value)}
                  placeholder="Enter your CQL code here..."
                  className="font-monospace"
                />
              </Form.Group>
              
              <div className="d-grid gap-2">
                <Button 
                  variant="primary" 
                  onClick={handleExecute}
                  disabled={loading || !cqlCode.trim()}
                >
                  {loading ? 'Executing...' : 'Execute CQL'}
                </Button>
              </div>

              <div className="mt-4">
                <h6>Example CQL Code:</h6>
                <div className="d-flex flex-wrap gap-2">
                  {examples.map((example, index) => (
                    <Button
                      key={index}
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setCqlCode(example.code)}
                    >
                      {example.name}
                    </Button>
                  ))}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="h-100">
            <Card.Header>
              <h5 className="mb-0">Execution Results</h5>
            </Card.Header>
            <Card.Body>
              {loading && (
                <Alert variant="info">
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Executing CQL code...
                  </div>
                </Alert>
              )}

              {error && (
                <Alert variant="danger">
                  <Alert.Heading>Execution Error</Alert.Heading>
                  <p className="mb-0 font-monospace small">{error}</p>
                </Alert>
              )}

              {result && result.length > 0 && (
                <div>
                  <Alert variant="success">
                    <Alert.Heading>Execution Successful</Alert.Heading>
                    <p className="mb-0">Found {result.length} result(s)</p>
                  </Alert>
                  
                  <div className="mt-3">
                    {result.map((item, index) => (
                      <Card key={index} className="mb-2">
                        <Card.Body className="py-2">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1">
                                {item.name}
                                <Badge bg="secondary" className="ms-2 font-monospace small">
                                  {item.location}
                                </Badge>
                              </h6>
                              {item.resultType && (
                                <Badge bg="info" className="me-2">
                                  {item.resultType}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {item.result !== undefined && (
                            <div className="mt-2">
                              <strong>Result:</strong>
                              <div className="bg-light p-2 rounded font-monospace small mt-1">
                                {typeof item.result === 'string' ? 
                                  `"${item.result}"` : 
                                  JSON.stringify(item.result)
                                }
                              </div>
                            </div>
                          )}
                          
                          {item.error && (
                            <div className="mt-2">
                              <strong className="text-danger">Error:</strong>
                              <div className="bg-danger-subtle p-2 rounded font-monospace small mt-1">
                                {item.error}
                              </div>
                            </div>
                          )}
                          
                          {item['translator-error'] && (
                            <div className="mt-2">
                              <strong className="text-danger">Translation Error:</strong>
                              <div className="bg-danger-subtle p-2 rounded font-monospace small mt-1">
                                {item['translator-error']}
                              </div>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {!loading && (!result || result.length === 0) && !error && (
                <div className="text-muted text-center py-4">
                  <p>Enter CQL code and click "Execute CQL" to see results here.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Service Status</h6>
            </Card.Header>
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="me-3">
                  <Badge bg="success">Mock CQL Service</Badge>
                </div>
                <small className="text-muted">
                  Connected to mock CQL execution service at http://localhost:8080
                </small>
              </div>
              <div className="mt-2">
                <small className="text-muted">
                  <strong>Note:</strong> This is a development mock service. 
                  Replace with the real DBCG CQL Execution Service for production use.
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}