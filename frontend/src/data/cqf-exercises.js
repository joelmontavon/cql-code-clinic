/**
 * CQF Exercises - Comprehensive CQL Learning Progression
 * Based on: https://github.com/cqframework/cqf-exercises
 * 
 * Structured learning path covering all aspects of CQL (Clinical Quality Language)
 */

export const CQF_EXERCISES = [
  // Module 1: CQL Syntax and Error Recognition
  {
    id: 'cqf-01-syntax-errors',
    module: 1,
    title: 'CQL Syntax and Error Recognition',
    description: 'Learn to identify and fix common CQL syntax errors',
    difficulty: 'beginner',
    estimatedTime: 15,
    learningObjectives: [
      'Recognize lexical errors in CQL code',
      'Understand proper identifier naming conventions',
      'Fix syntax errors in CQL expressions',
      'Use proper string quoting and escaping'
    ],
    prerequisites: [],
    tabs: [
      {
        name: 'Exercise',
        template: `library Exercises01 version '1.0.0'

// TODO: Fix the following syntax errors

// 1. Fix the string literal error
define "Bad String": 'This is a bad string"

// 2. Fix the identifier naming error  
define "2BadIdentifier": true

// 3. Fix the comparison operator error
define "Bad Comparison": 4 == 5

// 4. Fix the quantity expression error
define "Bad Quantity": 5 'mg'

// 5. Create a valid library statement
using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers`,
        key: `library Exercises01 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

// Fixed syntax errors
define "Good String": 'This is a good string'

define "GoodIdentifier": true

define "Good Comparison": 4 <> 5

define "Good Quantity": 5 'mg'`
      }
    ],
    hints: [
      {
        trigger: "string",
        message: "String literals must use matching quote types - either 'single' or \"double\" quotes consistently."
      },
      {
        trigger: "identifier",
        message: "Identifiers cannot start with numbers. Use descriptive names that start with letters."
      },
      {
        trigger: "==",
        message: "CQL uses '=' for equality and '<>' for inequality, not '==' and '!='."
      },
      {
        trigger: "quantity",
        message: "Quantities need proper spacing: use '5 \\'mg\\'' not '5\\'mg\\''."
      }
    ],
    validation: {
      requiredElements: ['library', 'using', 'define'],
      checkSyntax: true,
      customTests: [
        {
          description: "All string literals use proper quoting",
          test: (code) => !code.includes("'") || !code.includes('"') || code.match(/'[^']*'/g) || code.match(/"[^"]*"/g)
        }
      ]
    }
  },

  // Module 2: Basic Data Types and Operations
  {
    id: 'cqf-02-data-types',
    module: 2, 
    title: 'Basic Data Types and Operations',
    description: 'Master CQL\'s fundamental data types and operations',
    difficulty: 'beginner',
    estimatedTime: 20,
    learningObjectives: [
      'Work with boolean, string, and numeric types',
      'Understand date/time operations',
      'Create and manipulate quantities with units',
      'Handle null values and 3-valued logic'
    ],
    prerequisites: ['cqf-01-syntax-errors'],
    tabs: [
      {
        name: 'Exercise',
        template: `library Exercises02 version '1.0.0'

// TODO: Complete the following data type exercises

// 1. Boolean operations
define "Boolean And": true and false
define "Boolean Or": // TODO: Create an OR expression that evaluates to true

// 2. String operations
define "String Concatenation": 'Hello' + ' World'
define "String Comparison": // TODO: Compare two strings for equality

// 3. Numeric operations
define "Integer Math": 10 + 5 * 2
define "Decimal Division": // TODO: Divide 10 by 3 to get a decimal result

// 4. Date operations
define "Today": Today()
define "Date Arithmetic": // TODO: Add 30 days to today

// 5. Quantities
define "Weight": 70 'kg' 
define "Height": // TODO: Create a height quantity in centimeters

// 6. Null handling
define "Null Comparison": null is null
define "Coalesce Example": // TODO: Use Coalesce to handle a null value`,
        key: `library Exercises02 version '1.0.0'

// Completed data type exercises
define "Boolean And": true and false
define "Boolean Or": true or false

define "String Concatenation": 'Hello' + ' World'
define "String Comparison": 'CQL' = 'CQL'

define "Integer Math": 10 + 5 * 2
define "Decimal Division": 10.0 / 3.0

define "Today": Today()
define "Date Arithmetic": Today() + 30 days

define "Weight": 70 'kg'
define "Height": 175 'cm'

define "Null Comparison": null is null
define "Coalesce Example": Coalesce(null, 'Default Value')`
      }
    ],
    hints: [
      {
        trigger: "boolean",
        message: "Use 'and', 'or', 'not' for boolean operations. Try combining true/false values."
      },
      {
        trigger: "string",
        message: "Strings can be compared with '=' or concatenated with '+'. Use single quotes for string literals."
      },
      {
        trigger: "decimal",
        message: "For decimal division, ensure at least one operand is decimal: 10.0 / 3.0"
      },
      {
        trigger: "date",
        message: "Add time periods to dates using '+': Today() + 30 days"
      }
    ],
    validation: {
      requiredElements: ['Boolean Or', 'String Comparison', 'Decimal Division', 'Date Arithmetic', 'Height', 'Coalesce Example'],
      checkSyntax: true
    }
  },

  // Module 3: Comparisons and Arithmetic
  {
    id: 'cqf-03-comparisons',
    module: 3,
    title: 'Comparisons and Arithmetic Operations',
    description: 'Learn advanced comparison operators and mathematical functions',
    difficulty: 'beginner',
    estimatedTime: 25,
    learningObjectives: [
      'Master equality vs equivalence operators',
      'Use mathematical functions and operations',
      'Understand operator precedence',
      'Work with conditional logic'
    ],
    prerequisites: ['cqf-02-data-types'],
    tabs: [
      {
        name: 'Exercise', 
        template: `library Exercises03 version '1.0.0'

// TODO: Practice comparison and arithmetic operations

// 1. Equality vs Equivalence
define "Equality": 'ABC' = 'ABC'
define "Equivalence": // TODO: Use ~ operator to compare strings ignoring case

// 2. Mathematical functions
define "Absolute Value": Abs(-5)
define "Square Root": // TODO: Calculate square root of 16
define "Power": // TODO: Calculate 2 to the power of 3

// 3. Conditional logic
define "Age Category": 
  if 25 >= 18 then 'Adult'
  else 'Minor'

define "Grade Category": // TODO: Use case-when to categorize score 85
  // A: 90-100, B: 80-89, C: 70-79, F: below 70

// 4. Date comparisons
define "Date Difference": difference in days between @2023-01-01 and @2023-01-31
define "Date Range": // TODO: Check if Today() is in the year 2024

// 5. Precedence
define "Precedence Test": 2 + 3 * 4
define "Forced Precedence": // TODO: Use parentheses to add first: (2 + 3) * 4`,
        key: `library Exercises03 version '1.0.0'

// Completed comparison and arithmetic exercises
define "Equality": 'ABC' = 'ABC'
define "Equivalence": 'ABC' ~ 'abc'

define "Absolute Value": Abs(-5)
define "Square Root": Sqrt(16)
define "Power": 2 ^ 3

define "Age Category": 
  if 25 >= 18 then 'Adult'
  else 'Minor'

define "Grade Category": 
  case 
    when 85 >= 90 then 'A'
    when 85 >= 80 then 'B' 
    when 85 >= 70 then 'C'
    else 'F'
  end

define "Date Difference": difference in days between @2023-01-01 and @2023-01-31
define "Date Range": year from Today() = 2024

define "Precedence Test": 2 + 3 * 4
define "Forced Precedence": (2 + 3) * 4`
      }
    ],
    hints: [
      {
        trigger: "equivalence",
        message: "The ~ operator performs equivalence comparison, which is case-insensitive for strings."
      },
      {
        trigger: "sqrt",
        message: "Use Sqrt() function for square root calculations."
      },
      {
        trigger: "case",
        message: "Use 'case when condition then result else default end' for multiple conditions."
      }
    ],
    validation: {
      requiredElements: ['Equivalence', 'Square Root', 'Power', 'Grade Category', 'Date Range', 'Forced Precedence'],
      checkSyntax: true
    }
  },

  // Module 4: Lists and Intervals
  {
    id: 'cqf-04-lists-intervals',
    module: 4,
    title: 'Lists and Intervals',
    description: 'Work with collections and interval operations',
    difficulty: 'intermediate',
    estimatedTime: 30,
    learningObjectives: [
      'Create and manipulate lists',
      'Understand interval operations',
      'Use aggregate functions',
      'Perform set operations on collections'
    ],
    prerequisites: ['cqf-03-comparisons'],
    tabs: [
      {
        name: 'Exercise',
        template: `library Exercises04 version '1.0.0'

// TODO: Practice with lists and intervals

// 1. List operations
define "Number List": {1, 2, 3, 4, 5}
define "First Item": First("Number List")
define "Last Three": // TODO: Get the last 3 items from the list

// 2. List aggregations  
define "List Sum": Sum({10, 20, 30})
define "List Average": // TODO: Calculate average of {1, 2, 3, 4, 5}
define "List Count": Count({1, 2, 3, null, 5}) // Note: null is ignored

// 3. Intervals
define "Age Range": Interval[18, 65)
define "Date Range": Interval[@2023-01-01, @2023-12-31]
define "Contains Check": // TODO: Check if 25 is in the Age Range

// 4. Interval operations
define "Overlaps": Interval[1, 10] overlaps Interval[5, 15]
define "Before": // TODO: Check if Interval[1,5] is before Interval[10,15]

// 5. Set operations
define "Union": {1, 2, 3} union {3, 4, 5}
define "Intersect": // TODO: Find intersection of {1,2,3,4} and {3,4,5,6}
define "Except": {1, 2, 3, 4} except {3, 4} // Result: {1, 2}`,
        key: `library Exercises04 version '1.0.0'

// Completed list and interval exercises
define "Number List": {1, 2, 3, 4, 5}
define "First Item": First("Number List")
define "Last Three": Last("Number List", 3)

define "List Sum": Sum({10, 20, 30})
define "List Average": Average({1, 2, 3, 4, 5})
define "List Count": Count({1, 2, 3, null, 5})

define "Age Range": Interval[18, 65)
define "Date Range": Interval[@2023-01-01, @2023-12-31]
define "Contains Check": 25 in "Age Range"

define "Overlaps": Interval[1, 10] overlaps Interval[5, 15]
define "Before": Interval[1,5] before Interval[10,15]

define "Union": {1, 2, 3} union {3, 4, 5}
define "Intersect": {1,2,3,4} intersect {3,4,5,6}
define "Except": {1, 2, 3, 4} except {3, 4}`
      }
    ],
    hints: [
      {
        trigger: "last",
        message: "Use Last(list, count) to get the last N items from a list."
      },
      {
        trigger: "average",
        message: "The Average() function calculates the mean of numeric values in a list."
      },
      {
        trigger: "contains",
        message: "Use 'value in interval' to check if a value is contained within an interval."
      }
    ],
    validation: {
      requiredElements: ['Last Three', 'List Average', 'Contains Check', 'Before', 'Intersect'],
      checkSyntax: true
    }
  },

  // Module 5: Terminology and Codes
  {
    id: 'cqf-05-terminology',
    module: 5,
    title: 'Terminology and Code Systems',
    description: 'Work with healthcare terminologies and code systems',
    difficulty: 'intermediate',
    estimatedTime: 25,
    learningObjectives: [
      'Define code systems and value sets',
      'Work with SNOMED, LOINC, and other terminologies',
      'Perform code membership testing',
      'Understand concept hierarchies'
    ],
    prerequisites: ['cqf-04-lists-intervals'],
    tabs: [
      {
        name: 'Exercise',
        template: `library Exercises05 version '1.0.0'

using FHIR version '4.0.1'

// TODO: Work with terminology and code systems

// 1. Code system definitions
codesystem "SNOMED": 'http://snomed.info/sct' 
codesystem "LOINC": // TODO: Define LOINC code system URL

// 2. Code definitions
code "Female": '248152002' from "SNOMED" display 'Female'
code "Male": // TODO: Define male code from SNOMED (248153007)

// 3. Value set definitions
valueset "Administrative Gender": 'http://hl7.org/fhir/ValueSet/administrative-gender'
valueset "Marital Status": // TODO: Define marital status value set

// 4. Concept definitions  
concept "Gender Female": { "Female" } display 'Female'
concept "Gender Male": // TODO: Define male gender concept

// 5. Code membership testing
define "Is Female Code": "Female" in "Administrative Gender"
define "Code Display": // TODO: Get the display value of the Female code

// 6. Patient attribute examples (these would work with real FHIR data)
// define "Patient Gender": Patient.gender
// define "Is Patient Female": "Patient Gender" in "Administrative Gender"`,
        key: `library Exercises05 version '1.0.0'

using FHIR version '4.0.1'

// Completed terminology exercises
codesystem "SNOMED": 'http://snomed.info/sct'
codesystem "LOINC": 'http://loinc.org'

code "Female": '248152002' from "SNOMED" display 'Female'
code "Male": '248153007' from "SNOMED" display 'Male'

valueset "Administrative Gender": 'http://hl7.org/fhir/ValueSet/administrative-gender'
valueset "Marital Status": 'http://hl7.org/fhir/ValueSet/marital-status'

concept "Gender Female": { "Female" } display 'Female'
concept "Gender Male": { "Male" } display 'Male'

define "Is Female Code": "Female" in "Administrative Gender"
define "Code Display": "Female".display`
      }
    ],
    hints: [
      {
        trigger: "loinc",
        message: "LOINC code system URL is 'http://loinc.org'"
      },
      {
        trigger: "male",
        message: "Male gender code in SNOMED is '248153007'"
      },
      {
        trigger: "display",
        message: "Access code display with: code.display"
      }
    ],
    validation: {
      requiredElements: ['LOINC', 'Male', 'Marital Status', 'Gender Male', 'Code Display'],
      checkSyntax: true
    }
  },

  // Module 6: Functions and Libraries
  {
    id: 'cqf-06-functions-libraries',
    module: 6,
    title: 'Functions and CQL Libraries',
    description: 'Create reusable functions and understand library imports',
    difficulty: 'intermediate',
    estimatedTime: 30,
    learningObjectives: [
      'Define custom functions with parameters',
      'Understand function overloading',
      'Work with library includes and namespaces',
      'Use built-in CQL functions effectively'
    ],
    prerequisites: ['cqf-05-terminology'],
    tabs: [
      {
        name: 'Exercise',
        template: `library Exercises06 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

// TODO: Practice with functions and libraries

// 1. Define a simple function
define function "CalculateBMI"(weight Quantity, height Quantity):
  // TODO: Calculate BMI = weight (kg) / (height (m))^2

// 2. Function with overloading
define function "IsAdult"(age Integer):
  age >= 18

define function "IsAdult"(birthDate Date):
  // TODO: Calculate if person is adult based on birth date

// 3. Function with optional parameters
define function "FormatName"(firstName String, lastName String, middle String):
  // TODO: Format full name, handling optional middle name

// 4. Using built-in functions
define "Current Date": Today()
define "Date Math": // TODO: Calculate date 6 months from today
define "String Functions": // TODO: Convert "john doe" to proper case

// 5. Working with collections in functions
define function "FilterAdults"(ages List<Integer>):
  // TODO: Filter list to return only ages >= 18

// 6. Library namespace usage (using FHIRHelpers)
// define "Convert FHIR Date": FHIRHelpers.ToDate(@2023-06-15)`,
        key: `library Exercises06 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

// Completed functions and libraries exercises
define function "CalculateBMI"(weight Quantity, height Quantity):
  weight / (height * height)

define function "IsAdult"(age Integer):
  age >= 18

define function "IsAdult"(birthDate Date):
  AgeInYears() >= 18

define function "FormatName"(firstName String, lastName String, middle String):
  if middle is not null then
    firstName + ' ' + middle + ' ' + lastName
  else
    firstName + ' ' + lastName

define "Current Date": Today()
define "Date Math": Today() + 6 months
define "String Functions": Proper('john doe')

define function "FilterAdults"(ages List<Integer>):
  ages A where A >= 18`
      }
    ],
    hints: [
      {
        trigger: "bmi",
        message: "BMI = weight / (height * height). Make sure units are consistent (kg and m)."
      },
      {
        trigger: "proper",
        message: "Use Proper() function to convert strings to proper case."
      },
      {
        trigger: "filter",
        message: "Use 'collection alias where condition' syntax to filter lists."
      }
    ],
    validation: {
      requiredElements: ['CalculateBMI', 'IsAdult', 'FormatName', 'Date Math', 'String Functions', 'FilterAdults'],
      checkSyntax: true
    }
  },

  // Module 7: FHIR Data Access and Queries
  {
    id: 'cqf-07-fhir-queries',
    module: 7,
    title: 'FHIR Data Access and Queries', 
    description: 'Access and query FHIR resources in clinical data',
    difficulty: 'advanced',
    estimatedTime: 40,
    learningObjectives: [
      'Access FHIR resources and attributes',
      'Filter resources using where clauses',
      'Navigate FHIR resource references',
      'Work with FHIR data types and extensions'
    ],
    prerequisites: ['cqf-06-functions-libraries'],
    tabs: [
      {
        name: 'Exercise',
        template: `library Exercises07 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

// TODO: Practice FHIR data access and queries

// 1. Basic resource access
context Patient
define "Patient Demographics":
  // TODO: Create tuple with patient's name, birthDate, and gender

// 2. Resource filtering
define "Recent Observations":
  // TODO: Get observations from last 30 days
  [Observation] O
    where O.effective.value >= (Today() - 30 days)

define "Lab Results":
  // TODO: Filter observations for laboratory results only

// 3. Resource navigation and references
define "Patient Encounters":
  [Encounter] E where E.subject.reference = 'Patient/' + Patient.id

define "Encounter Diagnoses":
  // TODO: Get all condition resources linked to encounters

// 4. Working with FHIR data types
define "Blood Pressure Readings":
  [Observation: "Blood Pressure"] BP
    // TODO: Extract systolic and diastolic values

// 5. Medication queries
define "Active Medications":
  // TODO: Get active medication requests
  [MedicationRequest] MR
    where MR.status = 'active'

// 6. Complex filtering with exists
define "Has Diabetes":
  // TODO: Check if patient has diabetes diagnosis
  exists([Condition: "Diabetes"] C where C.clinicalStatus = 'active')`,
        key: `library Exercises07 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// Completed FHIR queries exercises  
define "Patient Demographics":
  Tuple {
    name: Patient.name.first().given.first() + ' ' + Patient.name.first().family,
    birthDate: Patient.birthDate,
    gender: Patient.gender
  }

define "Recent Observations":
  [Observation] O
    where FHIRHelpers.ToDateTime(O.effective) >= (Today() - 30 days)

define "Lab Results":
  [Observation] O
    where O.category contains "laboratory"

define "Patient Encounters":
  [Encounter] E where E.subject.reference = 'Patient/' + Patient.id

define "Encounter Diagnoses":
  [Condition] C
    where exists(C.encounter E where E.reference in ("Patient Encounters" PE return 'Encounter/' + PE.id))

define "Blood Pressure Readings":
  [Observation: "Blood Pressure"] BP
    let systolic: (BP.component C where C.code ~ "Systolic Blood Pressure").value,
        diastolic: (BP.component C where C.code ~ "Diastolic Blood Pressure").value
    return Tuple { systolic: systolic, diastolic: diastolic }

define "Active Medications":
  [MedicationRequest] MR
    where MR.status = 'active'
      and MR.intent = 'order'

define "Has Diabetes":
  exists([Condition: "Diabetes"] C 
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active")`
      }
    ],
    hints: [
      {
        trigger: "tuple",
        message: "Use Tuple { field: value, field2: value2 } syntax to create structured data."
      },
      {
        trigger: "exists", 
        message: "Use exists() to check if any resources match your criteria."
      },
      {
        trigger: "reference",
        message: "FHIR references use the format 'ResourceType/id'."
      }
    ],
    validation: {
      requiredElements: ['Patient Demographics', 'Lab Results', 'Encounter Diagnoses', 'Blood Pressure Readings', 'Active Medications', 'Has Diabetes'],
      checkSyntax: true
    }
  },

  // Module 8: Clinical Decision Logic
  {
    id: 'cqf-08-clinical-logic',
    module: 8,
    title: 'Clinical Decision Support Logic',
    description: 'Implement clinical decision support rules and quality measures',
    difficulty: 'advanced',
    estimatedTime: 45,
    learningObjectives: [
      'Build clinical decision support rules',
      'Implement quality measure logic', 
      'Handle complex clinical scenarios',
      'Create recommendation systems'
    ],
    prerequisites: ['cqf-07-fhir-queries'],
    tabs: [
      {
        name: 'Exercise',
        template: `library Exercises08 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

codesystem "SNOMED": 'http://snomed.info/sct'
valueset "Diabetes": 'http://example.org/fhir/ValueSet/diabetes'
valueset "Hypertension": 'http://example.org/fhir/ValueSet/hypertension'

// TODO: Implement clinical decision support logic

// 1. Risk stratification
define "Diabetes Risk Factors":
  // TODO: Count risk factors: age > 45, BMI > 25, family history
  0

define "High Risk Patient":
  // TODO: Determine if patient is high risk (>= 2 risk factors)

// 2. Medication dosing logic
define "Recommended Insulin Dose":
  // TODO: Calculate insulin dose based on weight and glucose levels
  // Base formula: weight * 0.5 units/kg, adjust for glucose > 200

// 3. Screening recommendations
define "Due for Mammography":
  // TODO: Women 50-74 should have mammography every 2 years
  Patient.gender = 'female' 
    and AgeInYears() between 50 and 74

define "Last Mammography":
  // TODO: Get most recent mammography date

// 4. Quality measure: HbA1c testing
define "Has Recent HbA1c":
  // TODO: Diabetic patients should have HbA1c test within 6 months
  exists([Observation: "HbA1c"] O 
    where FHIRHelpers.ToDateTime(O.effective) >= Today() - 6 months)

// 5. Drug interaction checking
define "ACE Inhibitor Prescriptions":
  [MedicationRequest] MR
    where MR.medication in "ACE Inhibitors"
      and MR.status = 'active'

define "Potassium Level Check Needed":
  // TODO: Patients on ACE inhibitors need potassium monitoring

// 6. Clinical alerts
define "Critical Lab Values":
  // TODO: Flag critical values requiring immediate attention
  [Observation] O
    where O.value > 400 'mg/dL' // Critical glucose level`,
        key: `library Exercises08 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

codesystem "SNOMED": 'http://snomed.info/sct'
valueset "Diabetes": 'http://example.org/fhir/ValueSet/diabetes'
valueset "Hypertension": 'http://example.org/fhir/ValueSet/hypertension'
valueset "ACE Inhibitors": 'http://example.org/fhir/ValueSet/ace-inhibitors'

// Completed clinical decision support logic
define "Diabetes Risk Factors":
  (if AgeInYears() > 45 then 1 else 0) +
  (if "Patient BMI" > 25 'kg/m2' then 1 else 0) +
  (if exists("Family History Diabetes") then 1 else 0)

define "High Risk Patient":
  "Diabetes Risk Factors" >= 2

define "Patient BMI": 
  70 'kg' / (1.75 'm')^2  // Mock calculation

define "Family History Diabetes":
  [FamilyMemberHistory] F where F.condition.code in "Diabetes"

define "Recommended Insulin Dose":
  let baseUnits: 70 'kg' * 0.5 '{units/kg}',
      glucoseAdjustment: if "Latest Glucose" > 200 'mg/dL' then 10 '{units}' else 0 '{units}'
  return baseUnits + glucoseAdjustment

define "Latest Glucose":
  Last([Observation: "Glucose"] O 
    sort by FHIRHelpers.ToDateTime(effective) desc).value

define "Due for Mammography":
  Patient.gender = 'female' 
    and AgeInYears() between 50 and 74
    and (not exists("Last Mammography") 
         or "Last Mammography" <= Today() - 2 years)

define "Last Mammography":
  Last([Procedure: "Mammography"] P 
    sort by FHIRHelpers.ToDateTime(performed) desc).performed

define "Has Recent HbA1c":
  exists("Active Diabetes") and
  exists([Observation: "HbA1c"] O 
    where FHIRHelpers.ToDateTime(O.effective) >= Today() - 6 months)

define "Active Diabetes":
  [Condition: "Diabetes"] C 
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active"

define "ACE Inhibitor Prescriptions":
  [MedicationRequest] MR
    where FHIRHelpers.ToConcept(MR.medication) in "ACE Inhibitors"
      and MR.status = 'active'

define "Potassium Level Check Needed":
  exists("ACE Inhibitor Prescriptions") and
  not exists([Observation: "Potassium"] O
    where FHIRHelpers.ToDateTime(O.effective) >= Today() - 30 days)

define "Critical Lab Values":
  [Observation] O
    where FHIRHelpers.ToQuantity(O.value) > 400 'mg/dL'
      and O.code ~ "Glucose"`
      }
    ],
    hints: [
      {
        trigger: "risk",
        message: "Sum individual risk factors using conditional logic: (if condition then 1 else 0)."
      },
      {
        trigger: "last",
        message: "Use Last() with sort by to get the most recent resource."
      },
      {
        trigger: "dosing",
        message: "Create base dose then add adjustments based on clinical parameters."
      }
    ],
    validation: {
      requiredElements: ['High Risk Patient', 'Recommended Insulin Dose', 'Due for Mammography', 'Has Recent HbA1c', 'Potassium Level Check Needed', 'Critical Lab Values'],
      checkSyntax: true
    }
  },

  // Module 9: Advanced CQL Features
  {
    id: 'cqf-09-advanced-features',
    module: 9,
    title: 'Advanced CQL Features',
    description: 'Master advanced CQL concepts and optimization techniques',
    difficulty: 'advanced',
    estimatedTime: 35,
    learningObjectives: [
      'Use advanced query constructs',
      'Optimize CQL performance',
      'Handle complex data transformations',
      'Work with temporal logic'
    ],
    prerequisites: ['cqf-08-clinical-logic'],
    tabs: [
      {
        name: 'Exercise',
        template: `library Exercises09 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// TODO: Practice advanced CQL features

// 1. Advanced query constructs
define "Patient Medication Timeline":
  // TODO: Create timeline of all medications with start/end dates
  [MedicationRequest] MR
    return Tuple {
      medication: MR.medication,
      start: FHIRHelpers.ToDateTime(MR.dosageInstruction.timing.repeat.bounds.start),
      end: FHIRHelpers.ToDateTime(MR.dosageInstruction.timing.repeat.bounds.end)
    }
    sort by start

// 2. Complex aggregations
define "Average Lab Values by Month":
  // TODO: Group lab values by month and calculate averages

// 3. Temporal relationships
define "Medications Started After Diagnosis":
  // TODO: Find medications started after diabetes diagnosis
  let diagnosisDate: First([Condition: "Diabetes"] C 
    where C.clinicalStatus = 'active').onset
  return [MedicationRequest] MR
    where FHIRHelpers.ToDateTime(MR.authoredOn) after diagnosisDate

// 4. Complex filtering with multiple conditions
define "Complicated Diabetes Patients":
  // TODO: Patients with diabetes AND (hypertension OR kidney disease)
  exists([Condition: "Diabetes"] D where D.clinicalStatus = 'active')

// 5. Data transformation and flattening
define "All Patient Codes":
  // TODO: Flatten all condition, procedure, and observation codes
  ([Condition] C return C.code.coding) union
  ([Procedure] P return P.code.coding) union
  ([Observation] O return O.code.coding)

// 6. Performance optimization
define "Recent Active Conditions":
  // TODO: Optimize query for active conditions in last year
  [Condition] C
    where C.clinicalStatus = 'active'
      and FHIRHelpers.ToDateTime(C.recordedDate) >= Today() - 1 year

// 7. Null handling and coalescing
define "Patient Contact Info":
  // TODO: Get preferred contact method with fallbacks
  Coalesce(
    Patient.telecom.where(use = 'mobile').value,
    Patient.telecom.where(use = 'home').value,
    Patient.telecom.where(system = 'email').value
  )`,
        key: `library Exercises09 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// Completed advanced CQL features
define "Patient Medication Timeline":
  [MedicationRequest] MR
    let startDate: FHIRHelpers.ToDateTime(MR.authoredOn),
        endDate: FHIRHelpers.ToDateTime(MR.dosageInstruction.timing.repeat.bounds.end)
    return Tuple {
      medication: FHIRHelpers.ToConcept(MR.medication).display,
      start: startDate,
      end: endDate,
      duration: difference in days between startDate and endDate
    }
    sort by start

define "Average Lab Values by Month":
  [Observation: "Glucose"] O
    let monthYear: Tuple { 
      year: year from FHIRHelpers.ToDateTime(O.effective),
      month: month from FHIRHelpers.ToDateTime(O.effective)
    }
    group by monthYear
    return Tuple {
      period: monthYear,
      avgValue: Average(O.value),
      count: Count(O)
    }

define "Medications Started After Diagnosis":
  let diagnosisDate: First([Condition: "Diabetes"] C 
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active"
    sort by FHIRHelpers.ToDateTime(recordedDate)
  ).recordedDate
  return [MedicationRequest] MR
    where FHIRHelpers.ToDateTime(MR.authoredOn) after diagnosisDate

define "Complicated Diabetes Patients":
  exists([Condition: "Diabetes"] D 
    where FHIRHelpers.ToConcept(D.clinicalStatus) ~ "active") and
  (exists([Condition: "Hypertension"] H 
    where FHIRHelpers.ToConcept(H.clinicalStatus) ~ "active") or
   exists([Condition: "Kidney Disease"] K 
    where FHIRHelpers.ToConcept(K.clinicalStatus) ~ "active"))

define "All Patient Codes":
  flatten({
    [Condition] C return C.code.coding,
    [Procedure] P return P.code.coding,
    [Observation] O return O.code.coding
  })

define "Recent Active Conditions":
  [Condition] C
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active"
      and FHIRHelpers.ToDateTime(C.recordedDate) during Interval[Today() - 1 year, Today()]

define "Patient Contact Info":
  Coalesce(
    First(Patient.telecom T where T.use = 'mobile').value,
    First(Patient.telecom T where T.use = 'home').value, 
    First(Patient.telecom T where T.system = 'email').value,
    'No contact information available'
  )`
      }
    ],
    hints: [
      {
        trigger: "group",
        message: "Use 'group by' to aggregate data by common attributes."
      },
      {
        trigger: "flatten",
        message: "Use flatten() to convert nested lists into a single flat list."
      },
      {
        trigger: "during",
        message: "Use 'during' for time period containment checks."
      }
    ],
    validation: {
      requiredElements: ['Average Lab Values by Month', 'Medications Started After Diagnosis', 'Complicated Diabetes Patients', 'All Patient Codes', 'Recent Active Conditions', 'Patient Contact Info'],
      checkSyntax: true
    }
  },

  // Module 10: Quality Measures and Reporting
  {
    id: 'cqf-10-quality-measures',
    module: 10,
    title: 'Quality Measures and Clinical Reporting',
    description: 'Build comprehensive quality measures and clinical reports',
    difficulty: 'advanced',
    estimatedTime: 50,
    learningObjectives: [
      'Implement HEDIS and CMS quality measures',
      'Create population-based calculations',
      'Build clinical quality reporting',
      'Handle measure exclusions and exceptions'
    ],
    prerequisites: ['cqf-09-advanced-features'],
    tabs: [
      {
        name: 'Exercise',
        template: `library Exercises10 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

// TODO: Implement quality measures and reporting

// 1. Population definitions
define "Initial Population":
  // TODO: Adults 18-75 with diabetes
  AgeInYears() between 18 and 75
    and exists([Condition: "Diabetes"] C 
      where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active")

define "Denominator":
  // TODO: Patients in initial population during measurement period
  "Initial Population"

define "Numerator":
  // TODO: Patients with HbA1c test in measurement period
  "Denominator" and "Has HbA1c Test"

// 2. Quality measure: Diabetes HbA1c Testing  
define "Measurement Period":
  Interval[@2023-01-01, @2023-12-31]

define "Has HbA1c Test":
  // TODO: At least one HbA1c test during measurement period
  exists([Observation: "HbA1c"] O
    where FHIRHelpers.ToDateTime(O.effective) during "Measurement Period")

// 3. Exclusions and exceptions
define "Denominator Exclusions":
  // TODO: Exclude patients with end-stage renal disease
  exists([Condition: "End Stage Renal Disease"] C
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active")

define "Denominator Exceptions":
  // TODO: Medical reasons preventing HbA1c testing
  exists([Procedure: "Dialysis"] P
    where FHIRHelpers.ToDateTime(P.performed) during "Measurement Period")

// 4. Stratification
define "Well Controlled Diabetes":
  // TODO: Patients with HbA1c < 7%
  exists([Observation: "HbA1c"] O
    where FHIRHelpers.ToDateTime(O.effective) during "Measurement Period"
      and FHIRHelpers.ToQuantity(O.value) < 7 '%')

// 5. Supplemental data elements
define "Patient Race":
  Patient.extension E
    where E.url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
    return E.extension.value

define "Patient Ethnicity":
  // TODO: Extract patient ethnicity from extensions

// 6. Measure calculation
define "Quality Score":
  // TODO: Calculate percentage: (Numerator / Denominator) * 100
  if "Denominator" > 0 then
    ("Numerator" * 100.0) / "Denominator"
  else
    null`,
        key: `library Exercises10 version '1.0.0'

using FHIR version '4.0.1'
include FHIRHelpers version '4.0.1' called FHIRHelpers

context Patient

codesystem "SNOMED": 'http://snomed.info/sct'
valueset "Diabetes": 'http://example.org/fhir/ValueSet/diabetes'
valueset "HbA1c": 'http://example.org/fhir/ValueSet/hba1c'
valueset "End Stage Renal Disease": 'http://example.org/fhir/ValueSet/esrd'
valueset "Dialysis": 'http://example.org/fhir/ValueSet/dialysis'

// Completed quality measures and reporting
define "Initial Population":
  AgeInYears() between 18 and 75
    and exists([Condition: "Diabetes"] C 
      where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active"
        and FHIRHelpers.ToDateTime(C.recordedDate) before end of "Measurement Period")

define "Measurement Period":
  Interval[@2023-01-01, @2023-12-31]

define "Denominator":
  "Initial Population" 
    and not "Denominator Exclusions"

define "Has HbA1c Test":
  exists([Observation: "HbA1c"] O
    where FHIRHelpers.ToDateTime(O.effective) during "Measurement Period"
      and O.status = 'final')

define "Numerator":
  "Denominator" 
    and "Has HbA1c Test" 
    and not "Denominator Exceptions"

define "Denominator Exclusions":
  exists([Condition: "End Stage Renal Disease"] C
    where FHIRHelpers.ToConcept(C.clinicalStatus) ~ "active"
      and FHIRHelpers.ToDateTime(C.recordedDate) before end of "Measurement Period")

define "Denominator Exceptions":
  exists([Procedure: "Dialysis"] P
    where FHIRHelpers.ToDateTime(P.performed) during "Measurement Period"
      and P.status = 'completed')
  or exists([AllergyIntolerance] A
    where A.code ~ "HbA1c Test Contraindication"
      and A.clinicalStatus = 'active')

define "Well Controlled Diabetes":
  exists([Observation: "HbA1c"] O
    let lastHbA1c: Last([Observation: "HbA1c"] H
      where FHIRHelpers.ToDateTime(H.effective) during "Measurement Period"
      sort by FHIRHelpers.ToDateTime(effective) desc)
    where FHIRHelpers.ToQuantity(lastHbA1c.value) < 7 '%')

define "Patient Race":
  Patient.extension E
    where E.url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
    return (E.extension Ex where Ex.url = 'text').value as String

define "Patient Ethnicity":
  Patient.extension E
    where E.url = 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
    return (E.extension Ex where Ex.url = 'text').value as String

define "Measure Report":
  Tuple {
    measureId: 'diabetes-hba1c-testing',
    period: "Measurement Period",
    initialPopulation: if "Initial Population" then 1 else 0,
    denominator: if "Denominator" then 1 else 0,
    numerator: if "Numerator" then 1 else 0,
    exclusions: if "Denominator Exclusions" then 1 else 0,
    exceptions: if "Denominator Exceptions" then 1 else 0,
    wellControlled: if "Well Controlled Diabetes" then 1 else 0
  }

define "Quality Score":
  let denom: if "Denominator" then 1 else 0,
      numer: if "Numerator" then 1 else 0
  return if denom > 0 then (numer * 100.0) / denom else null`
      }
    ],
    hints: [
      {
        trigger: "population",
        message: "Initial population defines the base cohort. Denominator applies additional criteria."
      },
      {
        trigger: "exclusion",
        message: "Exclusions remove patients from the denominator. Exceptions allow for valid reasons not to meet numerator."
      },
      {
        trigger: "extension",
        message: "Use Patient.extension to access FHIR extensions like race and ethnicity."
      }
    ],
    validation: {
      requiredElements: ['Initial Population', 'Numerator', 'Denominator Exclusions', 'Well Controlled Diabetes', 'Patient Ethnicity', 'Measure Report'],
      checkSyntax: true
    }
  }
];

// Exercise metadata and progression tracking
export const EXERCISE_MODULES = [
  {
    id: 1,
    title: 'CQL Fundamentals',
    description: 'Learn basic CQL syntax, data types, and operations',
    exercises: ['cqf-01-syntax-errors', 'cqf-02-data-types', 'cqf-03-comparisons']
  },
  {
    id: 2, 
    title: 'Collections and Data Structures',
    description: 'Master lists, intervals, and set operations',
    exercises: ['cqf-04-lists-intervals']
  },
  {
    id: 3,
    title: 'Healthcare Terminology',
    description: 'Work with code systems, value sets, and clinical concepts',
    exercises: ['cqf-05-terminology']
  },
  {
    id: 4,
    title: 'Functions and Libraries',
    description: 'Create reusable functions and work with CQL libraries',
    exercises: ['cqf-06-functions-libraries']
  },
  {
    id: 5,
    title: 'FHIR Integration',
    description: 'Access and query FHIR healthcare resources',
    exercises: ['cqf-07-fhir-queries']
  },
  {
    id: 6,
    title: 'Clinical Decision Support',
    description: 'Build clinical decision support rules and logic',
    exercises: ['cqf-08-clinical-logic']
  },
  {
    id: 7,
    title: 'Advanced CQL Techniques',
    description: 'Master advanced CQL features and optimization',
    exercises: ['cqf-09-advanced-features']
  },
  {
    id: 8,
    title: 'Quality Measures and Reporting',
    description: 'Implement healthcare quality measures and clinical reports',
    exercises: ['cqf-10-quality-measures']
  }
];

export default CQF_EXERCISES;