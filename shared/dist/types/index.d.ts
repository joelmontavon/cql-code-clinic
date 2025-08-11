export interface Exercise {
    id: string;
    version: string;
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    estimatedTime: number;
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
    instructions: string;
    background?: string;
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
    customValidator?: string;
    testCases?: TestCase[];
    allowedErrors?: string[];
    timeLimit?: number;
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
    pattern: string;
    explanation: string;
}
export interface ResourceLink {
    title: string;
    url: string;
}
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
//# sourceMappingURL=index.d.ts.map