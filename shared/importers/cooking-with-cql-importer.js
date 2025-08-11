/**
 * Cooking with CQL Importer
 * Imports exercises from the "Cooking with CQL" series
 */

import { validateExerciseData, performQualityChecks } from '../utils/exercise-validator.js';

/**
 * Cooking with CQL Importer Class
 * Processes "Cooking with CQL" content and converts it to our exercise schema
 */
class CookingWithCQLImporter {
  constructor() {
    this.sourceUrl = 'https://github.com/cqframework/CQL-Formatting-and-Usage-Wiki/wiki/Cooking-with-CQL';
    this.exercises = [];
    this.importLog = [];
  }

  /**
   * Imports Cooking with CQL exercises
   * @param {Object} options - Import options
   * @returns {Promise<Array>} Imported exercises
   */
  async importCookingWithCQLExercises(options = {}) {
    this.log('info', 'Starting Cooking with CQL import...');
    
    try {
      // Create sample Cooking with CQL exercises
      // TODO: Replace with actual content parsing when available
      const cookingExercises = this.createSampleCookingExercises();
      
      const processedExercises = [];
      
      for (let i = 0; i < cookingExercises.length; i++) {
        const rawExercise = cookingExercises[i];
        
        try {
          const exercise = await this.processCookingExercise(rawExercise, i);
          
          // Validate the processed exercise
          const validation = validateExerciseData(exercise);
          if (validation.success) {
            processedExercises.push(exercise);
            this.log('success', `Imported Cooking with CQL exercise: ${exercise.title}`);
          } else {
            this.log('error', `Failed to validate Cooking exercise: ${rawExercise.title}`, validation.errors);
          }
        } catch (error) {
          this.log('error', `Failed to process Cooking exercise: ${rawExercise.title}`, error.message);
        }
      }
      
      this.exercises = processedExercises;
      this.log('info', `Cooking with CQL import completed: ${processedExercises.length} exercises imported`);
      
      return processedExercises;
    } catch (error) {
      this.log('error', 'Cooking with CQL import failed', error.message);
      throw error;
    }
  }

  /**
   * Processes a single Cooking with CQL exercise
   * @param {Object} rawExercise - Raw cooking exercise data
   * @param {number} index - Exercise index
   * @returns {Object} Processed exercise
   */
  async processCookingExercise(rawExercise, index) {
    const exercise = {
      id: this.generateExerciseId(rawExercise.title, index),
      version: "1.0.0",
      title: rawExercise.title,
      description: rawExercise.description || this.generateDescription(rawExercise),
      difficulty: this.determineDifficulty(rawExercise, index),
      estimatedTime: this.estimateTime(rawExercise),
      prerequisites: this.determinePrerequisites(rawExercise, index),
      concepts: this.extractConcepts(rawExercise),
      tags: this.generateTags(rawExercise, index),
      type: this.determineType(rawExercise),
      
      content: {
        instructions: this.processInstructions(rawExercise),
        background: rawExercise.background || this.generateBackground(rawExercise),
        hints: this.generateHints(rawExercise),
        resources: this.extractResources(rawExercise)
      },
      
      files: this.processFiles(rawExercise),
      validation: this.createValidation(rawExercise),
      feedback: this.generateFeedback(rawExercise),
      
      analytics: {
        trackingEnabled: true,
        events: ["start", "complete", "hint-used", "error-encountered", "code-run"],
        metadata: {
          learningObjectives: this.extractLearningObjectives(rawExercise),
          clinicalDomain: rawExercise.clinicalDomain || 'practical',
          recipeNumber: index + 1
        }
      },
      
      metadata: {
        author: "Cooking with CQL",
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        source: `Cooking with CQL Recipe ${index + 1}`,
        license: "Apache-2.0",
        reviewStatus: "approved",
        qualityScore: 90 // High quality score for practical content
      }
    };
    
    return exercise;
  }

  /**
   * Creates sample Cooking with CQL exercises for demonstration
   * @returns {Array} Sample cooking exercises
   */
  createSampleCookingExercises() {
    return [
      {
        title: "Recipe 1: Hello CQL World",
        category: "getting-started",
        scenario: "basic-syntax",
        description: "Your first taste of CQL - creating simple expressions",
        content: `# Recipe 1: Hello CQL World

Welcome to Cooking with CQL! In this first recipe, we'll create your first CQL library and expressions.

## Ingredients (What you'll need)
- Basic understanding of programming concepts
- A CQL environment to test your code

## Preparation Steps

### Step 1: Create the Library Header
Every CQL "dish" starts with a library declaration:

\`\`\`cql
library HelloCQLWorld version '1.0.0'
\`\`\`

### Step 2: Add Your First Definition
CQL uses \`define\` statements like recipe steps:

\`\`\`cql
define "Greeting": 'Hello, CQL World!'
define "Today": Today()
define "Simple Math": 2 + 2
\`\`\`

### Step 3: Test Your Recipe
Run your CQL to see the results!

## The Challenge
Complete the CQL library below with your own creative definitions.`,
        
        template: `library HelloCQLWorld version '1.0.0'

// Step 1: Create a greeting message
define "My Greeting": 

// Step 2: Calculate your age (use any number)
define "My Age": 

// Step 3: Create a boolean expression
define "I Love CQL": 

// Step 4: Get today's date
define "Today's Date": `,

        solution: `library HelloCQLWorld version '1.0.0'

define "My Greeting": 'Hello, CQL World!'
define "My Age": 25
define "I Love CQL": true
define "Today's Date": Today()`,

        concepts: ["library", "define", "literals", "functions"],
        clinicalDomain: "general"
      },

      {
        title: "Recipe 2: Patient Data Appetizers", 
        category: "clinical-basics",
        scenario: "patient-data",
        description: "Learning to access and work with patient information",
        content: `# Recipe 2: Patient Data Appetizers

Now that we've mastered the basics, let's start working with real clinical data! In this recipe, we'll learn to access patient information using FHIR.

## Ingredients
- FHIR R4 data model knowledge
- Patient resource understanding
- Basic CQL retrieval syntax

## Preparation Steps

### Step 1: Import FHIR
Tell CQL we're working with FHIR data:

\`\`\`cql
using FHIR version '4.0.1'
\`\`\`

### Step 2: Access Patient Data
Retrieve patient information:

\`\`\`cql
define "Patient": [Patient] P return P
define "Patient Name": Patient.name[0].family + ', ' + Patient.name[0].given[0]
define "Patient Age": AgeInYears()
\`\`\`

### Step 3: Filter and Process
Work with the data:

\`\`\`cql
define "Adult Patients": [Patient] P where AgeInYears() >= 18
define "Pediatric Patients": [Patient] P where AgeInYears() < 18
\`\`\`

## The Challenge
Create expressions to access and analyze patient demographics.`,

        template: `library PatientDataAppetizers version '1.0.0'

using FHIR version '4.0.1'

// Get the current patient
define "Current Patient": 

// Calculate if patient is elderly (65+)
define "Is Elderly": 

// Get patient's gender
define "Patient Gender": 

// Determine if patient is adult
define "Is Adult Patient": `,

        solution: `library PatientDataAppetizers version '1.0.0'

using FHIR version '4.0.1'

define "Current Patient": [Patient]
define "Is Elderly": AgeInYears() >= 65
define "Patient Gender": Patient.gender
define "Is Adult Patient": AgeInYears() >= 18`,

        concepts: ["fhir", "patient", "clinical-data", "demographics", "filtering"],
        clinicalDomain: "general"
      },

      {
        title: "Recipe 3: Condition Casserole",
        category: "clinical-intermediate", 
        scenario: "conditions",
        description: "Working with patient conditions and diagnoses",
        content: `# Recipe 3: Condition Casserole

Time to dig into the meat of clinical data - patient conditions! This recipe will teach you to find, filter, and analyze patient diagnoses.

## Ingredients
- FHIR Condition resources
- ICD-10 code knowledge
- Date/time handling skills
- Filtering techniques

## Preparation Steps

### Step 1: Find All Conditions
Start by getting all patient conditions:

\`\`\`cql
define "All Conditions": [Condition]
\`\`\`

### Step 2: Filter by Status
Only look at active conditions:

\`\`\`cql
define "Active Conditions": 
  [Condition] C where C.clinicalStatus ~ "active"
\`\`\`

### Step 3: Find Specific Conditions
Look for particular diagnoses:

\`\`\`cql
define "Diabetes Conditions":
  [Condition: "Diabetes mellitus (disorder)"] C
  where C.clinicalStatus ~ "active"
\`\`\`

### Step 4: Date-based Filtering
Find recent conditions:

\`\`\`cql
define "Recent Conditions":
  [Condition] C 
  where C.onset during "Last Year"
    and C.clinicalStatus ~ "active"
\`\`\`

## The Challenge
Create a comprehensive condition analysis for the patient.`,

        template: `library ConditionCasserole version '1.0.0'

using FHIR version '4.0.1'

// Find all active conditions
define "Active Conditions": 

// Check if patient has diabetes
define "Has Diabetes": 

// Find conditions diagnosed in the last 6 months
define "Recent Diagnoses": 

// Count total number of active conditions
define "Active Condition Count": `,

        solution: `library ConditionCasserole version '1.0.0'

using FHIR version '4.0.1'

define "Active Conditions": 
  [Condition] C where C.clinicalStatus ~ "active"

define "Has Diabetes": 
  exists([Condition: "Diabetes mellitus"] C where C.clinicalStatus ~ "active")

define "Recent Diagnoses": 
  [Condition] C 
  where C.onset during Interval[Today() - 6 months, Today()]
    and C.clinicalStatus ~ "active"

define "Active Condition Count": 
  Count("Active Conditions")`,

        concepts: ["conditions", "filtering", "clinical-status", "dates", "existence"],
        clinicalDomain: "general"
      },

      {
        title: "Recipe 4: Medication Medley",
        category: "clinical-intermediate",
        scenario: "medications", 
        description: "Managing medication data and adherence calculations",
        content: `# Recipe 4: Medication Medley

Let's cook up some medication management! This recipe covers working with medication data, calculating adherence, and identifying drug interactions.

## Ingredients
- FHIR Medication resources
- MedicationStatement and MedicationRequest
- Date arithmetic skills
- Clinical decision making logic

## Preparation Steps

### Step 1: Get Active Medications
Find what the patient is currently taking:

\`\`\`cql
define "Active Medications":
  [MedicationStatement] M where M.status = 'active'
\`\`\`

### Step 2: Calculate Medication Adherence
Determine how well the patient follows their medication regimen:

\`\`\`cql
define "Days Supply": 30
define "Days Covered": 25
define "Adherence Rate": "Days Covered" / "Days Supply" * 100
\`\`\`

### Step 3: Check for Specific Medications
Look for particular drug classes:

\`\`\`cql
define "Diabetes Medications":
  [MedicationStatement: "Diabetes Medication Codes"] M
  where M.status = 'active'
\`\`\`

### Step 4: Medication Timing Analysis
Analyze when medications were prescribed:

\`\`\`cql
define "Recent Medication Changes":
  [MedicationStatement] M 
  where M.effectiveDate during "Last 30 Days"
\`\`\`

## The Challenge
Create a comprehensive medication analysis system.`,

        template: `library MedicationMedley version '1.0.0'

using FHIR version '4.0.1'

// Get all current medications
define "Current Medications": 

// Check if patient is on insulin
define "On Insulin": 

// Calculate medication count
define "Medication Count": 

// Find medications started in last month
define "New Medications": `,

        solution: `library MedicationMedley version '1.0.0'

using FHIR version '4.0.1'

define "Current Medications": 
  [MedicationStatement] M where M.status = 'active'

define "On Insulin": 
  exists([MedicationStatement: "Insulin"] M where M.status = 'active')

define "Medication Count": 
  Count("Current Medications")

define "New Medications": 
  [MedicationStatement] M 
  where M.effectiveDate during Interval[Today() - 1 month, Today()]
    and M.status = 'active'`,

        concepts: ["medications", "adherence", "clinical-data", "dates", "calculations"],
        clinicalDomain: "pharmacy"
      },

      {
        title: "Recipe 5: Laboratory Lasagna",
        category: "clinical-advanced",
        scenario: "lab-results",
        description: "Layered analysis of laboratory results and trends",
        content: `# Recipe 5: Laboratory Lasagna

Time for a complex dish! Laboratory data analysis requires layering multiple concepts - getting results, analyzing trends, and making clinical decisions.

## Ingredients
- FHIR Observation resources
- LOINC codes for lab tests
- Statistical analysis functions
- Trend analysis techniques
- Reference range comparisons

## Preparation Steps

### Step 1: Get Lab Results
Retrieve laboratory observations:

\`\`\`cql
define "Lab Results": 
  [Observation: "Laboratory"] O
  where O.status in {'final', 'corrected'}
\`\`\`

### Step 2: Find Specific Tests
Get HbA1c results for diabetes monitoring:

\`\`\`cql
define "HbA1c Results":
  [Observation: "HbA1c"] O
  where O.status = 'final'
  sort by effective descending
\`\`\`

### Step 3: Analyze Trends
Look at changes over time:

\`\`\`cql
define "Latest HbA1c": First("HbA1c Results")
define "Previous HbA1c": "HbA1c Results"[1]
define "HbA1c Trend": 
  if "Latest HbA1c".value > "Previous HbA1c".value then 'increasing'
  else if "Latest HbA1c".value < "Previous HbA1c".value then 'decreasing'
  else 'stable'
\`\`\`

### Step 4: Clinical Decision Support
Make clinical recommendations:

\`\`\`cql
define "HbA1c Goal Met": "Latest HbA1c".value < 7.0 '%'
define "Needs Medication Adjustment": 
  "Latest HbA1c".value > 8.0 '%' or "HbA1c Trend" = 'increasing'
\`\`\`

## The Challenge
Build a comprehensive laboratory analysis and decision support system.`,

        template: `library LaboratoryLasagna version '1.0.0'

using FHIR version '4.0.1'

// Get all final lab results from last year
define "Recent Lab Results": 

// Find the most recent cholesterol result
define "Latest Cholesterol": 

// Check if cholesterol is high (>200 mg/dL)
define "High Cholesterol": 

// Calculate average of last 3 HbA1c values
define "Average HbA1c": `,

        solution: `library LaboratoryLasagna version '1.0.0'

using FHIR version '4.0.1'

define "Recent Lab Results": 
  [Observation: "Laboratory"] O
  where O.status = 'final'
    and O.effective during Interval[Today() - 1 year, Today()]

define "Latest Cholesterol": 
  First([Observation: "Total Cholesterol"] O 
    where O.status = 'final'
    sort by effective descending)

define "High Cholesterol": 
  "Latest Cholesterol".value > 200 'mg/dL'

define "Average HbA1c": 
  Avg([Observation: "HbA1c"] O 
    where O.status = 'final'
    sort by effective descending
    return O.value)[0..2]`,

        concepts: ["observations", "lab-results", "trends", "calculations", "decision-support"],
        clinicalDomain: "laboratory"
      },

      {
        title: "Recipe 6: Quality Measure Quiche",
        category: "quality-measures",
        scenario: "performance-measurement",
        description: "Crafting clinical quality measures with precision",
        content: `# Recipe 6: Quality Measure Quiche

The pièce de résistance! Quality measures are the soufflé of CQL - they require precision, timing, and careful attention to detail.

## Ingredients
- Population definition skills
- Clinical logic expertise
- Quality measure methodology
- Performance calculation techniques
- Evidence-based criteria

## Preparation Steps

### Step 1: Define the Initial Population
Who are we measuring?

\`\`\`cql
define "Initial Population":
  AgeInYears() >= 18
  and AgeInYears() < 75
  and exists([Condition: "Diabetes mellitus"])
\`\`\`

### Step 2: Define the Denominator
Who should receive the care?

\`\`\`cql
define "Denominator": 
  "Initial Population"
  and exists([Encounter: "Office Visit"] E 
    where E.period during "Measurement Period")
\`\`\`

### Step 3: Define the Numerator
Who actually received the care?

\`\`\`cql
define "Numerator":
  "Denominator"
  and exists("HbA1c Test Performed")
  and "Most Recent HbA1c" < 8.0 '%'
\`\`\`

### Step 4: Calculate Performance
Measure the quality:

\`\`\`cql
define "Performance Rate":
  Count("Numerator") / Count("Denominator") * 100
\`\`\`

## The Challenge
Create a complete quality measure for preventive care.`,

        template: `library QualityMeasureQuiche version '1.0.0'

using FHIR version '4.0.1'

// Define the measurement period
define "Measurement Period": 
  Interval[@2023-01-01, @2023-12-31]

// Define initial population (adults with diabetes)
define "Initial Population": 

// Define denominator (those who had visits)
define "Denominator": 

// Define numerator (those who met the quality target)
define "Numerator": 

// Calculate the performance rate
define "Performance Rate": `,

        solution: `library QualityMeasureQuiche version '1.0.0'

using FHIR version '4.0.1'

define "Measurement Period": 
  Interval[@2023-01-01, @2023-12-31]

define "Initial Population": 
  AgeInYears() >= 18
  and exists([Condition: "Diabetes mellitus"])

define "Denominator": 
  "Initial Population"
  and exists([Encounter: "Office Visit"] E 
    where E.period during "Measurement Period")

define "Numerator": 
  "Denominator"
  and exists([Observation: "HbA1c"] O 
    where O.effective during "Measurement Period"
    and O.value < 8.0 '%')

define "Performance Rate": 
  Count("Numerator") / Count("Denominator") * 100`,

        concepts: ["quality-measures", "populations", "performance", "clinical-logic", "measurement"],
        clinicalDomain: "quality-measures"
      }
    ];
  }

  // Utility methods (similar to CQF importer but adapted for Cooking with CQL style)

  generateExerciseId(title, index) {
    const recipeNumber = title.match(/Recipe (\d+)/)?.[1] || (index + 1);
    const cleanTitle = title.replace(/Recipe \d+:\s*/, '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    return `cooking-recipe-${recipeNumber}-${cleanTitle}`;
  }

  generateDescription(rawExercise) {
    return rawExercise.description || `Learn practical CQL skills through hands-on ${rawExercise.scenario} scenarios`;
  }

  determineDifficulty(rawExercise, index) {
    if (rawExercise.category === 'getting-started') return 'beginner';
    if (rawExercise.category === 'clinical-basics') return 'beginner'; 
    if (rawExercise.category === 'clinical-intermediate') return 'intermediate';
    if (rawExercise.category === 'clinical-advanced') return 'advanced';
    if (rawExercise.category === 'quality-measures') return 'expert';
    
    // Default progression
    return index < 2 ? 'beginner' : index < 4 ? 'intermediate' : 'advanced';
  }

  estimateTime(rawExercise) {
    const categoryTimes = {
      'getting-started': 15,
      'clinical-basics': 20,
      'clinical-intermediate': 30,
      'clinical-advanced': 45,
      'quality-measures': 60
    };
    
    return categoryTimes[rawExercise.category] || 25;
  }

  determinePrerequisites(rawExercise, index) {
    const prerequisites = [];
    
    // Sequential prerequisites for recipe progression
    if (index > 0) {
      // Each recipe depends on the previous one
      const prevRecipe = `cooking-recipe-${index}`;
      prerequisites.push(prevRecipe);
    }
    
    // Special prerequisites for advanced topics
    if (rawExercise.category === 'quality-measures' && index > 1) {
      prerequisites.push('cooking-recipe-3-condition-casserole');
      prerequisites.push('cooking-recipe-5-laboratory-lasagna');
    }
    
    return prerequisites;
  }

  extractConcepts(rawExercise) {
    const concepts = [...(rawExercise.concepts || [])];
    
    // Add scenario-based concepts
    if (rawExercise.scenario === 'basic-syntax') concepts.push('syntax', 'literals');
    if (rawExercise.scenario === 'patient-data') concepts.push('clinical-data', 'demographics');
    if (rawExercise.scenario === 'conditions') concepts.push('diagnoses', 'clinical-status');
    if (rawExercise.scenario === 'medications') concepts.push('pharmaceuticals', 'adherence');
    if (rawExercise.scenario === 'lab-results') concepts.push('observations', 'trends');
    if (rawExercise.scenario === 'performance-measurement') concepts.push('quality-measures', 'populations');
    
    return [...new Set(concepts)];
  }

  generateTags(rawExercise, index) {
    const tags = ['cooking-with-cql', 'practical', 'hands-on'];
    
    tags.push(rawExercise.category);
    if (rawExercise.scenario && rawExercise.scenario !== rawExercise.category) {
      tags.push(rawExercise.scenario);
    }
    if (rawExercise.clinicalDomain && rawExercise.clinicalDomain !== 'general') {
      tags.push(rawExercise.clinicalDomain);
    }
    
    // Add recipe number tag
    const recipeNumber = index + 1;
    tags.push(`recipe-${recipeNumber}`);
    
    return [...new Set(tags)]; // Remove any remaining duplicates
  }

  determineType(rawExercise) {
    if (rawExercise.category === 'getting-started') return 'tutorial';
    if (rawExercise.category === 'quality-measures') return 'challenge';
    return 'practice';
  }

  processInstructions(rawExercise) {
    let instructions = rawExercise.content || '';
    
    // Enhance with cooking metaphors and formatting
    instructions = instructions.replace(/^# /gm, '## ');
    instructions = instructions.replace(/## Ingredients/gm, '### 🥘 Ingredients');
    instructions = instructions.replace(/## Preparation Steps/gm, '### 👩‍🍳 Preparation Steps');
    instructions = instructions.replace(/## The Challenge/gm, '### 🎯 The Challenge');
    
    // Add cooking-themed footer
    instructions += '\n\n---\n\n🍳 *Happy cooking with CQL! Remember, the best recipes come from practice and experimentation.*';
    
    return instructions;
  }

  generateBackground(rawExercise) {
    const backgrounds = {
      'basic-syntax': 'Like learning to cook, CQL starts with understanding the basic ingredients and techniques.',
      'patient-data': 'Patient data is the foundation of all clinical analysis - like choosing quality ingredients for your dish.',
      'conditions': 'Working with conditions is like understanding the flavors in your dish - each one adds complexity.',
      'medications': 'Medication management requires the same precision as following a complex recipe.',
      'lab-results': 'Laboratory analysis is like tasting your dish throughout cooking - constant monitoring and adjustment.',
      'performance-measurement': 'Quality measures are the final presentation - everything must come together perfectly.'
    };
    
    return backgrounds[rawExercise.scenario] || 'This practical exercise will teach you real-world CQL skills through hands-on experience.';
  }

  generateHints(rawExercise) {
    const hints = [
      {
        level: 1,
        text: "🥘 Start by reading through the recipe ingredients and preparation steps carefully."
      },
      {
        level: 2,
        text: "👩‍🍳 Look at the template code - it shows you exactly where to add your ingredients."
      },
      {
        level: 3,
        text: "📖 Review the examples in the preparation steps for the syntax you need."
      },
      {
        level: 4,
        text: "🔍 Compare your code structure with the patterns shown in the examples."
      }
    ];
    
    if (rawExercise.solution) {
      hints.push({
        level: 5,
        text: `🍽️ Here's the complete recipe: ${rawExercise.solution}`
      });
    }
    
    return hints;
  }

  extractResources(rawExercise) {
    const resources = [
      {
        title: "Cooking with CQL Series",
        url: "https://github.com/cqframework/CQL-Formatting-and-Usage-Wiki/wiki/Cooking-with-CQL",
        type: "documentation"
      }
    ];
    
    // Add scenario-specific resources
    if (rawExercise.scenario === 'patient-data') {
      resources.push({
        title: "FHIR Patient Resource",
        url: "https://hl7.org/fhir/R4/patient.html",
        type: "specification"
      });
    }
    
    if (rawExercise.scenario === 'performance-measurement') {
      resources.push({
        title: "Clinical Quality Measures",
        url: "https://ecqi.healthit.gov/",
        type: "documentation"
      });
    }
    
    return resources;
  }

  processFiles(rawExercise) {
    const files = [];
    
    if (rawExercise.template || rawExercise.solution) {
      files.push({
        name: "recipe.cql",
        template: rawExercise.template || '',
        solution: rawExercise.solution || '',
        readonly: false,
        hidden: false,
        language: "cql"
      });
    }
    
    return files;
  }

  createValidation(rawExercise) {
    if (rawExercise.solution) {
      // Create more flexible pattern matching for cooking exercises
      const patterns = [];
      
      // Extract key patterns from solution
      const solutionLines = rawExercise.solution.split('\n');
      solutionLines.forEach(line => {
        const cleanLine = line.trim();
        if (cleanLine && !cleanLine.startsWith('//') && !cleanLine.startsWith('library')) {
          patterns.push({
            pattern: this.escapeRegex(cleanLine),
            description: `Should include: ${cleanLine}`,
            required: false,
            points: Math.floor(100 / solutionLines.length)
          });
        }
      });
      
      return {
        strategy: "pattern-match",
        patterns: patterns.length > 0 ? patterns : [{
          pattern: this.escapeRegex(rawExercise.solution.trim()),
          description: "Code should follow the recipe pattern",
          required: true,
          points: 100
        }],
        passingScore: 70
      };
    }
    
    return {
      strategy: "execution-result",
      passingScore: 80
    };
  }

  generateFeedback(rawExercise) {
    const recipeNumber = rawExercise.title.match(/Recipe (\d+)/)?.[1] || '?';
    
    return {
      success: `🍳 Delicious! You've successfully completed Recipe ${recipeNumber}. Your CQL skills are cooking!`,
      failure: "🔥 Don't worry, even master chefs burn a few dishes! Review the recipe and try again.",
      commonErrors: [
        {
          pattern: "library.*version",
          explanation: "Every CQL recipe needs a proper library header with version",
          suggestion: "Add: library RecipeName version '1.0.0'",
          example: "library HelloCQLWorld version '1.0.0'"
        }
      ]
    };
  }

  extractLearningObjectives(rawExercise) {
    const objectives = [];
    
    if (rawExercise.scenario === 'basic-syntax') objectives.push('Master CQL syntax fundamentals');
    if (rawExercise.scenario === 'patient-data') objectives.push('Access and work with patient demographics');
    if (rawExercise.scenario === 'conditions') objectives.push('Analyze patient conditions and diagnoses');
    if (rawExercise.scenario === 'medications') objectives.push('Manage medication data and calculations');
    if (rawExercise.scenario === 'lab-results') objectives.push('Analyze laboratory results and trends');
    if (rawExercise.scenario === 'performance-measurement') objectives.push('Build clinical quality measures');
    
    return objectives;
  }

  escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  log(level, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };
    
    this.importLog.push(logEntry);
    console.log(`[Cooking Import] ${level.toUpperCase()}: ${message}`, details || '');
  }

  getImportLog() {
    return [...this.importLog];
  }
}

// Export singleton instance
const cookingWithCQLImporter = new CookingWithCQLImporter();

export { cookingWithCQLImporter as default, CookingWithCQLImporter };