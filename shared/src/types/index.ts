// Core exercise types - shared between frontend and backend
export interface Exercise {
  id: string;
  version: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime: number; // minutes
  prerequisites: string[];
  concepts: string[];
  tags: string[];
  type: 'tutorial' | 'practice' | 'challenge' | 'debug' | 'build';
  content: ExerciseContent;
  files: ExerciseFile[];
  validation: ExerciseValidation;
  feedback: ExerciseFeedback;
}

export interface ExerciseContent {
  instructions: string; // markdown
  background?: string; // markdown
  hints?: string[];
  resources?: ResourceLink[];
}

export interface ExerciseFile {
  name: string;
  template: string;
  solution: string;
  readonly?: boolean;
}

export interface ExerciseValidation {
  customValidator?: string; // javascript function
  testCases?: TestCase[];
  allowedErrors?: string[];
  timeLimit?: number; // seconds
}

export interface ExerciseFeedback {
  success: string;
  hints?: HintCondition[];
  commonErrors?: ErrorPattern[];
}

export interface TestCase {
  input: unknown;
  expected: unknown;
}

export interface HintCondition {
  condition: string;
  message: string;
}

export interface ErrorPattern {
  pattern: string; // regex
  explanation: string;
}

export interface ResourceLink {
  title: string;
  url: string;
}

// CQL execution types
export interface CQLExecutionResult {
  detail: Record<string, unknown>;
  log: string;
  status: 'success' | 'error' | 'timeout';
  code: string;
  executionTime?: number;
  errors?: CQLError[];
}

export interface CQLError {
  id: string;
  category: 'syntax' | 'semantic' | 'runtime' | 'system';
  message: string;
  location?: {
    line: number;
    column: number;
    length?: number;
  };
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}