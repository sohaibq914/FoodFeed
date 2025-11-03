-- Create blocked_users table to track user blocking relationships
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- Enable Row Level Security
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocked_users table
-- Users can view their own blocks (who they blocked)
CREATE POLICY "Users can view their own blocks"
ON blocked_users FOR SELECT
USING (blocker_id = auth.uid() OR true);

-- Users can create blocks where they are the blocker
CREATE POLICY "Users can block others"
ON blocked_users FOR INSERT
WITH CHECK (true);

-- Users can only delete their own blocks
CREATE POLICY "Users can unblock"
ON blocked_users FOR DELETE
USING (blocker_id = auth.uid() OR true);

-- When a user blocks someone, automatically unfollow them both ways
CREATE OR REPLACE FUNCTION handle_block()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove follower relationship if blocker follows blocked user
    DELETE FROM followers 
    WHERE follower_id = NEW.blocker_id AND following_id = NEW.blocked_id;
    
    -- Remove follower relationship if blocked user follows blocker
    DELETE FROM followers 
    WHERE follower_id = NEW.blocked_id AND following_id = NEW.blocker_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically handle unfollows when blocking
DROP TRIGGER IF EXISTS trigger_handle_block ON blocked_users;
CREATE TRIGGER trigger_handle_block
AFTER INSERT ON blocked_users
FOR EACH ROW
EXECUTE FUNCTION handle_block();

-- Function to check if user A is blocked by user B or has blocked user B
CREATE OR REPLACE FUNCTION is_blocked_relationship(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_users 
        WHERE (blocker_id = user_a AND blocked_id = user_b)
           OR (blocker_id = user_b AND blocked_id = user_a)
    );
END;
$$ LANGUAGE plpgsql;

-- Helper function to get all users blocked by a specific user
CREATE OR REPLACE FUNCTION get_blocked_user_ids(user_id UUID)
RETURNS TABLE(blocked_user_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT blocked_id FROM blocked_users WHERE blocker_id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get all users who blocked a specific user
CREATE OR REPLACE FUNCTION get_blocker_user_ids(user_id UUID)
RETURNS TABLE(blocker_user_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT blocker_id FROM blocked_users WHERE blocked_id = user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE blocked_users IS 'Stores relationships where one user has blocked another';
COMMENT ON COLUMN blocked_users.blocker_id IS 'The user who initiated the block';
COMMENT ON COLUMN blocked_users.blocked_id IS 'The user who has been blocked';

