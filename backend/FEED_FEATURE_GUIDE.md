# Feed Feature - Implementation Guide

## Overview

The feed feature displays recipes from users that you follow, creating a personalized experience. This builds on the follow/unfollow feature to show relevant content.

## What's Been Implemented

### Backend (`backend/`)

#### 1. Database Function (`supabase_backend.py`)

- **`get_feed_recipes(user_id, limit, offset)`**
  - Fetches list of users the current user follows
  - Retrieves posted recipes from those users
  - Sorts by timestamp (newest first)
  - Includes author information (username, profile picture)
  - Supports pagination
  - Returns empty feed if user follows nobody

#### 2. Flask API Route (`flask_backend.py`)

- **`GET /feed`**
  - Protected route (requires authentication)
  - Query parameters: `limit` (default: 20), `offset` (default: 0)
  - Returns array of recipes with author info
  - Includes total count for pagination

### Frontend (`frontend/src/app/dashboard/page.tsx`)

#### Dashboard Updates

- **Feed Section** (top of page)

  - Shows recipes from followed users
  - Displays author avatar, username, and timestamp
  - Shows "Following" badge for context
  - Beautiful card layout with images (if available)
  - Shows like counts
  - Relative timestamps (e.g., "2h ago", "3d ago")
  - Click recipe to view details
  - Click username to view profile

- **Empty State**

  - Friendly message when feed is empty
  - Encourages users to follow others

- **Loading States**

  - Spinner while fetching feed
  - Separate loading for feed vs. all recipes

- **Error Handling**

  - Clear error messages if feed fails to load

- **Discover Section** (below feed)
  - Still shows all public recipes
  - Helps users discover new content

## API Endpoint Details

### Request

```http
GET http://localhost:5001/feed?limit=20&offset=0
Headers:
  Content-Type: application/json
  X-User-ID: <user_id>
```

### Response (Success)

```json
{
  "recipes": [
    {
      "recipe_id": "abc123",
      "title": "Chocolate Chip Cookies",
      "description": "Delicious homemade cookies",
      "image": "https://...",
      "timestamp": "2024-01-15T10:30:00Z",
      "like_count": 15,
      "author": {
        "id": "user123",
        "username": "baker_bob",
        "profile_picture_url": "https://..."
      }
    }
  ],
  "count": 42
}
```

### Response (Empty Feed)

```json
{
  "recipes": [],
  "count": 0
}
```

## How It Works

### Feed Generation Process

1. **User Loads Dashboard**

   - Frontend makes authenticated request to `/feed`

2. **Backend Queries Followers**

   - Looks up all users the current user is following
   - If following nobody, returns empty array immediately

3. **Backend Fetches Recipes**

   - Gets all posted recipes from followed users
   - Joins with users table for author info
   - Sorts by timestamp (newest first)
   - Applies pagination limits

4. **Frontend Displays Feed**
   - Renders cards with recipe info
   - Shows author details with links to profile
   - Displays relative timestamps
   - Provides click-through to full recipe

## Testing the Feed Feature

### Setup Test Scenario

1. **Create 3 Test Users:**

   - User A (e.g., "alice")
   - User B (e.g., "bob")
   - User C (e.g., "charlie")

2. **Have Each User Post Recipes:**

   - Bob posts: "Bob's Pasta Recipe"
   - Charlie posts: "Charlie's Pizza Recipe"

3. **Set Up Follows:**
   - Alice follows Bob
   - Alice follows Charlie

### Test Cases

#### Test 1: View Feed with Followed Users

**Steps:**

1. Log in as Alice
2. Go to Dashboard (`/dashboard`)
3. Feed should show at the top

**Expected Results:**

- ✅ Feed shows "Your Feed" heading
- ✅ Shows recipes from Bob and Charlie only
- ✅ Recipes are sorted by newest first
- ✅ Each recipe shows author's username and avatar
- ✅ "Following" badge appears on recipes
- ✅ Clicking recipe opens recipe page
- ✅ Clicking username goes to profile

#### Test 2: Empty Feed

**Steps:**

1. Create a new user (User D)
2. Don't follow anyone
3. View Dashboard

**Expected Results:**

- ✅ Shows "No recipes in your feed yet" message
- ✅ Encourages following other users
- ✅ No error occurs

#### Test 3: New Recipe Appears in Feed

**Steps:**

1. As Alice (following Bob)
2. Note current feed
3. Have Bob post a new recipe
4. Refresh Alice's dashboard

**Expected Results:**

- ✅ Bob's new recipe appears at the top of feed
- ✅ Shows recent timestamp (e.g., "just now")

#### Test 4: Unfollow Updates Feed

**Steps:**

1. As Alice, view current feed with Bob's recipes
2. Go to Bob's profile
3. Click "Unfollow"
4. Return to Dashboard

**Expected Results:**

- ✅ Bob's recipes no longer appear in feed
- ✅ Only recipes from still-followed users show
- ✅ If unfollowed everyone, shows empty state

#### Test 5: Follow Adds to Feed

**Steps:**

1. As Alice (feed shows some recipes)
2. Find a new user to follow (User E)
3. Follow User E
4. Return to Dashboard

**Expected Results:**

- ✅ User E's recipes now appear in feed
- ✅ Feed updates without manual refresh
- ✅ Recipes are properly sorted by timestamp

### Performance Testing

1. **Many Followed Users:**

   - Follow 20+ users
   - Feed should load quickly (<2 seconds)
   - Should use pagination properly

2. **Many Recipes:**
   - Follow users with 50+ recipes each
   - Feed should handle large datasets
   - Should show most recent 20 by default

## Troubleshooting

### Feed Shows "Failed to fetch feed"

**Cause:** Backend not running or authentication issue
**Solution:**

1. Ensure Flask backend is running
2. Check user is logged in
3. Check browser console for detailed error

### Feed is Empty But Should Have Recipes

**Cause:** Not following anyone, or followed users have no posted recipes
**Solution:**

1. Verify you're following users (check their profiles)
2. Verify followed users have `posted=true` recipes (not drafts)
3. Check backend logs for query issues

### Feed Shows All Recipes (Not Just Followed)

**Cause:** Backend query issue
**Solution:**

1. Check backend logs for errors
2. Verify `followers` table has correct data
3. Test with `curl` to see raw API response

### Timestamps Show Wrong Time

**Cause:** Timezone or date parsing issue
**Solution:**

1. Check recipe `timestamp` in database
2. Verify browser timezone settings
3. Times are calculated relative to "now"

## Files Modified/Created

### Backend

- ✅ `backend/supabase_backend.py` - Added `get_feed_recipes()` function
- ✅ `backend/flask_backend.py` - Added `/feed` route and import

### Frontend

- ✅ `frontend/src/app/dashboard/page.tsx` - Added feed display with loading/error states

## Acceptance Criteria ✅

- ✅ **Given** a logged-in user is on the home or feed page, **when** they open the app, **then** they should see a list of recipes only from users they currently follow.

- ✅ **Given** a followed user posts a new recipe, **when** the logged-in user refreshes or revisits their feed, **then** that new recipe should appear at the top of the feed.

- ✅ **Given** a user unfollows someone, **when** they view their feed again, **then** that unfollowed user's posts should no longer appear in their feed.

## Future Enhancements

1. **Infinite Scroll:** Load more recipes as user scrolls down
2. **Pull to Refresh:** Mobile-style refresh gesture
3. **Real-time Updates:** Use WebSocket to push new recipes to feed
4. **Feed Filters:** Filter by recipe type, dietary restrictions, etc.
5. **Like from Feed:** Add like button directly on feed cards
6. **Share Recipes:** Share button on feed cards
7. **Comment Preview:** Show recent comments on feed cards
8. **Activity Indicators:** Show when followed users are active
9. **Recommended Users:** Suggest users to follow based on interests
10. **Feed Algorithm:** Smart ranking beyond chronological

## Integration with Other Features

### Works With:

- ✅ Follow/Unfollow system
- ✅ Recipe posting (only shows posted recipes)
- ✅ User profiles (click to view)
- ✅ Recipe viewing (click to see full recipe)
- ✅ Like counts (displays on feed)

### Future Integrations:

- Comments on recipes
- Recipe bookmarking
- Hashtag/category filtering
- Search within feed
- Personalized recommendations

## Performance Considerations

### Database Queries

- Uses efficient joins to get author info
- Indexes on `author_id` and `timestamp` help performance
- Pagination prevents loading too much data

### Frontend Loading

- Feed loads independently from "All Recipes"
- Separate loading states improve perceived performance
- Images lazy load (browser default)

### Caching Opportunities

- Could cache feed results for 1-2 minutes
- Could preload next page in background
- Could cache author avatars locally

## Security Notes

- ✅ Feed route requires authentication (`@require_auth`)
- ✅ Users can only see their own feed
- ✅ Only shows publicly posted recipes (`posted=true`)
- ✅ RLS policies on `followers` table ensure data integrity
- ✅ No sensitive data exposed in feed

## Maintenance

### Regular Checks

1. Monitor feed load times in production
2. Check for N+1 query issues with many follows
3. Verify pagination works correctly
4. Test with edge cases (0 follows, 1000+ follows)

### Monitoring Metrics

- Feed API response time
- Feed error rate
- Empty feed percentage
- Average recipes per feed
- Pagination usage statistics
