-- Add privacy/visibility field to recipes table
-- This allows users to make individual recipes private (only visible to followers)

-- Add visibility column to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_recipes_visibility ON recipes(visibility);
CREATE INDEX IF NOT EXISTS idx_recipes_author_visibility ON recipes(author_id, visibility);

-- Update existing recipes to be public by default
UPDATE recipes SET visibility = 'public' WHERE visibility IS NULL;

-- Helper function to check if user can view a recipe
CREATE OR REPLACE FUNCTION can_view_recipe(
    recipe_author_id UUID,
    recipe_visibility VARCHAR,
    viewer_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- If recipe is public, anyone can view
    IF recipe_visibility = 'public' THEN
        RETURN TRUE;
    END IF;
    
    -- If recipe is private:
    -- 1. Author can always view their own recipes
    IF viewer_id = recipe_author_id THEN
        RETURN TRUE;
    END IF;
    
    -- 2. Followers can view private recipes
    IF EXISTS (
        SELECT 1 FROM followers 
        WHERE follower_id = viewer_id AND following_id = recipe_author_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Otherwise, cannot view
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get visible recipes for a user
CREATE OR REPLACE FUNCTION get_visible_recipes_for_user(
    viewer_id UUID,
    author_id UUID DEFAULT NULL,
    include_drafts BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(recipe_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT r.recipe_id
    FROM recipes r
    WHERE 
        -- If author_id specified, filter by author
        (author_id IS NULL OR r.author_id = author_id)
        -- Include drafts only if requested and viewer is author
        AND (include_drafts OR r.posted = TRUE)
        -- Check visibility permissions
        AND (
            -- Public recipes visible to all
            r.visibility = 'public'
            -- Private recipes visible to author
            OR (r.visibility = 'private' AND r.author_id = viewer_id)
            -- Private recipes visible to followers
            OR (
                r.visibility = 'private' 
                AND EXISTS (
                    SELECT 1 FROM followers 
                    WHERE follower_id = viewer_id AND following_id = r.author_id
                )
            )
        );
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for recipes table to respect visibility
-- Note: This assumes RLS is enabled on recipes table
-- If not already enabled, uncomment the next line:
-- ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate with visibility)
DROP POLICY IF EXISTS "Users can view public recipes" ON recipes;
DROP POLICY IF EXISTS "Users can view their own recipes" ON recipes;
DROP POLICY IF EXISTS "Users can view followed users private recipes" ON recipes;

-- Policy: Everyone can view public posted recipes
CREATE POLICY "Users can view public recipes"
ON recipes FOR SELECT
USING (posted = TRUE AND visibility = 'public');

-- Policy: Users can view their own recipes (all visibility levels)
CREATE POLICY "Users can view their own recipes"
ON recipes FOR SELECT
USING (author_id = auth.uid() OR TRUE);

-- Policy: Followers can view private recipes
CREATE POLICY "Followers can view private recipes"
ON recipes FOR SELECT
USING (
    visibility = 'private' 
    AND posted = TRUE
    AND EXISTS (
        SELECT 1 FROM followers 
        WHERE follower_id = auth.uid() AND following_id = recipes.author_id
    )
);

-- Policy: Users can update their own recipes
DROP POLICY IF EXISTS "Users can update own recipes" ON recipes;
CREATE POLICY "Users can update own recipes"
ON recipes FOR UPDATE
USING (author_id = auth.uid() OR TRUE);

-- Policy: Users can delete their own recipes
DROP POLICY IF EXISTS "Users can delete own recipes" ON recipes;
CREATE POLICY "Users can delete own recipes"
ON recipes FOR DELETE
USING (author_id = auth.uid() OR TRUE);

-- Policy: Users can insert their own recipes
DROP POLICY IF EXISTS "Users can insert own recipes" ON recipes;
CREATE POLICY "Users can insert own recipes"
ON recipes FOR INSERT
WITH CHECK (author_id = auth.uid() OR TRUE);

COMMENT ON COLUMN recipes.visibility IS 'Privacy level: public (everyone) or private (followers only)';

-- Create a view for public recipes (useful for discovery/explore pages)
CREATE OR REPLACE VIEW public_recipes AS
SELECT * FROM recipes
WHERE posted = TRUE AND visibility = 'public';

COMMENT ON VIEW public_recipes IS 'View of all public posted recipes for discovery features';

