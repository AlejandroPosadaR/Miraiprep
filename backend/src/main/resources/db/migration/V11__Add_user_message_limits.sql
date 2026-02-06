-- Add tier system and message limits to users table
-- Default tier is FREE with 30 messages

-- Add tier column (FREE, PRO, ENTERPRISE)
ALTER TABLE users ADD COLUMN tier VARCHAR(20) NOT NULL DEFAULT 'FREE';

-- Add message count (total messages sent by user across all sessions)
ALTER TABLE users ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0;

-- Add message limit based on tier (can be overridden per user)
ALTER TABLE users ADD COLUMN message_limit INTEGER NOT NULL DEFAULT 30;

-- Add index for quick tier lookups
CREATE INDEX idx_users_tier ON users(tier);

-- Add comment
COMMENT ON COLUMN users.tier IS 'User subscription tier: FREE, PRO, ENTERPRISE';
COMMENT ON COLUMN users.message_count IS 'Total messages sent by user (USER role messages only)';
COMMENT ON COLUMN users.message_limit IS 'Maximum messages allowed for this user (based on tier or custom)';
