/**
 * Exercise Migration Demo
 * Demonstrates the migration of existing exercises to new schema format
 */

import { performBatchMigration } from '../../../shared/utils/exercise-migration.js';
import { validateExerciseBatch } from '../../../shared/utils/exercise-validator.js';

// Import current exercise data from store
const legacyExercises = [
  {
    name: 'Exercise 1',
    description: 'Whitespace and comments',
    content: [`<h3>Whitespace</h3>
<p>CQL defines tab, space, and return as whitespace, meaning they are only used to separate other tokens within the language. Any number of whitespace characters can appear, and the language does not use whitespace for anything other than delimiting tokens.</p>
<h3>Comments</h3>
<p>CQL defines two styles of comments, single-line, and multi-line. A single-line comment consists of two forward slashes, followed by any text up to the end of the line:</p>
<pre><code>define "Foo": 1 + 1 // This is a single-line comment</code></pre>
<p>To begin a multi-line comment, the typical forward slash-asterisk token is used. The comment is closed with an asterisk-forward slash, and everything enclosed is ignored:</p>
<pre><code>/*
This is a multi-line comment
Any text enclosed within is ignored
*/</code></pre>
<p>For the exercise, try to comment out the line in the code editor.</p>`],
    tabs: [{
      name: 'test.cql',
      template: 'This is a comment',
      key: '// This is a comment',
      eval: function (answers, key) {
        return answers.code.search(new RegExp(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm)) > -1 && answers.status == 'success';
      }
    }]
  },
  {
    name: 'Exercise 2',
    description: 'Operators',
    content: [`<h3>Operators</h3>
<p>The following table lists some of operator in CQL:</p>
<table>
<tbody>
<tr><th>Category</th><th>Operators</th></trs>
<tr><td>Exponentiation</td><td>^</td></tr>
<tr><td>Multiplicative</td><td>* / div mod</td></tr>
<tr><td>Additive</td><td>+ - &</td></tr>
<tr><td>Conditional</td><td>if..then..else</td></tr>
<tr><td></td><td>case..else..end</td></tr>
<tr><td>Comparison</td><td><= < > >=</td></tr>
<tr><td>Equality</td><td>= != ~ !~</td></tr>
<tr><td>Membership</td><td>in contains</td></tr>
<tr><td>Conjunction</td><td>and</td></tr>
<tr><td>Disjunction</td><td>or xor</td></tr>
</tbody>
</table>
<p>For the exercise, please fix the errors in the code editor.</p>`],
    tabs: [{
      name: 'test.cql',
      template: `define "Inequality Expression"
  4 <> 5

define "Relative Comparison Expression":
  4 < = 5

define "Quantity Expression":
  5 g/dL

define "String Concatenation":
  1 + 'John'`,
      key: `define "Inequality Expression": // 7) Missing a colon after the define
  4 != 5 // 8) Inequality symbol is !=, not <>

define "Relative Comparison Expression":
  4 <= 5 // 9) No space between <= operator

define "Quantity Expression":
  5 'g/dL' // 10) Units of a quantity are specified with a string

define "String Concatenation":
  '1' + 'JohnF' // Can't add strings and integers`
    }]
  },
  {
    name: 'Exercise 3',
    description: 'Case-Sensitivity',
    content: [`<h3>Case-Sensitivity</h3>
<p>To encourage consistency and reduce potential confusion, CQL is a case-sensitive language. This means that case is considered when matching keywords and identifiers in the language.</p>
<p>For the exercise, please fix the errors in the code editor.</p>`],
    tabs: [{
      name: 'test.cql',
      template: `Define "Quantity Expression":
  5 'g/dL'

define "Reference Expression":
  "quantity expression"`,
      key: `define "Quantity Expression": // Identifiers are case-sensitive
  5 'g/dL'

define "Reference Expression":
  "Quantity Expression" // Identifiers are case-sensitive`
    }]
  }
];

/**
 * Performs migration demo and logs results
 */
export async function runMigrationDemo() {
  console.log('=== CQL Exercise Migration Demo ===\n');
  
  console.log('Original exercises:', legacyExercises.length);
  legacyExercises.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.name}: ${ex.description}`);
  });
  
  console.log('\n--- Starting Migration ---');
  
  // Perform migration
  const migrationResult = performBatchMigration(legacyExercises);
  
  console.log('\n--- Migration Results ---');
  console.log('Summary:', migrationResult.summary);
  
  console.log('\n--- Validation Results ---');
  migrationResult.results.forEach((result, index) => {
    console.log(`\nExercise ${index + 1}: ${result.exercise.title}`);
    console.log(`  Valid: ${result.valid}`);
    console.log(`  Quality Score: ${result.qualityScore}`);
    
    if (!result.valid) {
      console.log('  Validation Errors:');
      result.validation.errors.forEach(error => {
        console.log(`    - ${error.path}: ${error.message}`);
      });
    }
    
    if (result.quality.warnings.length > 0) {
      console.log('  Quality Warnings:');
      result.quality.warnings.forEach(warning => {
        console.log(`    - ${warning}`);
      });
    }
    
    if (result.quality.suggestions.length > 0) {
      console.log('  Suggestions:');
      result.quality.suggestions.slice(0, 3).forEach(suggestion => {
        console.log(`    - ${suggestion}`);
      });
    }
  });
  
  console.log('\n--- Recommendations ---');
  migrationResult.recommendations.forEach(rec => {
    console.log(`  [${rec.priority.toUpperCase()}] ${rec.message}`);
    console.log(`    Action: ${rec.action}`);
  });
  
  // Show sample migrated exercise
  if (migrationResult.exercises.length > 0) {
    console.log('\n--- Sample Migrated Exercise ---');
    const sample = migrationResult.exercises[0];
    console.log(`Title: ${sample.title}`);
    console.log(`ID: ${sample.id}`);
    console.log(`Difficulty: ${sample.difficulty}`);
    console.log(`Concepts: ${sample.concepts.join(', ')}`);
    console.log(`Type: ${sample.type}`);
    console.log(`Files: ${sample.files.length}`);
    console.log(`Validation Strategy: ${sample.validation.strategy}`);
    console.log(`Quality Score: ${migrationResult.results[0].qualityScore}`);
    
    // Show first few lines of instructions
    const instructions = sample.content.instructions.substring(0, 200);
    console.log(`Instructions Preview: ${instructions}...`);
  }
  
  return migrationResult;
}

/**
 * Creates a test migration for development
 */
export function createTestMigration() {
  const result = performBatchMigration(legacyExercises);
  
  console.log('Test migration completed:', {
    total: result.summary.total,
    valid: result.summary.valid,
    averageQuality: Math.round(result.summary.averageQuality),
    needsReview: result.summary.needsReview
  });
  
  return result.exercises;
}

// Export for use in other components
export { legacyExercises };
export default { runMigrationDemo, createTestMigration };