# Recipe Privacy Feature - Implementation Guide

## Overview

The recipe privacy feature allows users to make individual recipes private, visible only to their followers. This creates a more personalized and controlled sharing experience.

## Key Features

✅ **Individual Recipe Privacy** - Each recipe can be public or private  
✅ **Follower-Only Access** - Private recipes only visible to followers  
✅ **Author Always Sees** - Authors can always view their own recipes  
✅ **Feed Integration** - Private recipes show in followers' feeds  
✅ **Profile Filtering** - Non-followers can't see private recipes on profiles  
✅ **Visual Indicators** - Privacy badges show recipe status  
✅ **Easy Toggle** - Simple UI to switch between public/private

## What's Been Implemented

### Database (`recipe_privacy_schema.sql`)

#### Schema Changes

- **`visibility` column** added to `recipes` table
  - Type: VARCHAR(20)
  - Values: 'public' or 'private'
  - Default: 'public'
  - CHECK constraint ensures only valid values

#### Helper Functions

1. **`can_view_recipe(recipe_author_id, recipe_visibility, viewer_id)`**

   - Returns TRUE if viewer can see recipe
   - Checks: public status, ownership, follower status

2. **`get_visible_recipes_for_user(viewer_id, author_id, include_drafts)`**
   - Returns recipe IDs visible to viewer
   - Filters by visibility and follower status

#### Database Views

- **`public_recipes`** - View of all public posted recipes for discovery

#### RLS Policies

- Updated to respect visibility settings
- Public recipes visible to all
- Private recipes visible to author and followers
- Secure and efficient access control

### Backend (`backend/`)

#### Updated Functions (`supabase_backend.py`)

1. **`update_recipe()`**

   - Added `visibility` parameter (default: 'public')
   - Validates visibility value
   - Stores in database

2. **`get_recipe()`**

   - Checks recipe visibility before returning
   - Verifies follower status for private recipes
   - Returns error if not authorized
   - Error includes `"private": True` flag

3. **`get_feed_recipes()`**
   - Returns all recipes from followed users
   - Includes private recipes (since following)
   - Adds visibility to response

#### Flask Routes (`flask_backend.py`)

**Updated Routes:**

- **`POST /update_recipe`** - Accepts `visibility` parameter
- **`POST /get_recipe`** - Checks privacy permissions
- **`GET /users/<username>/recipes`** - Filters by follower status

### Frontend (`frontend/`)

#### Recipe Editor (`src/components/RecipeEditor.tsx`)

- ✅ **Privacy Toggle** - SegmentedControl with 2 options
  - 🌍 Public - Everyone can see
  - 🔒 Private - Followers only
- ✅ **Helpful Text** - Explains current setting
- ✅ **Persistence** - Loads and saves visibility
- ✅ **Default** - New recipes are public by default

#### User Profile (`src/app/[username]/page.tsx`)

- ✅ **Privacy Badges** - Shows 🔒 Private badge on private recipes
- ✅ **Filtered Display** - Non-followers don't see private recipes
- ✅ **Owner View** - Authors see all their recipes with badges

#### Dashboard Feed (`src/app/dashboard/page.tsx`)

- ✅ **Privacy Badges** - Shows which recipes are private
- ✅ **Follower Access** - See private recipes from users you follow
- ✅ **Visual Clarity** - Clear indicators for privacy level

#### Blocked Users Page (`src/app/blocked-users/page.tsx`)

- ✅ **Manage Blocked Users** - View and unblock users
- ✅ **User Details** - Shows username, avatar, block date
- ✅ **Quick Actions** - Unblock or view profile
- ✅ **Empty State** - Friendly message when no blocked users

## Database Setup

### Step 1: Run SQL Schema

```sql
1. Open Supabase Dashboard (https://app.supabase.com)
2. Navigate to SQL Editor
3. Copy contents of backend/recipe_privacy_schema.sql
4. Click "Run"
```

This will:

- Add `visibility` column to recipes table
- Create helper functions
- Update RLS policies
- Create indexes
- Set all existing recipes to 'public'

### Step 2: Verify Setup

```sql
-- Check column exists
SELECT recipe_id, title, visibility FROM recipes LIMIT 5;

-- Test helper function
SELECT can_view_recipe(
    'author-id'::UUID,
    'private',
    'viewer-id'::UUID
);
```

## API Endpoints

### Create/Update Recipe with Privacy

```http
POST /update_recipe
Headers:
  Content-Type: application/json
Body:
{
  "recipe_id": "new",
  "author": "user-id",
  "title": "My Recipe",
  "description": "...",
  "ingredients": "...",
  "instructions": "...",
  "posting": true,
  "visibility": "private"
}
```

### Get Recipe (with Privacy Check)

```http
POST /get_recipe
Body: {
  "recipe_id": "recipe-id",
  "user_id": "viewer-id"
}
```

**Response (Authorized):**

```json
{
  "recipe_id": "...",
  "title": "Private Recipe",
  "visibility": "private",
  ...
}
```

**Response (Not Authorized):**

```json
{
  "error": "This recipe is private. Follow the author to view it.",
  "private": true
}
```

### Get User's Recipes (with Privacy Filtering)

```http
GET /users/<username>/recipes
Headers:
  X-User-ID: viewer-id
```

**Response:** Only includes recipes viewer can see

## Testing the Privacy Feature

### Setup Test Scenario

1. **Create 3 Users:**

   - Alice (recipe author)
   - Bob (follower)
   - Charlie (non-follower)

2. **Alice Creates Recipes:**

   - Recipe 1: "Public Pasta" (public)
   - Recipe 2: "Private Pizza" (private)
   - Recipe 3: "Secret Salad" (private)

3. **Set Up Follows:**
   - Bob follows Alice
   - Charlie does NOT follow Alice

### Test Case 1: Create Private Recipe

**Steps:**

1. Log in as Alice
2. Go to `/edit-recipe/new`
3. Fill in recipe details
4. Select "🔒 Private - Followers only"
5. Click "Post"

**Expected Results:**

- ✅ Recipe is saved with visibility='private'
- ✅ Shows orange "Private" badge on profile
- ✅ Recipe appears in Alice's own profile
- ✅ Confirmation text shows "Only your followers can view this recipe"

### Test Case 2: Follower Viewing Private Recipe

**Steps:**

1. Log in as Bob (follows Alice)
2. Visit Alice's profile (`/alice`)
3. Look for private recipes

**Expected Results:**

- ✅ Can see "Private Pizza" and "Secret Salad"
- ✅ Recipes show 🔒 Private badge
- ✅ Can click to view full recipe
- ✅ Private recipes appear in Bob's feed

### Test Case 3: Non-Follower Viewing Private Recipe

**Steps:**

1. Log in as Charlie (does NOT follow Alice)
2. Visit Alice's profile (`/alice`)
3. Look for private recipes

**Expected Results:**

- ✅ Cannot see "Private Pizza" or "Secret Salad"
- ✅ Only sees "Public Pasta"
- ✅ Private recipes don't appear in list at all
- ✅ No broken links or errors

### Test Case 4: Direct Link to Private Recipe

**Steps:**

1. Get direct link to private recipe (e.g., `/recipe/abc123`)
2. Log in as Charlie (non-follower)
3. Try to access the link

**Expected Results:**

- ✅ Shows error: "This recipe is private. Follow the author to view it."
- ✅ Cannot see recipe details
- ✅ Suggests following the author

### Test Case 5: Change Recipe from Private to Public

**Steps:**

1. Log in as Alice
2. Go to edit "Private Pizza" recipe
3. Change visibility to "🌍 Public"
4. Save/Post

**Expected Results:**

- ✅ Recipe visibility updated in database
- ✅ Charlie can now see the recipe
- ✅ Recipe appears in everyone's view
- ✅ Private badge disappears

### Test Case 6: Change Recipe from Public to Private

**Steps:**

1. Log in as Alice
2. Edit "Public Pasta" recipe
3. Change to "🔒 Private"
4. Save

**Expected Results:**

- ✅ Charlie can no longer see recipe
- ✅ Bob can still see it (is follower)
- ✅ Private badge appears
- ✅ Hidden from non-followers immediately

### Test Case 7: Follow → Can See Private Recipes

**Steps:**

1. Log in as Charlie
2. Verify cannot see Alice's private recipes
3. Follow Alice
4. Refresh Alice's profile

**Expected Results:**

- ✅ Private recipes now visible
- ✅ Shows "Private" badges
- ✅ Can view full recipes
- ✅ Recipes appear in feed

### Test Case 8: Unfollow → Lose Access

**Steps:**

1. Log in as Bob (follower)
2. Can see Alice's private recipes
3. Unfollow Alice
4. Refresh profile

**Expected Results:**

- ✅ Private recipes disappear
- ✅ Only public recipes visible
- ✅ Feed no longer shows Alice's recipes
- ✅ Direct links to private recipes show error

## Privacy Visibility Matrix

| Viewer Status | Public Recipe | Private Recipe |
| ------------- | ------------- | -------------- |
| Author        | ✅ Can see    | ✅ Can see     |
| Follower      | ✅ Can see    | ✅ Can see     |
| Non-follower  | ✅ Can see    | ❌ Cannot see  |
| Not logged in | ✅ Can see    | ❌ Cannot see  |
| Blocked user  | ❌ Cannot see | ❌ Cannot see  |

## UI Components

### Recipe Editor Privacy Toggle

```
┌────────────────────────────────────────┐
│ Recipe Visibility                      │
│                                        │
│ [🌍 Public] [🔒 Private]              │
│                                        │
│ This recipe will be visible to        │
│ everyone / Only your followers can    │
│ view this recipe                       │
└────────────────────────────────────────┘
```

### Profile Recipe List (Owner View)

```
┌──────────────────────────────────┐
│ My Awesome Recipe                │
│ [Posted] [🔒 Private]            │
│ A delicious recipe...            │
│ [Edit Recipe]                    │
└──────────────────────────────────┘
```

### Profile Recipe List (Follower View)

```
┌──────────────────────────────────┐
│ My Awesome Recipe                │
│ [🔒 Private]                     │
│ A delicious recipe...            │
│ [View Recipe]                    │
└──────────────────────────────────┘
```

### Feed View

```
┌──────────────────────────────────┐
│ [@alice] • 2h ago                │
│ [Following] [🔒 Private]         │
│                                  │
│ Secret Family Recipe             │
│ Only for my followers!           │
│                                  │
│ ❤️ 5 likes                       │
└──────────────────────────────────┘
```

## Files Created/Modified

### Backend

- ✅ `backend/recipe_privacy_schema.sql` - Database schema
- ✅ `backend/supabase_backend.py` - Updated functions
- ✅ `backend/flask_backend.py` - Updated routes

### Frontend

- ✅ `frontend/src/components/RecipeEditor.tsx` - Privacy toggle
- ✅ `frontend/src/app/[username]/page.tsx` - Privacy badges, filtering
- ✅ `frontend/src/app/dashboard/page.tsx` - Privacy badges in feed
- ✅ `frontend/src/app/blocked-users/page.tsx` - New page for blocked users

### Documentation

- ✅ `backend/PRIVACY_FEATURE_GUIDE.md` - Complete guide
- ✅ `backend/BLOCK_FEATURE_GUIDE.md` - Block feature docs

## Acceptance Criteria ✅

- ✅ **Given** a logged-in user is creating/editing a post, **when** they select "Private", **then** only their followers can view that post.

- ✅ **Given** a non-follower tries to access a private post, **when** they open the link or profile, **then** the post is hidden or shows a restricted-access message.

- ✅ **Given** a user changes a post from private to public, **when** others view their profile or feed, **then** that post becomes visible to everyone.

## Integration with Other Features

### Works With:

- ✅ **Follow System** - Followers can see private recipes
- ✅ **Feed** - Private recipes appear in followers' feeds
- ✅ **Profile Pages** - Filtered based on follower status
- ✅ **Recipe Viewing** - Direct link access controlled
- ✅ **Block Feature** - Blocked users can't see any recipes

### Future Enhancements:

- [ ] Privacy analytics (who viewed private recipes)
- [ ] Temporary access links for private recipes
- [ ] Recipe collections with group privacy
- [ ] Scheduled visibility changes
- [ ] Privacy presets (all private, all public)

## Security Considerations

### Database Level

- ✅ RLS policies enforce visibility rules
- ✅ CHECK constraint validates visibility values
- ✅ Indexes optimize privacy queries
- ✅ Helper functions centralize logic

### API Level

- ✅ Viewer ID checked for all requests
- ✅ Follower status verified in real-time
- ✅ Private flag in error responses
- ✅ Consistent filtering across endpoints

### Frontend Level

- ✅ Visual indicators for privacy status
- ✅ Clear messaging about who can see
- ✅ Graceful handling of unauthorized access
- ✅ No sensitive data exposed in errors

## Performance Considerations

### Database Queries

- Indexed on visibility for fast filtering
- Combined index on (author_id, visibility)
- Helper functions use efficient joins
- View materializes public recipes

### API Optimization

- Single follower check per profile view
- Batch filtering for recipe lists
- Cached follower status during request
- Minimal database roundtrips

### Frontend Caching

- Privacy status loaded once per recipe
- Follower status checked on profile load
- No excessive API calls
- Efficient state management

## Privacy Best Practices

### For Users

1. **Default to Public** - New recipes are public by default
2. **Review Before Posting** - Check privacy before posting
3. **Follower Trust** - Private means followers only
4. **Easy Changes** - Can change privacy anytime
5. **Clear Indicators** - Orange badge shows private status

### For Developers

1. **Always Check Permissions** - Verify follower status
2. **Fail Secure** - Deny access if unsure
3. **Clear Errors** - Explain why access denied
4. **Test Thoroughly** - All viewer combinations
5. **Log Attempts** - Monitor access patterns

## Troubleshooting

### Private Recipe Shows to Non-Followers

**Cause:** Backend not checking follower status
**Solution:**

1. Verify SQL schema was run
2. Check `list_recipes_by_username` filters correctly
3. Verify X-User-ID header is sent
4. Test `can_view_recipe()` function

### Cannot See Own Private Recipes

**Cause:** Owner check failing
**Solution:**

1. Verify user ID matches author ID
2. Check authentication headers
3. Look for query filtering bugs
4. Verify RLS policies

### Privacy Toggle Not Saving

**Cause:** Frontend not sending visibility
**Solution:**

1. Check FormData includes visibility
2. Verify backend accepts parameter
3. Check database column exists
4. Look at network tab for payload

### Follower Sees "Recipe is Private" Error

**Cause:** Follower check not working
**Solution:**

1. Verify follower relationship in database
2. Check `followers` table query
3. Test `is_following` API
4. Check user IDs match

### Public Recipe Shows as Private

**Cause:** Visibility field not set correctly
**Solution:**

1. Check recipe visibility in database
2. Verify default value is 'public'
3. Run UPDATE to fix existing recipes
4. Check for typos (public vs Public)

## Advanced Use Cases

### Scenario 1: Semi-Public Content

**Goal:** Share with followers first, make public later

**Steps:**

1. Create recipe as private
2. Post for followers to see
3. Get feedback
4. Change to public when ready

### Scenario 2: Exclusive Content

**Goal:** Reward followers with exclusive recipes

**Steps:**

1. Create special/premium recipes
2. Mark as private
3. Followers get exclusive access
4. Promote following to see more

### Scenario 3: Work in Progress

**Goal:** Share draft with trusted followers

**Steps:**

1. Create recipe as private
2. Share with followers for feedback
3. Iterate based on comments
4. Make public when complete

### Scenario 4: Personal Archive

**Goal:** Keep family recipes private

**Steps:**

1. Mark sensitive recipes as private
2. Only trusted followers see them
3. Protect family traditions
4. Share selectively

## Migration Guide

### Existing Recipes

All existing recipes are automatically set to `visibility = 'public'` when you run the schema. This ensures:

- ✅ No broken links
- ✅ No unexpected privacy changes
- ✅ Backwards compatible
- ✅ Users opt-in to privacy

### Updating Old Recipes

Users can edit existing recipes to make them private:

1. Go to recipe
2. Click "Edit"
3. Change visibility toggle
4. Save

## Monitoring & Analytics

### Metrics to Track

- % of recipes that are private
- Average followers when posting private
- Private recipe view counts
- Conversion from private to public
- Privacy-related errors

### Privacy Audit

- Who can see which recipes
- Follower counts over time
- Privacy setting changes
- Access denied events
- Security policy violations

## Future Enhancements

### Phase 1 - Enhanced Privacy

- [ ] "Friends only" visibility level
- [ ] Specific user access lists
- [ ] Time-limited privacy
- [ ] Password-protected recipes

### Phase 2 - Privacy Management

- [ ] Bulk privacy updates
- [ ] Privacy presets
- [ ] Default privacy setting
- [ ] Privacy history log

### Phase 3 - Social Features

- [ ] Private recipe shares (temporary links)
- [ ] Request access to private recipes
- [ ] Privacy notifications
- [ ] Follower-only comments

### Phase 4 - Advanced Controls

- [ ] Geographic restrictions
- [ ] Age-gated content
- [ ] Paid/premium content
- [ ] NFT-gated recipes

## Compliance & Legal

### Privacy Policy

- Inform users about visibility settings
- Explain follower access
- Document data retention
- Privacy rights (GDPR, CCPA)

### User Rights

- Right to make recipes private
- Right to change privacy anytime
- Right to export recipe data
- Right to delete recipes

### Platform Responsibility

- Respect privacy settings
- No unauthorized access
- Secure data storage
- Audit access logs

## Support

### User Help

**Q: How do I make a recipe private?**
A: Edit the recipe and select "🔒 Private - Followers only"

**Q: Who can see my private recipes?**
A: Only you and your followers can see private recipes

**Q: Can I change privacy later?**
A: Yes! Edit the recipe and change the visibility setting anytime

**Q: Will private recipes show in search?**
A: Private recipes only appear to followers, not in public search

**Q: What happens if I unfollow someone?**
A: You lose access to their private recipes immediately

### Developer Support

- Check backend logs for permission errors
- Use `can_view_recipe()` function for testing
- Verify follower relationships in database
- Test with multiple user accounts
- Monitor API errors for patterns

## Maintenance

### Regular Checks

- [ ] Verify RLS policies are active
- [ ] Check query performance with many private recipes
- [ ] Monitor privacy-related errors
- [ ] Audit access logs for violations
- [ ] Test follower checks are accurate

### Database Maintenance

- [ ] Reindex if queries slow down
- [ ] Archive old blocked relationships
- [ ] Clean up orphaned records
- [ ] Vacuum tables regularly
- [ ] Monitor table sizes

## Summary

The recipe privacy feature is **complete and production-ready**! It provides:

✅ Granular privacy control  
✅ Follower-based access  
✅ Clear visual indicators  
✅ Secure implementation  
✅ Excellent user experience  
✅ Comprehensive testing

Users can now create private recipes that only their followers can see, creating a more personal and controlled sharing experience on FoodFeed! 🎉
