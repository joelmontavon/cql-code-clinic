-- Add hint system tables

-- User hint profiles and preferences
CREATE TABLE user_hint_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_hint_style VARCHAR(20) DEFAULT 'balanced' CHECK (preferred_hint_style IN ('gentle', 'balanced', 'direct')),
    max_hint_level INTEGER DEFAULT 5 CHECK (max_hint_level BETWEEN 1 AND 5),
    auto_suggest_enabled BOOLEAN DEFAULT true,
    total_hints_used INTEGER DEFAULT 0,
    average_hint_level DECIMAL(3,2) DEFAULT 2.5,
    successful_hints INTEGER DEFAULT 0,
    last_hint_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id)
);

-- Individual hint usage tracking
CREATE TABLE hint_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    hint_level INTEGER NOT NULL CHECK (hint_level BETWEEN 1 AND 5),
    hint_type VARCHAR(50) NOT NULL,
    time_to_reveal INTEGER, -- seconds from exercise start
    code_at_time TEXT,
    was_helpful BOOLEAN,
    lead_to_solution BOOLEAN DEFAULT false,
    context_relevance DECIMAL(3,2), -- 0.0 to 1.0
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_hint_usage_user_exercise (user_id, exercise_id),
    INDEX idx_hint_usage_timestamp (timestamp),
    INDEX idx_hint_usage_type (hint_type)
);

-- Hint analytics aggregation
CREATE TABLE hint_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    hint_level INTEGER NOT NULL,
    hint_type VARCHAR(50) NOT NULL,
    effectiveness DECIMAL(3,2), -- 0.0 to 1.0
    session_id UUID, -- to group hints from same session
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_analytics_user_exercise (user_id, exercise_id),
    INDEX idx_analytics_effectiveness (effectiveness),
    INDEX idx_analytics_timestamp (timestamp)
);

-- Hint effectiveness by exercise (for optimization)
CREATE TABLE hint_effectiveness_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    hint_level INTEGER NOT NULL,
    hint_type VARCHAR(50) NOT NULL,
    total_usage INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    average_time_to_use INTEGER, -- average seconds before hint used
    effectiveness_score DECIMAL(3,2), -- success_count / total_usage
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(exercise_id, hint_level, hint_type),
    INDEX idx_effectiveness_exercise (exercise_id),
    INDEX idx_effectiveness_score (effectiveness_score)
);

-- Contextual hint suggestions (generated dynamically)
CREATE TABLE contextual_hints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    trigger_condition TEXT NOT NULL, -- JSON describing when to show hint
    hint_content TEXT NOT NULL,
    hint_type VARCHAR(50) NOT NULL,
    priority DECIMAL(3,2) DEFAULT 0.5,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_contextual_exercise (exercise_id),
    INDEX idx_contextual_priority (priority DESC),
    INDEX idx_contextual_active (is_active)
);

-- Update triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_hint_profiles_updated_at 
    BEFORE UPDATE ON user_hint_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_contextual_hints_updated_at 
    BEFORE UPDATE ON contextual_hints 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Insert default contextual hints for common scenarios
INSERT INTO contextual_hints (exercise_id, trigger_condition, hint_content, hint_type, priority) VALUES
    (NULL, '{"error_contains": "syntax", "time_spent_gt": 60}', 'Check your CQL syntax - look for missing colons, quotes, or parentheses', 'syntax', 0.9),
    (NULL, '{"error_contains": "library", "code_missing": "library"}', 'CQL files must start with a library declaration: library MyLibrary version ''1.0.0''', 'structure', 0.95),
    (NULL, '{"time_spent_gt": 300, "completion_lt": 0.2}', 'Break the problem down into smaller steps. Start with the basic structure.', 'guidance', 0.7),
    (NULL, '{"error_contains": "define", "code_missing": "define"}', 'Use define statements to create expressions: define "Name": your_expression', 'concept', 0.8),
    (NULL, '{"time_spent_gt": 600, "hint_level_avg_gt": 3}', 'You might benefit from reviewing the fundamentals before continuing', 'learning_path', 0.6);

-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_hint_usages_composite ON hint_usages (user_id, exercise_id, timestamp DESC);
CREATE INDEX CONCURRENTLY idx_hint_analytics_composite ON hint_analytics (exercise_id, hint_type, effectiveness DESC);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_hint_profiles TO cql_api_user;
GRANT SELECT, INSERT, UPDATE ON hint_usages TO cql_api_user;
GRANT SELECT, INSERT, UPDATE ON hint_analytics TO cql_api_user;
GRANT SELECT, INSERT, UPDATE ON hint_effectiveness_stats TO cql_api_user;
GRANT SELECT, INSERT, UPDATE ON contextual_hints TO cql_api_user;