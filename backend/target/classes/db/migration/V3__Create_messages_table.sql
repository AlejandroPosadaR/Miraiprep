-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'USER' or 'INTERVIEWER'
    content TEXT NOT NULL,
    message_status VARCHAR(20) NOT NULL,
    audio_url VARCHAR(500), -- Optional: URL to audio file if voice was used
    sequence_number BIGINT NOT NULL, -- Order of message in conversation
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_messages_session 
        FOREIGN KEY (session_id) 
        REFERENCES interview_sessions(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_messages_role 
        CHECK (role IN ('USER', 'INTERVIEWER'))
);

-- Create indexes
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_session_sequence ON messages(session_id, sequence_number);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- Add comment to table
COMMENT ON TABLE messages IS 'Messages exchanged during interview sessions (conversation history)';

