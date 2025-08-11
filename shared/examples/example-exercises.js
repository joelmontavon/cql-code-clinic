/**
 * Example Exercises
 * Examples demonstrating the exercise schema and various exercise types
 */

// Example 1: Beginner Tutorial Exercise
export const whitespaceTutorial = {
  id: "whitespace-comments",
  version: "1.0.0",
  title: "Whitespace and Comments",
  description: "Learn about CQL's handling of whitespace and comment syntax",
  difficulty: "beginner",
  estimatedTime: 10,
  prerequisites: [],
  concepts: ["syntax", "whitespace", "comments"],
  tags: ["beginner", "syntax", "fundamentals"],
  type: "tutorial",
  
  content: {
    instructions: `# Whitespace and Comments in CQL

## Whitespace
CQL defines tab, space, and return as whitespace, meaning they are only used to separate other tokens within the language. Any number of whitespace characters can appear, and the language does not use whitespace for anything other than delimiting tokens.

## Comments
CQL defines two styles of comments: single-line and multi-line.

### Single-line Comments
A single-line comment consists of two forward slashes, followed by any text up to the end of the line:

\`\`\`cql
define "Foo": 1 + 1 // This is a single-line comment
\`\`\`

### Multi-line Comments
To begin a multi-line comment, use the forward slash-asterisk token. The comment is closed with an asterisk-forward slash:

\`\`\`cql
/*
This is a multi-line comment
Any text enclosed within is ignored
*/
\`\`\`

## Your Task
For this exercise, try to comment out the line in the code editor using either single-line or multi-line comment syntax.`,
    
    background: "Comments are essential for documenting CQL code and making it readable for other developers. They're ignored by the CQL engine during execution.",
    
    hints: [
      {
        level: 1,
        text: "Look at the code in the editor. How can you make the CQL engine ignore it?"
      },
      {
        level: 2,
        text: "Try adding '//' at the beginning of the line for a single-line comment."
      },
      {
        level: 3,
        text: "Alternatively, you can wrap the text with '/*' and '*/' for a multi-line comment."
      },
      {
        level: 4,
        text: "Either `// This is a comment` or `/* This is a comment */` will work."
      },
      {
        level: 5,
        text: "Complete solution: `// This is a comment` or `/* This is a comment */`"
      }
    ],
    
    resources: [
      {
        title: "CQL Language Specification - Comments",
        url: "https://cql.hl7.org/02-authorsguide.html#comments",
        type: "documentation"
      }
    ]
  },
  
  files: [
    {
      name: "exercise.cql",
      template: "This is a comment",
      solution: "// This is a comment",
      readonly: false,
      language: "cql"
    }
  ],
  
  validation: {
    strategy: "pattern-match",
    patterns: [
      {
        pattern: "\\/\\/.*|/\\*[\\s\\S]*?\\*/",
        description: "Code should be commented using either single-line (//) or multi-line (/* */) comment syntax",
        required: true,
        points: 100
      }
    ],
    passingScore: 100
  },
  
  feedback: {
    success: "Excellent! You've successfully commented the code. Comments are crucial for documenting your CQL logic.",
    failure: "The code doesn't appear to be commented. Try adding '//' at the beginning or wrapping with '/* */'.",
    commonErrors: [
      {
        pattern: "^This is a comment$",
        explanation: "The text needs to be commented out so the CQL engine will ignore it.",
        suggestion: "Add '//' at the beginning of the line or wrap with '/* */'.",
        example: "// This is a comment"
      }
    ]
  },
  
  metadata: {
    author: "CQL Code Clinic",
    created: "2024-01-01T00:00:00Z",
    modified: "2024-01-01T00:00:00Z",
    source: "CQL Code Clinic Original",
    reviewStatus: "approved",
    qualityScore: 95
  }
};

// Example 2: Intermediate Practice Exercise
export const operatorsPractice = {
  id: "cql-operators-practice",
  version: "1.2.0", 
  title: "CQL Operators Practice",
  description: "Practice using various CQL operators and fix syntax errors",
  difficulty: "intermediate",
  estimatedTime: 20,
  prerequisites: ["whitespace-comments"],
  concepts: ["operators", "expressions", "syntax", "comparisons"],
  tags: ["operators", "practice", "debugging"],
  type: "debug",
  
  content: {
    instructions: `# CQL Operators Practice

Fix the syntax errors in the provided CQL code. The code contains several common operator mistakes.

## CQL Operators Reference

| Category | Operators |
|----------|-----------|
| Arithmetic | + - * / div mod ^ |
| Comparison | < <= > >= |
| Equality | = != |
| Logical | and or xor not |
| String | & (concatenation) |

## Common Issues to Watch For:
1. Inequality operator is \`!=\`, not \`<>\`
2. Comparison operators cannot have spaces
3. Quantity units must be quoted strings
4. Cannot mix data types without conversion

Your task is to fix all the syntax errors in the code editor.`,
    
    hints: [
      {
        level: 1,
        text: "Look for operators that might be using incorrect syntax."
      },
      {
        level: 2,
        text: "Check the inequality operator - CQL uses != not <>"
      },
      {
        level: 3,
        text: "Look at the comparison operators - they shouldn't have spaces"
      },
      {
        level: 4,
        text: "Units in quantities need to be string literals (quoted)"
      }
    ]
  },
  
  files: [
    {
      name: "operators.cql",
      template: `define "Inequality Expression":
  4 <> 5

define "Relative Comparison Expression":
  4 < = 5

define "Quantity Expression":
  5 g/dL

define "String Concatenation":
  1 + 'John'`,
      solution: `define "Inequality Expression":
  4 != 5

define "Relative Comparison Expression":
  4 <= 5

define "Quantity Expression":
  5 'g/dL'

define "String Concatenation":
  ToString(1) + 'John'`,
      readonly: false,
      language: "cql"
    }
  ],
  
  validation: {
    strategy: "pattern-match",
    patterns: [
      {
        pattern: "4\\s*!=\\s*5",
        description: "Inequality expression should use != operator",
        required: true,
        points: 25
      },
      {
        pattern: "4\\s*<=\\s*5", 
        description: "Comparison operator should not have spaces",
        required: true,
        points: 25
      },
      {
        pattern: "5\\s*'g/dL'",
        description: "Quantity units should be quoted",
        required: true,
        points: 25
      },
      {
        pattern: "ToString\\(1\\)\\s*\\+\\s*'John'|'1'\\s*\\+\\s*'John'",
        description: "Cannot concatenate number and string without conversion",
        required: true,
        points: 25
      }
    ],
    passingScore: 75
  },
  
  feedback: {
    success: "Great work! You've fixed all the operator syntax errors. Understanding these common mistakes will help you write better CQL code.",
    partial: "You're making progress! You've fixed some issues, but there are still a few operator errors to resolve.",
    failure: "The code still contains syntax errors. Review the operator reference and check each expression carefully.",
    commonErrors: [
      {
        pattern: "<>",
        explanation: "CQL uses != for inequality, not <>",
        suggestion: "Replace <> with !=",
        example: "4 != 5"
      },
      {
        pattern: "< =|> =",
        explanation: "Comparison operators cannot have spaces between them",
        suggestion: "Remove the space between < and = or > and =",
        example: "4 <= 5"
      },
      {
        pattern: "\\d+\\s+[a-zA-Z]+/[a-zA-Z]+",
        explanation: "Quantity units must be string literals (quoted)",
        suggestion: "Put quotes around the unit",
        example: "5 'g/dL'"
      }
    ]
  }
};

// Example 3: Advanced Challenge Exercise
export const advancedChallenge = {
  id: "clinical-logic-challenge",
  version: "1.0.0",
  title: "Clinical Logic Challenge",
  description: "Build a complex CQL expression for clinical decision support",
  difficulty: "advanced",
  estimatedTime: 45,
  prerequisites: ["cql-operators-practice", "functions-basics", "clinical-data-access"],
  concepts: ["clinical-data", "logic", "functions", "queries", "best-practices"],
  tags: ["advanced", "clinical", "challenge", "decision-support"],
  type: "challenge",
  
  content: {
    instructions: `# Clinical Logic Challenge

Create a CQL expression that identifies patients with uncontrolled diabetes based on the following criteria:

## Clinical Requirements:
1. Patient has a diabetes diagnosis (ICD-10: E11.9)
2. Most recent HbA1c value is > 7.0% within the last 6 months
3. Patient is between 18 and 75 years old
4. No documented hypoglycemia episodes in the last 3 months

## Implementation Guidelines:
- Use appropriate CQL functions and operators
- Handle missing or null values appropriately  
- Include comments explaining your logic
- Consider performance implications

This is a challenging exercise that combines multiple CQL concepts. Take your time and think through the logic step by step.`,
    
    hints: [
      {
        level: 1,
        text: "Start by defining the age range using patient birthdate"
      },
      {
        level: 2,
        text: "Use the Exists() function to check for diagnosis codes"
      },
      {
        level: 3,
        text: "For the most recent HbA1c, use Last() with proper sorting"
      },
      {
        level: 4,
        text: "Use date arithmetic to check time ranges (e.g., 'Today() - 6 months')"
      }
    ]
  },
  
  files: [
    {
      name: "challenge.cql",
      template: `library UncontrolledDiabetes version '1.0.0'

using FHIR version '4.0.1'

// Define your logic here
define "Uncontrolled Diabetes Patients":
  // Your implementation goes here
  null`,
      solution: `library UncontrolledDiabetes version '1.0.0'

using FHIR version '4.0.1'

// Patients with uncontrolled diabetes
define "Uncontrolled Diabetes Patients":
  "Has Diabetes Diagnosis" 
    and "Age Between 18 and 75"
    and "Recent High HbA1c"
    and not "Recent Hypoglycemia"

// Check for diabetes diagnosis
define "Has Diabetes Diagnosis":
  exists([Condition: "Diabetes ICD10"] C
    where C.clinicalStatus ~ "active")

// Age criteria
define "Age Between 18 and 75":
  AgeInYears() between 18 and 75

// Recent HbA1c > 7.0%
define "Recent High HbA1c":
  "Most Recent HbA1c" > 7.0 '%'

define "Most Recent HbA1c":
  Last([Observation: "HbA1c"] O
    where O.effective during "Last 6 Months"
    sort by effective.value).value

// Check for recent hypoglycemia
define "Recent Hypoglycemia":
  exists([Condition: "Hypoglycemia"] H
    where H.onset during "Last 3 Months")

// Date ranges
define "Last 6 Months":
  Interval[Today() - 6 months, Today()]

define "Last 3 Months":  
  Interval[Today() - 3 months, Today()]`,
      readonly: false,
      language: "cql"
    }
  ],
  
  validation: {
    strategy: "semantic-match",
    patterns: [
      {
        pattern: "exists\\(.*Condition.*Diabetes",
        description: "Should check for diabetes diagnosis using exists()",
        required: true,
        points: 20
      },
      {
        pattern: "AgeInYears\\(\\).*between.*18.*75|Age.*18.*75",
        description: "Should check age between 18 and 75",
        required: true, 
        points: 20
      },
      {
        pattern: "Last\\(.*HbA1c|Most Recent.*HbA1c",
        description: "Should get most recent HbA1c value",
        required: true,
        points: 25
      },
      {
        pattern: ">\\s*7\\.0|greater than.*7",
        description: "Should check if HbA1c > 7.0",
        required: true,
        points: 15
      },
      {
        pattern: "not.*Hypoglycemia|not exists.*Hypoglycemia",
        description: "Should exclude patients with recent hypoglycemia",
        required: true,
        points: 20
      }
    ],
    passingScore: 80
  },
  
  feedback: {
    success: "Outstanding! You've created a comprehensive clinical logic expression that properly handles all the requirements.",
    partial: "Good progress! You're addressing most of the clinical requirements, but consider reviewing the missing criteria.",
    failure: "This is a challenging exercise. Break it down into smaller pieces and tackle each requirement one at a time.",
    commonErrors: [
      {
        pattern: "Patient.*diabetes",
        explanation: "Remember to use proper CQL syntax for checking conditions",
        suggestion: "Use exists([Condition: 'Diabetes ICD10']) pattern"
      }
    ]
  }
};

// Example 4: Assessment Exercise
export const assessmentExample = {
  id: "cql-fundamentals-assessment",
  version: "1.0.0",
  title: "CQL Fundamentals Assessment",
  description: "Comprehensive assessment of basic CQL concepts and syntax",
  difficulty: "intermediate",
  estimatedTime: 30,
  prerequisites: ["whitespace-comments", "cql-operators-practice"],
  concepts: ["syntax", "operators", "functions", "expressions"],
  tags: ["assessment", "comprehensive", "fundamentals"],
  type: "assessment",
  
  content: {
    instructions: `# CQL Fundamentals Assessment

This assessment covers the fundamental concepts you've learned in CQL. Complete all sections to demonstrate your understanding.

## Section 1: Basic Syntax (25 points)
Write a proper CQL library header with version.

## Section 2: Expressions (25 points) 
Create define statements for basic calculations.

## Section 3: Operators (25 points)
Use various CQL operators correctly.

## Section 4: Comments (25 points)
Add appropriate comments to document your code.

**Time limit: 30 minutes**
**Passing score: 70%**`,
    
    hints: [
      {
        level: 1,
        text: "Remember that all CQL libraries start with a library statement"
      },
      {
        level: 2,
        text: "Each define statement should have a name and a colon"
      },
      {
        level: 3,
        text: "Use appropriate operators for each calculation type"
      }
    ]
  },
  
  files: [
    {
      name: "assessment.cql",
      template: `// Complete this CQL assessment
// Add your library header here

// Section 1: Define a simple calculation

// Section 2: Use comparison operators

// Section 3: Create a logical expression

// Section 4: Add meaningful comments`,
      solution: `// CQL Fundamentals Assessment Solution
library Assessment version '1.0.0'

// Section 1: Simple calculation
define "Simple Addition": 5 + 3

// Section 2: Comparison operators  
define "Number Comparison": 10 > 5
define "Equality Check": 'hello' = 'hello'

// Section 3: Logical expression
define "Logical Expression": true and (false or true)

// Section 4: This code demonstrates basic CQL concepts
define "Final Score": 100`,
      readonly: false,
      language: "cql"
    }
  ],
  
  validation: {
    strategy: "pattern-match",
    patterns: [
      {
        pattern: "library\\s+\\w+\\s+version\\s+['\"]\\d+\\.\\d+\\.\\d+['\"]",
        description: "Must include proper library header with version",
        required: true,
        points: 25
      },
      {
        pattern: "define\\s+['\"]\\w+['\"]\\s*:",
        description: "Must include define statements",
        required: true,
        points: 25
      },
      {
        pattern: "[<>=!]+|and|or|not",
        description: "Must use CQL operators",
        required: true,
        points: 25
      },
      {
        pattern: "//.*|/\\*[\\s\\S]*?\\*/",
        description: "Must include comments",
        required: true,
        points: 25
      }
    ],
    timeLimit: 30,
    passingScore: 70
  },
  
  feedback: {
    success: "Congratulations! You've passed the CQL Fundamentals Assessment. You have a solid understanding of basic CQL concepts.",
    partial: "You've demonstrated understanding of some concepts, but need to review others. Keep practicing!",
    failure: "Don't worry - assessments are challenging. Review the fundamental concepts and try again when you're ready."
  }
};

export const exampleExercises = [
  whitespaceTutorial,
  operatorsPractice, 
  advancedChallenge,
  assessmentExample
];

export default exampleExercises;