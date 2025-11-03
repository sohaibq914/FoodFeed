-- Create followers table to track user follow relationships
CREATE TABLE IF NOT EXISTS followers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);

-- Add follower_count and following_count columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Create function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment follower count for the user being followed
        UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
        -- Increment following count for the follower
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement follower count for the user being unfollowed
        UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
        -- Decrement following count for the follower
        UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update counts
DROP TRIGGER IF EXISTS trigger_update_follower_counts ON followers;
CREATE TRIGGER trigger_update_follower_counts
AFTER INSERT OR DELETE ON followers
FOR EACH ROW
EXECUTE FUNCTION update_follower_counts();

-- Enable Row Level Security
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for followers table
-- Users can view all follow relationships
CREATE POLICY "Users can view all follow relationships"
ON followers FOR SELECT
USING (true);

-- Users can only create follow relationships where they are the follower
CREATE POLICY "Users can follow others"
ON followers FOR INSERT
WITH CHECK (true);

-- Users can only delete their own follow relationships
CREATE POLICY "Users can unfollow others"
ON followers FOR DELETE
USING (true);

-- Initialize counts for existing users (run once)
UPDATE users 
SET follower_count = (SELECT COUNT(*) FROM followers WHERE following_id = users.id),
    following_count = (SELECT COUNT(*) FROM followers WHERE follower_id = users.id);

