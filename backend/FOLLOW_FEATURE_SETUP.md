# Follow/Unfollow Feature Setup Guide

This document provides instructions for setting up and testing the follow/unfollow feature in FoodFeed.

## Overview

The follow/unfollow feature allows users to:

- Follow and unfollow other users
- View their followers and following lists
- See follower/following counts on user profiles
- See a "Follow" or "Following" button on other users' profiles

## Database Setup

### Step 1: Run the SQL Schema

You need to execute the SQL schema in your Supabase database to create the necessary tables and triggers.

1. Log in to your Supabase dashboard (https://app.supabase.com)
2. Navigate to your project
3. Go to the SQL Editor (left sidebar)
4. Copy the contents of `backend/followers_schema.sql`
5. Paste into the SQL Editor and click "Run"

This will:

- Create the `followers` table with proper foreign keys
- Add `follower_count` and `following_count` columns to the `users` table
- Create indexes for better query performance
- Set up triggers to automatically update follower counts
- Configure Row Level Security (RLS) policies

### Step 2: Verify Database Setup

Run this query to verify the table was created:

```sql
SELECT * FROM followers LIMIT 1;
SELECT id, username, follower_count, following_count FROM users LIMIT 5;
```

You should see the `followers` table and the new count columns in the `users` table.

## Backend Setup

### Required Dependencies

The following Python packages should already be installed from `create.sh`:

- flask
- supabase
- flask-cors
- python-dotenv

### Environment Variables

Ensure your `.env` file in the `backend` folder contains:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Starting the Backend

```bash
cd backend
.\env\Scripts\Activate.ps1  # On Windows PowerShell
# OR
source env/bin/activate      # On Mac/Linux

python flask_backend.py
```

The backend will run on `http://localhost:5001`

## API Endpoints

The following endpoints have been implemented:

### Follow a User

```
POST /users/<user_id>/follow
Headers: X-User-ID: <current_user_id>
Body: { "user_id": "<current_user_id>" }
Response: { "message": "Successfully followed user", "follower_count": 5, "is_following": true }
```

### Unfollow a User

```
POST /users/<user_id>/unfollow
Headers: X-User-ID: <current_user_id>
Body: { "user_id": "<current_user_id>" }
Response: { "message": "Successfully unfollowed user", "follower_count": 4, "is_following": false }
```

### Check if Following

```
GET /users/<user_id>/is-following?follower_id=<follower_id>
Response: { "is_following": true }
```

### Get Followers List

```
GET /users/<user_id>/followers?limit=50&offset=0
Response: {
  "followers": [
    {
      "user_id": "...",
      "username": "...",
      "profile_picture_url": "...",
      "followed_at": "2024-01-01T00:00:00"
    }
  ],
  "count": 10
}
```

### Get Following List

```
GET /users/<user_id>/following?limit=50&offset=0
Response: {
  "following": [
    {
      "user_id": "...",
      "username": "...",
      "profile_picture_url": "...",
      "followed_at": "2024-01-01T00:00:00"
    }
  ],
  "count": 15
}
```

## Frontend Setup

### Starting the Frontend

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000` or `http://localhost:3001` if port 3000 is in use.

## Testing the Feature

### Manual Testing Steps

#### 1. Create Test Users

1. Register at least 2 users (e.g., `alice` and `bob`)
2. Log in as the first user (`alice`)
3. Navigate to the second user's profile: `http://localhost:3001/bob`

#### 2. Test Follow Functionality

1. **Follow a User:**

   - On Bob's profile, you should see a blue "Follow" button
   - Click the "Follow" button
   - The button should change to "Following" (gray)
   - Bob's follower count should increase by 1

2. **Verify Follow Status:**

   - Refresh the page
   - The button should still show "Following"
   - The follower count should be persistent

3. **Unfollow a User:**
   - Click the "Following" button
   - It should change back to "Follow"
   - Bob's follower count should decrease by 1

#### 3. Test Followers/Following Lists

1. **View Followers:**

   - Click on the "Followers" count button
   - A modal should open showing all followers
   - Each follower should have their username and profile picture
   - Click "View Profile" to navigate to a follower's profile

2. **View Following:**
   - Click on the "Following" count button
   - A modal should open showing all users you're following
   - Each user should be displayed with their profile information

#### 4. Test Edge Cases

1. **Self-Follow Prevention:**

   - Try to visit your own profile
   - You should NOT see a follow button (only "Edit Profile")

2. **Not Logged In:**

   - Log out
   - Visit another user's profile
   - You should NOT see a follow button (login required)

3. **Multiple Follows:**

   - Follow the same user multiple times
   - The system should handle this gracefully (idempotent)

4. **Follow Counts Accuracy:**
   - Create 3+ users
   - Have User A follow Users B and C
   - Have User B follow User A
   - Verify all counts are correct:
     - User A: 1 follower, 2 following
     - User B: 1 follower, 1 following
     - User C: 1 follower, 0 following

### Testing with cURL

You can also test the API directly with cURL:

```bash
# Follow a user
curl -X POST http://localhost:5001/users/USER_ID_TO_FOLLOW/follow \
  -H "Content-Type: application/json" \
  -H "X-User-ID: YOUR_USER_ID" \
  -d '{"user_id": "YOUR_USER_ID"}'

# Unfollow a user
curl -X POST http://localhost:5001/users/USER_ID_TO_UNFOLLOW/unfollow \
  -H "Content-Type: application/json" \
  -H "X-User-ID: YOUR_USER_ID" \
  -d '{"user_id": "YOUR_USER_ID"}'

# Get followers
curl http://localhost:5001/users/USER_ID/followers

# Get following
curl http://localhost:5001/users/USER_ID/following
```

## Troubleshooting

### Backend Issues

1. **"followers" table does not exist:**

   - Make sure you ran the SQL schema in Supabase
   - Check the SQL Editor for any error messages

2. **"follower_count" column not found:**

   - The SQL schema adds these columns
   - If users table existed before, the ALTER TABLE should add them
   - Check with: `SELECT follower_count, following_count FROM users LIMIT 1;`

3. **Permission denied / RLS errors:**
   - Check that RLS policies were created correctly
   - Verify your SUPABASE_ANON_KEY is set correctly
   - May need to adjust RLS policies based on your auth setup

### Frontend Issues

1. **Follow button not appearing:**

   - Make sure you're logged in
   - Make sure you're not on your own profile
   - Check browser console for errors

2. **Counts not updating:**

   - Check that the backend is running
   - Check browser Network tab for API errors
   - Verify the database triggers are working

3. **Modal not opening:**
   - Check browser console for errors
   - Ensure `profileUser?.id` is defined

## Files Modified/Created

### Backend Files

- ✅ `backend/followers_schema.sql` - Database schema
- ✅ `backend/supabase_backend.py` - Added follow/unfollow helper functions
- ✅ `backend/flask_backend.py` - Added API routes

### Frontend Files

- ✅ `frontend/src/app/[username]/page.tsx` - Updated profile page with follow button and counts
- ✅ `frontend/src/components/FollowersModal.tsx` - New component for followers/following lists

## Acceptance Criteria ✅

- ✅ **Given** a logged-in user is viewing another user's profile, **when** they click the "Follow" button, **then** the system should record the follow relationship and change the button to "Following."

- ✅ **Given** a logged-in user is already following another user, **when** they click the "Unfollow" button, **then** the system should remove the relationship and revert the button to "Follow."

- ✅ **Given** a user views a profile page, **when** they click on the "Followers" or "Following" section, **then** they should see an accurate list of users that updates to reflect recent follow or unfollow actions.

## Next Steps / Future Enhancements

1. **Notifications:** Send notifications when someone follows you
2. **Follow Requests:** Add private accounts that require approval
3. **Mutual Follow Badge:** Show a special badge for mutual followers
4. **Feed Filtering:** Show recipes only from users you follow
5. **Follow Recommendations:** Suggest users to follow based on activity
6. **Block Feature:** Allow users to block others

## Support

If you encounter any issues:

1. Check the backend console for errors
2. Check the browser console for frontend errors
3. Verify database schema is correctly applied
4. Ensure all environment variables are set correctly
