-- Add job_description column to interview_sessions
ALTER TABLE interview_sessions
    ADD COLUMN job_description TEXT;
