-- Add idempotency_key column to messages table
-- This enables deduplication of messages on retry/reconnect

ALTER TABLE messages ADD COLUMN idempotency_key VARCHAR(64);

-- Create unique constraint on (session_id, idempotency_key)
-- This prevents duplicate messages within the same session
-- NULL values are allowed (for legacy/system messages) and don't violate uniqueness
CREATE UNIQUE INDEX idx_messages_session_idempotency 
    ON messages (session_id, idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- Add index for faster lookups by idempotency key
CREATE INDEX idx_messages_idempotency_key ON messages (idempotency_key) WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN messages.idempotency_key IS 'Client-provided key to prevent duplicate message creation on retries';
