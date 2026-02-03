-- Add experience level to interview sessions
ALTER TABLE interview_sessions ADD COLUMN experience_years INTEGER DEFAULT 2;

-- Add evaluation columns
ALTER TABLE interview_sessions ADD COLUMN evaluation_score DECIMAL(3,1);
ALTER TABLE interview_sessions ADD COLUMN evaluation_knowledge INTEGER;
ALTER TABLE interview_sessions ADD COLUMN evaluation_communication INTEGER;
ALTER TABLE interview_sessions ADD COLUMN evaluation_problem_solving INTEGER;
ALTER TABLE interview_sessions ADD COLUMN evaluation_technical_depth INTEGER;
ALTER TABLE interview_sessions ADD COLUMN evaluation_feedback TEXT;
ALTER TABLE interview_sessions ADD COLUMN evaluated_at TIMESTAMP;
