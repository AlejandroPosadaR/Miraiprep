-- Add username column to users table
ALTER TABLE users ADD COLUMN username VARCHAR(100);

-- Set default username from email for existing users
UPDATE users SET username = SPLIT_PART(email, '@', 1) WHERE username IS NULL;

-- Make username NOT NULL and UNIQUE
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Create index on username for faster lookups
CREATE INDEX idx_users_username ON users(username);

