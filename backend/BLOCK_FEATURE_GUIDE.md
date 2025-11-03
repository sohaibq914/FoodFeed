# Block Feature - Implementation Guide

## Overview

The block feature allows users to block other users, preventing them from viewing each other's content and interacting. When a user blocks someone:

- Both users automatically unfollow each other
- Blocked user cannot see blocker's profile or recipes
- Blocker cannot see blocked user's content
- They cannot follow each other while blocked

## What's Been Implemented

### Database (`blocked_users_schema.sql`)

#### Tables

- **`blocked_users`** table
  - `id` (UUID primary key)
  - `blocker_id` (UUID, references users)
  - `blocked_id` (UUID, references users)
  - `created_at` (timestamp)
  - UNIQUE constraint on (blocker_id, blocked_id)
  - CHECK constraint prevents self-blocking

#### Triggers

- **`handle_block()`** trigger
  - Automatically unfollows both ways when blocking occurs
  - Removes follower relationships in both directions

#### Helper Functions

- `is_blocked_relationship(user_a, user_b)` - Check if blocked
- `get_blocked_user_ids(user_id)` - Get all blocked IDs
- `get_blocker_user_ids(user_id)` - Get all blocker IDs

### Backend (`backend/`)

#### Helper Functions (`supabase_backend.py`)

1. **`block_user(blocker_id, blocked_id)`**

   - Creates block relationship
   - Prevents self-blocking
   - Checks for existing block

2. **`unblock_user(blocker_id, blocked_id)`**

   - Removes block relationship
   - Validates block exists

3. **`check_is_blocked(user_a_id, user_b_id)`**

   - Checks for block in either direction
   - Returns who blocked whom

4. **`get_blocked_users(user_id, limit, offset)`**
   - Gets list of users you've blocked
   - Includes user details
   - Supports pagination

#### Flask API Routes (`flask_backend.py`)

- **`POST /users/<user_id>/block`** - Block a user
- **`POST /users/<user_id>/unblock`** - Unblock a user
- **`GET /users/<user_id>/is-blocked`** - Check block status
- **`GET /blocked-users`** - Get your blocked list

### Frontend (`frontend/src/app/[username]/page.tsx`)

#### UI Components

1. **Block/Unblock Button**

   - Appears on user profiles (when not own profile)
   - Red "Block" button → Gray "Unblock" button
   - Icons: `IconUserX` (block) / `IconUserCheck` (unblock)
   - Loading states during API calls

2. **Blocked State Messages**

   - **If they blocked you:** "This user has blocked you"
   - **If you blocked them:** "You have blocked this user" + Unblock button
   - Hides all profile content when blocked

3. **Follow Button Behavior**
   - Hides Follow button when you've blocked someone
   - Disables Follow button if blocked
   - Shows "This user has blocked you" instead of Follow

#### State Management

- `isBlocked` - Any block relationship exists
- `youBlockedThem` - You initiated the block
- `blockLoading` - Loading state for block/unblock actions

## API Endpoints

### Block a User

```http
POST /users/<user_id>/block
Headers:
  Content-Type: application/json
  X-User-ID: <current_user_id>
Body: { "user_id": "<current_user_id>" }
```

**Response (Success):**

```json
{
  "message": "User blocked successfully",
  "is_blocked": true
}
```

### Unblock a User

```http
POST /users/<user_id>/unblock
Headers:
  Content-Type: application/json
  X-User-ID: <current_user_id>
Body: { "user_id": "<current_user_id>" }
```

**Response (Success):**

```json
{
  "message": "User unblocked successfully",
  "is_blocked": false
}
```

### Check Block Status

```http
GET /users/<user_id>/is-blocked?current_user_id=<current_user_id>
```

**Response:**

```json
{
  "is_blocked": true,
  "blocker_id": "user_id",
  "blocked_id": "other_user_id",
  "you_blocked_them": true
}
```

### Get Blocked Users List

```http
GET /blocked-users?limit=50&offset=0
Headers:
  X-User-ID: <current_user_id>
```

**Response:**

```json
{
  "blocked_users": [
    {
      "user_id": "abc123",
      "username": "blocked_user",
      "profile_picture_url": "https://...",
      "blocked_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 5
}
```

## Database Setup

### Step 1: Run SQL Schema

1. Log in to your Supabase dashboard
2. Go to SQL Editor
3. Copy contents of `backend/blocked_users_schema.sql`
4. Click "Run"

This creates:

- `blocked_users` table
- Triggers for automatic unfollowing
- Helper functions
- RLS policies
- Indexes

### Step 2: Verify Setup

```sql
-- Check table exists
SELECT * FROM blocked_users LIMIT 1;

-- Test helper function
SELECT is_blocked_relationship('user-id-1', 'user-id-2');
```

## Testing the Block Feature

### Prerequisites

- Backend running (`python flask_backend.py`)
- Frontend running (`npm run dev`)
- At least 2 test users (e.g., Alice and Bob)
- Bob has posted some recipes

### Test Case 1: Basic Block Functionality

**Steps:**

1. Log in as Alice
2. Visit Bob's profile (`/bob`)
3. Click the red "Block" button

**Expected Results:**

- ✅ Button changes to gray "Unblock"
- ✅ Follow button disappears
- ✅ Bob's recipes are hidden
- ✅ Shows "You have blocked this user" message
- ✅ Backend creates block record in database

### Test Case 2: Automatic Unfollowing

**Setup:** Alice is following Bob

**Steps:**

1. Log in as Alice
2. Visit Bob's profile
3. Verify "Following" button is visible
4. Click "Block" button

**Expected Results:**

- ✅ Both users unfollow each other automatically
- ✅ Follower counts update
- ✅ "Following" button disappears
- ✅ Database triggers remove follower relationships

### Test Case 3: Cannot Follow While Blocked

**Setup:** Alice has blocked Bob

**Steps:**

1. Log in as Alice (blocker)
2. Visit Bob's profile
3. Look for Follow button

**Expected Results:**

- ✅ No Follow button visible
- ✅ Only "Unblock" button shows
- ✅ Profile content is hidden

### Test Case 4: Blocked User View

**Setup:** Alice has blocked Bob

**Steps:**

1. Log in as Bob (blocked user)
2. Visit Alice's profile (`/alice`)

**Expected Results:**

- ✅ Shows "This user has blocked you" message
- ✅ Cannot see Alice's recipes
- ✅ Cannot see Follow button
- ✅ Shows blocker's username and avatar only

### Test Case 5: Unblock Functionality

**Setup:** Alice has blocked Bob

**Steps:**

1. Log in as Alice
2. Visit Bob's profile
3. Click "Unblock" button

**Expected Results:**

- ✅ Button changes to red "Block"
- ✅ Follow button reappears
- ✅ Bob's recipes become visible again
- ✅ Can follow Bob again if desired
- ✅ Database removes block record

### Test Case 6: Mutual Block Check

**Steps:**

1. Alice blocks Bob
2. Bob tries to view Alice's profile
3. Bob attempts to block Alice

**Expected Results:**

- ✅ Bob sees "This user has blocked you"
- ✅ Bob cannot see Alice's content
- ✅ Block status API returns correct blocker info

### Test Case 7: Prevent Self-Block

**Steps:**

1. Log in as Alice
2. Visit own profile (`/alice`)

**Expected Results:**

- ✅ No Block button visible
- ✅ Only "Edit Profile" button shows
- ✅ Cannot block yourself via API

## Content Visibility Rules

### When You Block Someone

- ❌ You cannot see their recipes
- ❌ You cannot follow them
- ❌ They don't appear in your feed
- ❌ They cannot follow you
- ✅ You can unblock them anytime

### When Someone Blocks You

- ❌ You cannot see their profile
- ❌ You cannot see their recipes
- ❌ You cannot follow them
- ❌ You cannot message them (if implemented)
- ❌ You see "This user has blocked you"

### When You Unblock Someone

- ✅ Full profile access restored
- ✅ Can follow them again
- ✅ Their recipes visible again
- ✅ Normal interactions resume

## Security & Privacy

### RLS Policies

- Users can only block/unblock for themselves
- Block relationships are visible to both parties
- Cannot bypass blocks via API

### Automatic Cleanups

- Database triggers handle unfollowing
- Foreign key constraints maintain data integrity
- ON DELETE CASCADE cleans up when users are deleted

### API Protection

- `@require_auth` decorator on block/unblock routes
- User ID verified from session
- Cannot block/unblock on behalf of others

## Integration with Other Features

### Follow System

- ✅ Blocking automatically unfollows both ways
- ✅ Cannot follow while block exists
- ✅ Follower counts update correctly

### Feed

- ⚠️ TODO: Exclude blocked users from feed
- ⚠️ TODO: Exclude users who blocked you from feed

### Messages

- ⚠️ TODO: Prevent messages between blocked users
- ⚠️ TODO: Hide message history

### Comments/Likes

- ⚠️ TODO: Hide comments from blocked users
- ⚠️ TODO: Prevent likes on blocked user's recipes

## Troubleshooting

### "User is already blocked" Error

**Cause:** Trying to block someone already blocked
**Solution:** Check is-blocked status first; UI should prevent this

### Block Button Not Appearing

**Cause:** Viewing own profile or not logged in
**Solution:** Block only shows on other users' profiles when logged in

### Cannot Unfollow After Blocking

**Cause:** Database trigger should handle this
**Solution:** Check trigger is created correctly in database

### Blocked User Still in Feed

**Cause:** Feed doesn't filter blocked users yet
**Solution:** Implement feed filtering (TODO item)

### Block Relationship Not Detected

**Cause:** API not checking properly
**Solution:** Verify `check_is_blocked` returns correct data

## Files Created/Modified

### Backend

- ✅ `backend/blocked_users_schema.sql` - Database schema
- ✅ `backend/supabase_backend.py` - Helper functions
- ✅ `backend/flask_backend.py` - API routes

### Frontend

- ✅ `frontend/src/app/[username]/page.tsx` - Profile page with block UI

### Documentation

- ✅ `backend/BLOCK_FEATURE_GUIDE.md` - This file

## Acceptance Criteria ✅

- ✅ **Given** a logged-in user views another user's profile, **when** they click the "Block" button, **then** that user should be added to their blocked list.

- ✅ **Given** a user is blocked, **when** they try to view the blocker's profile or posts, **then** they should not be able to see any content.

- ✅ **Given** a user has blocked someone, **when** they click the "Unblock" button, **then** that person should be removed from their blocked list and normal access restored.

## Future Enhancements

### Phase 1 - Core Improvements

1. **Feed Filtering:** Exclude blocked users from feed
2. **Message Blocking:** Prevent messages between blocked users
3. **Comment Hiding:** Hide comments from blocked users
4. **Search Filtering:** Exclude blocked users from search results

### Phase 2 - Advanced Features

1. **Blocked List Page:** Dedicated page to manage blocked users
2. **Block Notifications:** Optional notifications when blocked (disabled by default)
3. **Bulk Block:** Block multiple users at once
4. **Block Export:** Export list of blocked users
5. **Block History:** See when you blocked/unblocked someone

### Phase 3 - Privacy Controls

1. **Block Reasons:** Optional reason for blocking (private)
2. **Auto-block:** Block based on keywords or behavior
3. **Privacy Settings:** Control who can see your profile
4. **Block Suggestions:** Suggest blocking based on patterns

### Phase 4 - Moderation

1. **Report + Block:** Report and block in one action
2. **Admin Block Override:** Admins can see blocked content
3. **Block Analytics:** Track blocking patterns for safety
4. **Community Guidelines:** Link to guidelines when blocking

## Best Practices

### For Users

- Block disruptive or unwanted users
- Unblock if relationships improve
- Use block sparingly - it's not a "mute" feature
- Consider unfollowing before blocking

### For Developers

- Always check block status before showing content
- Update UI immediately after block/unblock
- Handle both directions (blocker and blocked)
- Test edge cases thoroughly
- Document block behavior clearly

### For Admins

- Monitor block patterns for abuse
- Respect user privacy - blocks are private
- Don't reveal who blocked whom
- Provide appeal process if needed

## Support

If you encounter issues:

1. Check backend console for errors
2. Check browser console for API errors
3. Verify database schema is correct
4. Test with curl to isolate backend issues
5. Check RLS policies if permission errors occur

## Maintenance Checklist

- [ ] Database backups include blocked_users table
- [ ] RLS policies prevent unauthorized access
- [ ] Triggers working correctly
- [ ] API endpoints require authentication
- [ ] Frontend handles all error cases
- [ ] Block counts are accurate
- [ ] Performance is acceptable with large block lists
- [ ] Mobile view works correctly
