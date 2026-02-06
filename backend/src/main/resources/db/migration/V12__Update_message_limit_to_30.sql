-- Update existing users' message limit from 20 to 30
UPDATE users 
SET message_limit = 30 
WHERE tier = 'FREE' AND message_limit = 20;

-- Update the default for future users (if column default wasn't already updated)
-- Note: This is handled by the application default, but we ensure existing users are updated
