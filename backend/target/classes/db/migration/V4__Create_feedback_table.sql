-- Create feedback table
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE, -- One feedback per session
    overall_score DECIMAL(3,1), -- Score from 0.0 to 10.0
    strengths TEXT, -- JSON or text describing strengths
    areas_for_improvement TEXT, -- JSON or text describing areas to improve
    detailed_analysis TEXT, -- Comprehensive feedback analysis
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_feedback_session 
        FOREIGN KEY (session_id) 
        REFERENCES interview_sessions(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_feedback_score 
        CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 10))
);

-- Create index
CREATE INDEX idx_feedback_session_id ON feedback(session_id);
CREATE INDEX idx_feedback_score ON feedback(overall_score DESC);

-- Add comment to table
COMMENT ON TABLE feedback IS 'AI-generated feedback and evaluation for completed interview sessions';

