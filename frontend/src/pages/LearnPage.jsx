import React, { useState, useCallback } from 'react';
import { Container, Row, Col, Card, Nav, Button, Badge, Alert } from 'react-bootstrap';
import { Book, PlayFill, Code, Lightbulb, FileText, Search } from 'react-bootstrap-icons';
import { SimpleCodeEditor } from '../components/SimpleCodeEditor';
import { ResultsPanel } from '../components/exercise/ResultsPanel';
import { useCQLExecution } from '../hooks/useCQLExecution';

/**
 * Learn Page Component
 * Interactive CQL documentation, tutorials, and examples
 */
export function LearnPage() {
  const [activeTab, setActiveTab] = useState('basics');
  const [selectedExample, setSelectedExample] = useState('data-types');
  const [code, setCode] = useState('');
  const [results, setResults] = useState(null);
  
  const { execute, isExecuting, lastResult, error } = useCQLExecution();

  // Handle running interactive examples
  const handleRunExample = useCallback(async () => {
    if (!code.trim()) return;
    
    try {
      const result = await execute(code);
      // Extract the actual CQL results array from the API response
      setResults(result.result.data);
    } catch (err) {
      console.error('Example execution error:', err);
      setResults(null);
    }
  }, [code, execute]);

  // Load example code when selected
  const loadExample = useCallback((exampleKey) => {
    setSelectedExample(exampleKey);
    const example = interactiveExamples.find(ex => ex.id === exampleKey);
    if (example) {
      setCode(example.code);
      setResults(null);
    }
  }, []);

  return (
    <Container fluid className="py-4">
      <Row>
        <Col xs={12} className="mb-4">
          <div className="d-flex align-items-center">
            <Book className="me-2" size={24} />
            <h2 className="mb-0">Learn CQL</h2>
            <Badge bg="primary" className="ms-3">Interactive Documentation</Badge>
          </div>
        </Col>
      </Row>

      <Row>
        {/* Navigation Tabs */}
        <Col xs={12} className="mb-4">
          <Nav variant="tabs" activeKey={activeTab} onSelect={setActiveTab}>
            <Nav.Item>
              <Nav.Link eventKey="basics">CQL Basics</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="examples">Interactive Examples</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="functions">Function Reference</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="patterns">Common Patterns</Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
      </Row>

      {/* CQL Basics Tab */}
      {activeTab === 'basics' && (
        <Row>
          <Col lg={8}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">CQL Language Fundamentals</h5>
              </Card.Header>
              <Card.Body>
                <div className="cql-documentation">
                  <section className="mb-4">
                    <h6>What is CQL?</h6>
                    <p>
                      Clinical Quality Language (CQL) is a domain-specific language for expressing clinical knowledge 
                      that can be used within both the Clinical Decision Support (CDS) and Clinical Quality Measurement (CQM) domains.
                    </p>
                  </section>

                  <section className="mb-4">
                    <h6>Basic Data Types</h6>
                    <ul>
                      <li><strong>Boolean:</strong> <code>true</code>, <code>false</code>, <code>null</code></li>
                      <li><strong>Integer:</strong> <code>42</code>, <code>-7</code></li>
                      <li><strong>Decimal:</strong> <code>3.14</code>, <code>-0.5</code></li>
                      <li><strong>String:</strong> <code>'Hello World'</code>, <code>"CQL Text"</code></li>
                      <li><strong>Date:</strong> <code>@2023-12-25</code></li>
                      <li><strong>DateTime:</strong> <code>@2023-12-25T10:30:00.0</code></li>
                      <li><strong>Time:</strong> <code>@T10:30:00.0</code></li>
                      <li><strong>Quantity:</strong> <code>5 'mg'</code>, <code>70 'kg'</code></li>
                    </ul>
                  </section>

                  <section className="mb-4">
                    <h6>Basic Operators</h6>
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Operators</th>
                            <th>Example</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Arithmetic</td>
                            <td><code>+ - * / ^</code></td>
                            <td><code>5 + 3 * 2</code></td>
                          </tr>
                          <tr>
                            <td>Comparison</td>
                            <td><code>= &lt;&gt; &lt; &gt; &lt;= &gt;=</code></td>
                            <td><code>age &gt;= 18</code></td>
                          </tr>
                          <tr>
                            <td>Logical</td>
                            <td><code>and or not</code></td>
                            <td><code>age &gt;= 18 and age &lt; 65</code></td>
                          </tr>
                          <tr>
                            <td>Membership</td>
                            <td><code>in contains</code></td>
                            <td><code>code in valueset</code></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="mb-4">
                    <h6>Library Structure</h6>
                    <pre className="bg-light p-3 rounded">
{`library ExampleLibrary version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

codesystem "SNOMED": 'http://snomed.info/sct'
valueset "Diabetes": 'http://example.org/fhir/ValueSet/diabetes'

context Patient

define "Patient Age": AgeInYears()
define "Has Diabetes": exists([Condition: "Diabetes"])
`}
                    </pre>
                  </section>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={4}>
            <Card>
              <Card.Header>
                <h6 className="mb-0">Quick Reference</h6>
              </Card.Header>
              <Card.Body>
                <div className="small">
                  <div className="mb-3">
                    <strong>Common Functions:</strong>
                    <ul className="list-unstyled mt-2">
                      <li><code>Today()</code> - Current date</li>
                      <li><code>AgeInYears()</code> - Patient age</li>
                      <li><code>exists()</code> - Check if data exists</li>
                      <li><code>Count()</code> - Count items</li>
                      <li><code>First()</code> - Get first item</li>
                      <li><code>Last()</code> - Get last item</li>
                    </ul>
                  </div>
                  
                  <div className="mb-3">
                    <strong>FHIR Resources:</strong>
                    <ul className="list-unstyled mt-2">
                      <li><code>[Patient]</code> - Patient data</li>
                      <li><code>[Condition]</code> - Diagnoses</li>
                      <li><code>[Observation]</code> - Lab results</li>
                      <li><code>[MedicationRequest]</code> - Prescriptions</li>
                      <li><code>[Encounter]</code> - Visits</li>
                    </ul>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Interactive Examples Tab */}
      {activeTab === 'examples' && (
        <Row>
          <Col lg={3}>
            <Card>
              <Card.Header>
                <h6 className="mb-0">Example Categories</h6>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="list-group list-group-flush">
                  {exampleCategories.map((category) => (
                    <div key={category.id}>
                      <div className="list-group-item bg-light fw-bold">
                        {category.name}
                      </div>
                      {category.examples.map((example) => (
                        <button
                          key={example.id}
                          className={`list-group-item list-group-item-action ${
                            selectedExample === example.id ? 'active' : ''
                          }`}
                          onClick={() => loadExample(example.id)}
                        >
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="fw-medium">{example.title}</div>
                              <small className="text-muted">{example.description}</small>
                            </div>
                            <Badge bg="secondary" className="ms-2">
                              {example.difficulty}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={9}>
            <Row>
              <Col xs={12} className="mb-3">
                <Card>
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                      <Code className="me-2" />
                      Interactive CQL Editor
                    </h6>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={handleRunExample}
                      disabled={isExecuting}
                      className="d-flex align-items-center"
                    >
                      <PlayFill className="me-1" />
                      {isExecuting ? 'Running...' : 'Run Example'}
                    </Button>
                  </Card.Header>
                  <Card.Body>
                    <SimpleCodeEditor
                      value={code}
                      onChange={setCode}
                      height="300px"
                    />
                  </Card.Body>
                </Card>
              </Col>
              
              <Col xs={12}>
                <Card>
                  <Card.Header>
                    <h6 className="mb-0">Results & Output</h6>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <ResultsPanel
                      results={results}
                      status={error ? 'error' : (isExecuting ? 'running' : 'success')}
                      logs={error ? error.message : ''}
                      height="200px"
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      )}

      {/* Function Reference Tab */}
      {activeTab === 'functions' && (
        <Row>
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">CQL Function Reference</h5>
              </Card.Header>
              <Card.Body>
                <div className="row">
                  {functionCategories.map((category) => (
                    <div key={category.name} className="col-lg-6 mb-4">
                      <h6 className="text-primary">{category.name}</h6>
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Function</th>
                              <th>Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {category.functions.map((func) => (
                              <tr key={func.name}>
                                <td><code>{func.signature}</code></td>
                                <td className="small">{func.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Common Patterns Tab */}
      {activeTab === 'patterns' && (
        <Row>
          <Col xs={12}>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Common CQL Patterns</h5>
              </Card.Header>
              <Card.Body>
                {cqlPatterns.map((pattern) => (
                  <div key={pattern.id} className="mb-4">
                    <h6 className="d-flex align-items-center">
                      <Lightbulb className="text-warning me-2" />
                      {pattern.title}
                    </h6>
                    <p className="text-muted">{pattern.description}</p>
                    <pre className="bg-light p-3 rounded">
                      <code>{pattern.code}</code>
                    </pre>
                    {pattern.explanation && (
                      <Alert variant="info" className="mt-2">
                        <small>{pattern.explanation}</small>
                      </Alert>
                    )}
                  </div>
                ))}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}

// Example data structures
const exampleCategories = [
  {
    id: 'basics',
    name: 'Basic Concepts',
    examples: [
      {
        id: 'data-types',
        title: 'Data Types',
        description: 'Working with CQL data types',
        difficulty: 'Beginner',
      },
      {
        id: 'expressions',
        title: 'Simple Expressions',
        description: 'Basic CQL expressions and calculations',
        difficulty: 'Beginner',
      },
    ]
  },
  {
    id: 'clinical',
    name: 'Clinical Data',
    examples: [
      {
        id: 'patient-data',
        title: 'Patient Demographics',
        description: 'Accessing patient information',
        difficulty: 'Beginner',
      },
      {
        id: 'conditions',
        title: 'Diagnosis Queries',
        description: 'Finding patient conditions',
        difficulty: 'Intermediate',
      },
    ]
  },
  {
    id: 'advanced',
    name: 'Advanced Techniques',
    examples: [
      {
        id: 'quality-measures',
        title: 'Quality Measures',
        description: 'Clinical quality measurement',
        difficulty: 'Advanced',
      }
    ]
  }
];

const interactiveExamples = [
  {
    id: 'data-types',
    code: `library DataTypesExample version '1.0.0'

// Boolean values
define "Is Adult": true
define "Has Insurance": false

// Numeric values  
define "Patient Age": 45
define "BMI": 24.7

// String values
define "Patient Name": 'John Doe'
define "Status": "Active"

// Date and time
define "Today": Today()
define "Appointment Date": @2024-03-15T10:30:00.0

// Quantities with units
define "Weight": 70 'kg'
define "Height": 175 'cm'
define "Blood Pressure": 120 'mm[Hg]'

// Calculated BMI
define "Calculated BMI": "Weight" / ("Height" / 100 'm')^2`
  },
  {
    id: 'expressions',
    code: `library ExpressionsExample version '1.0.0'

// Arithmetic operations
define "Addition": 10 + 5
define "Multiplication": 6 * 7
define "Division": 20 / 4
define "Power": 2 ^ 3

// Comparison operations
define "Is Greater": 10 > 5
define "Is Equal": 'CQL' = 'CQL'
define "Is Different": 'A' <> 'B'

// Logical operations
define "And Operation": true and false
define "Or Operation": true or false
define "Not Operation": not false

// Conditional expressions
define "Age Category": 
  if 25 >= 18 then 'Adult'
  else 'Minor'
  
define "Grade": 
  case 
    when 85 >= 90 then 'A'
    when 85 >= 80 then 'B'
    when 85 >= 70 then 'C'
    else 'F'
  end`
  },
  {
    id: 'patient-data',
    code: `library PatientDataExample version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// Basic patient information
define "Patient Name": Patient.name.first().given.first() + ' ' + Patient.name.first().family
define "Patient Gender": Patient.gender
define "Patient Birth Date": Patient.birthDate
define "Patient Age": AgeInYears()

// Patient demographics
define "Is Adult": AgeInYears() >= 18
define "Age Category": 
  case
    when AgeInYears() < 18 then 'Child'
    when AgeInYears() < 65 then 'Adult'
    else 'Senior'
  end

// Contact information
define "Phone Numbers": Patient.telecom T where T.system = 'phone'
define "Email Addresses": Patient.telecom T where T.system = 'email'
define "Primary Phone": First("Phone Numbers").value`
  },
  {
    id: 'conditions',
    code: `library ConditionsExample version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

valueset "Diabetes": 'http://example.org/fhir/ValueSet/diabetes'
valueset "Hypertension": 'http://example.org/fhir/ValueSet/hypertension'

// Find active conditions
define "Active Conditions": 
  [Condition] C 
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active"

// Check for specific conditions
define "Has Diabetes": 
  exists([Condition: "Diabetes"] C 
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active")

define "Has Hypertension":
  exists([Condition: "Hypertension"] C 
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active")

// Recent diagnoses (last 6 months)
define "Recent Diagnoses":
  [Condition] C
    where FHIRHelpers.ToDateTime(C.recordedDate) >= Today() - 6 months
      and FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active"

// Count of active conditions
define "Active Condition Count": Count("Active Conditions")`
  },
  {
    id: 'quality-measures',
    code: `library QualityMeasureExample version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

valueset "Diabetes": 'http://example.org/fhir/ValueSet/diabetes'
valueset "HbA1c": 'http://example.org/fhir/ValueSet/hba1c'

// Measurement Period
define "Measurement Period": Interval[@2023-01-01, @2023-12-31]

// Initial Population: Adults with diabetes
define "Initial Population":
  AgeInYears() >= 18
    and exists([Condition: "Diabetes"] C 
      where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active"
        and FHIRHelpers.ToDateTime(C.recordedDate) before end of "Measurement Period")

// Numerator: Patients with HbA1c test during measurement period
define "Has HbA1c Test":
  exists([Observation: "HbA1c"] O
    where FHIRHelpers.ToDateTime(O.effective) during "Measurement Period"
      and O.status = 'final')

define "Numerator": "Initial Population" and "Has HbA1c Test"

// Denominator
define "Denominator": "Initial Population"

// Calculate quality score
define "Meets Quality Measure": "Has HbA1c Test"

// Additional metrics
define "Most Recent HbA1c":
  Last([Observation: "HbA1c"] O
    where FHIRHelpers.ToDateTime(O.effective) during "Measurement Period"
      and O.status = 'final'
    sort by FHIRHelpers.ToDateTime(effective) desc)`
  }
];

const functionCategories = [
  {
    name: 'Date/Time Functions',
    functions: [
      { signature: 'Today()', description: 'Returns the current date' },
      { signature: 'Now()', description: 'Returns the current date and time' },
      { signature: 'AgeInYears()', description: 'Calculates age in years' },
      { signature: 'AgeInMonths()', description: 'Calculates age in months' },
      { signature: 'year from date', description: 'Extracts year from a date' },
      { signature: 'month from date', description: 'Extracts month from a date' },
    ]
  },
  {
    name: 'Aggregate Functions',
    functions: [
      { signature: 'Count(list)', description: 'Returns the number of elements' },
      { signature: 'Sum(list)', description: 'Returns the sum of numeric values' },
      { signature: 'Average(list)', description: 'Returns the average of numeric values' },
      { signature: 'Min(list)', description: 'Returns the minimum value' },
      { signature: 'Max(list)', description: 'Returns the maximum value' },
    ]
  },
  {
    name: 'List Functions',
    functions: [
      { signature: 'First(list)', description: 'Returns the first element' },
      { signature: 'Last(list)', description: 'Returns the last element' },
      { signature: 'exists(list)', description: 'Returns true if list is not empty' },
      { signature: 'Length(list)', description: 'Returns the number of elements' },
      { signature: 'flatten(list)', description: 'Flattens nested lists' },
    ]
  },
  {
    name: 'Math Functions',
    functions: [
      { signature: 'Abs(value)', description: 'Returns absolute value' },
      { signature: 'Ceiling(value)', description: 'Rounds up to nearest integer' },
      { signature: 'Floor(value)', description: 'Rounds down to nearest integer' },
      { signature: 'Round(value)', description: 'Rounds to nearest integer' },
      { signature: 'Sqrt(value)', description: 'Returns square root' },
    ]
  }
];

const cqlPatterns = [
  {
    id: 'patient-age-check',
    title: 'Age-based Patient Selection',
    description: 'Common pattern for selecting patients by age ranges',
    code: `// Simple age check
define "Is Adult": AgeInYears() >= 18

// Age range
define "Working Age": AgeInYears() between 18 and 65

// Multiple age categories
define "Age Group":
  case
    when AgeInYears() < 18 then 'Pediatric'
    when AgeInYears() between 18 and 64 then 'Adult'
    else 'Geriatric'
  end`,
    explanation: 'Use AgeInYears() function for age calculations. The between operator is inclusive on both ends.'
  },
  {
    id: 'condition-check',
    title: 'Active Condition Detection',
    description: 'Standard pattern for checking if a patient has an active medical condition',
    code: `valueset "Diabetes": 'http://example.org/fhir/ValueSet/diabetes'

define "Has Active Diabetes":
  exists([Condition: "Diabetes"] C 
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active")

// With date constraints
define "Recent Diabetes Diagnosis":
  exists([Condition: "Diabetes"] C 
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active"
      and FHIRHelpers.ToDateTime(C.recordedDate) >= Today() - 1 year)`,
    explanation: 'Always check clinicalStatus when working with conditions. Use FHIRHelpers for data type conversions.'
  },
  {
    id: 'observation-latest',
    title: 'Finding Most Recent Lab Results',
    description: 'Pattern for retrieving the most recent observation or lab value',
    code: `valueset "HbA1c Tests": 'http://example.org/fhir/ValueSet/hba1c'

define "Most Recent HbA1c":
  Last([Observation: "HbA1c Tests"] O
    where O.status in {'final', 'amended'}
      and FHIRHelpers.ToDateTime(O.effective) <= Today()
    sort by FHIRHelpers.ToDateTime(effective) desc)

define "Latest HbA1c Value":
  FHIRHelpers.ToQuantity("Most Recent HbA1c".value)`,
    explanation: 'Use Last() with sort by to get the most recent result. Always check observation status.'
  },
  {
    id: 'medication-active',
    title: 'Active Medication Check',
    description: 'Standard approach for checking if a patient is on specific medications',
    code: `valueset "ACE Inhibitors": 'http://example.org/fhir/ValueSet/ace-inhibitors'

define "Currently on ACE Inhibitor":
  exists([MedicationRequest: "ACE Inhibitors"] MR
    where MR.status = 'active'
      and MR.intent = 'order')

// With date range
define "ACE Inhibitor in Last Year":
  exists([MedicationRequest: "ACE Inhibitors"] MR
    where MR.status in {'active', 'completed'}
      and FHIRHelpers.ToDateTime(MR.authoredOn) >= Today() - 1 year)`,
    explanation: 'Check both status and intent for medication requests. Consider date ranges for historical queries.'
  }
];

export default LearnPage;