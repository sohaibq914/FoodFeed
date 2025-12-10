import os
import time
import uuid

import boto3
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
service_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
storage = "https://ckejrfkzghamajcnryga.storage.supabase.co/storage/v1/s3"
aws = "a5ac34c6e62607b69ce60dd528e8e02d"
secret = "89b422e51e99adeb5a395a744129a6541de257f27fdd8af7e3be991395c63c8a"
BUCKET = "FoodFeed"
region = "us-east-2"
s3 = boto3.client(
    "s3",
    endpoint_url=storage,
    aws_access_key_id=aws,
    aws_secret_access_key=secret,
    region_name=region,
)

print(f"Supabase URL: {url}")
print(f"Supabase Key exists: {bool(key)}")
print(f"Supabase Bucket: {BUCKET}")

if not url or not key:
    raise ValueError(
        "SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")

supabase: Client = create_client(url, key)

admin_supabase: Client = None
if service_key:
    admin_supabase = create_client(url, service_key)
    print("Admin client created successfully")
else:
    print("Warning: SUPABASE_SERVICE_ROLE_KEY not found.")


def sign_up_user(email: str, password: str, username: str):
    try:
        print(f"Attempting to register user: {email}, username: {username}")

        existing_user = supabase.table('users').select(
            'username').eq('username', username).execute()
        if existing_user.data:
            return {"error": "Username already exists"}

        response = supabase.auth.sign_up({
            "email": email,
            "password": password
        })

        print(f"Supabase auth response: {response}")

        if response.user:
            user_data = supabase.table('users').insert({
                "id": response.user.id,
                "username": username,
                "email": email,
                "profile_picture_url": None
            }).execute()

            print(f"User table insert response: {user_data}")

            if user_data.data:
                return {
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "username": username,
                        "isAdmin": False,
                        "profile_picture_url": None
                    },
                    "session": response.session
                }

        return {"error": "Failed to create user profile"}
    except Exception as e:
        print(f"Error in sign_up_user: {str(e)}")
        return {"error": str(e)}


def sign_in_user(login: str, password: str):
    try:
        print(f"Attempting to sign in user: {login}")

        if "@" in login:
            response = supabase.auth.sign_in_with_password({
                "email": login,
                "password": password
            })
        else:
            user_data = supabase.table('users').select(
                'email').eq('username', login).execute()
            if not user_data.data:
                return {"error": "Invalid username or password"}

            email = user_data.data[0]['email']
            response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

        if response.user:
            user_profile = supabase.table('users').select(
                'username, profile_picture_url, isAdmin').eq('id', response.user.id).execute()
            print(user_profile.data[0])
            if user_profile.data:
                return {
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "isAdmin": user_profile.data[0]['isAdmin'],
                        "username": user_profile.data[0]['username'],
                        "profile_picture_url": user_profile.data[0].get('profile_picture_url')
                    },
                    "session": response.session
                }

        return {"error": "Failed to get user profile"}
    except Exception as e:
        print(f"Error in sign_in_user: {str(e)}")
        return {"error": str(e)}


def sign_out_user():
    try:
        response = supabase.auth.sign_out()
        return {"message": "Signed out successfully"}
    except Exception as e:
        print(f"Error in sign_out_user: {str(e)}")
        return {"error": str(e)}


def change_user_password(email: str, current_password: str, new_password: str):
    try:
        print(f"Attempting to change password for user: {email}")

        sign_in_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": current_password
        })

        if not sign_in_response.user:
            return {"error": "Current password is incorrect"}

        update_response = supabase.auth.update_user({
            "password": new_password
        })

        print(f"Password change response: {update_response}")

        if update_response.user:
            supabase.auth.sign_out()
            return {"message": "Password changed successfully"}
        else:
            return {"error": "Failed to change password"}

    except Exception as e:
        print(f"Error in change_user_password: {str(e)}")
        return {"error": str(e)}


def deactivate_user_account(email: str, password: str):
    try:
        print(f"Attempting to deactivate account for user: {email}")

        sign_in_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })

        if not sign_in_response.user:
            return {"error": "Password is incorrect"}

        user_id = sign_in_response.user.id
        print(f"Verified user {user_id} with email {email}")

        try:
            supabase.table('recipes').delete().eq('user_id', user_id).execute()
            print(f"Deleted recipes for user {user_id}")
        except Exception as e:
            print(f"Warning: Could not delete recipes: {e}")

        try:
            supabase.table('comments').delete().eq(
                'user_id', user_id).execute()
            print(f"Deleted comments for user {user_id}")
        except Exception as e:
            print(f"Warning: Could not delete comments: {e}")

        try:
            supabase.table('recipe_likes').delete().eq(
                'user_id', user_id).execute()
            print(f"Deleted likes for user {user_id}")
        except Exception as e:
            print(f"Warning: Could not delete likes: {e}")

        try:
            supabase.table('messages').delete().eq(
                'sender_id', user_id).execute()
            supabase.table('messages').delete().eq(
                'receiver_id', user_id).execute()
            print(f"Deleted messages for user {user_id}")
        except Exception as e:
            print(f"Warning: Could not delete messages: {e}")

        try:
            supabase.table('reviews').delete().eq('user_id', user_id).execute()
            supabase.table('restaurants').delete().eq('owner', email).execute()
            print(f"Deleted restaurants and reviews for user {user_id}")
        except Exception as e:
            print(f"Warning: Could not delete restaurants/reviews: {e}")

        try:
            supabase.table('user_restrictions').delete().eq(
                'user_id', user_id).execute()
            print(f"Deleted dietary restrictions for user {user_id}")
        except Exception as e:
            print(f"Warning: Could not delete dietary restrictions: {e}")

        try:
            supabase.table('users').delete().eq('id', user_id).execute()
            print(f"Deleted user profile for {user_id}")
        except Exception as e:
            print(f"Warning: Could not delete user profile: {e}")

        supabase.auth.sign_out()

        if admin_supabase:
            try:
                admin_response = admin_supabase.auth.admin.delete_user(user_id)
                print(
                    f"Successfully deleted user {user_id} from Supabase Auth")
                return {"message": "Account permanently deleted"}
            except Exception as e:
                print(f"Error deleting user from auth: {e}")
                return {"error": "Failed to completely delete account from authentication system"}
        else:
            # Fallback: Update email to prevent login (if no service role key)
            try:
                sign_in_response = supabase.auth.sign_in_with_password({
                    "email": email,
                    "password": password
                })

                deactivated_email = f"deactivated_{user_id}_{int(time.time())}@deleted.local"
                supabase.auth.update_user({
                    "email": deactivated_email
                })
                supabase.auth.sign_out()
                print(f"Fallback: Updated email to {deactivated_email}")
                return {"message": "Account deactivated (email method)"}
            except Exception as e:
                print(f"Warning: Could not update email: {e}")
                return {"error": "Account data deleted but authentication may still be active"}

    except Exception as e:
        print(f"Error in deactivate_user_account: {str(e)}")
        return {"error": "Failed to deactivate account"}


def add_restaurant(name: str, address: str, owner: str):
    try:
        n, a, o = name.strip(), address.strip(), owner.strip()
        if not n or not a or not o:
            return {"error": "Fields 'name', 'address', and 'owner' are required."}

        res = (
            supabase.table("restaurant")
            .insert({"name": n, "address": a, "owner": o})
            .execute()
        )
        rows = res.data or []
        if not rows:
            return {"error": "Insert failed"}
        return rows[0]
    except Exception as e:
        return {"error": str(e)}


def fetch_restaurants():
    try:
        res = supabase.table("restaurant").select(
            "id,name,address,owner").order("name").execute()
        return res.data
    except Exception as e:
        return {"error": str(e)}


def fetch_reviews(restaurant_id: str):
    try:
        rid = (restaurant_id or "").strip()
        res = (
            supabase.table("restaurant_reviews")
            .select('id,restaurant_id,author,"timestamp",text,rating,image_url')
            .eq("restaurant_id", rid)
            .order("timestamp", desc=True)
            .execute()
        )
        return res.data or []
    except Exception as e:
        return {"error": str(e)}


def create_review(restaurant_id, author, text, rating, image_file):
    try:
        image_url = None
        if image_file:
            key = image_file.filename.lstrip("/")
            data = image_file.read()
            s3.put_object(Bucket=BUCKET, Key=key, Body=data)
            # FIX: missing slash after {url}
            image_url = f"{url}/storage/v1/object/public/{BUCKET}/{key}"

        row = {
            "restaurant_id": (restaurant_id or "").strip(),
            "author": (author or "").strip(),
            "text": (text or "").strip(),
            "rating": int(rating),
        }
        if image_url:
            row["image_url"] = image_url
        if not row["restaurant_id"] or not row["author"] or not row["text"]:
            return {"error": "restaurant_id, author, and text are required"}

        res = supabase.table("restaurant_reviews").insert(row).execute()
        rows = res.data or []
        if not rows:
            return {"error": "Insert failed"}
        return rows[0]
    except Exception as e:
        return {"error": str(e)}


def get_r_tags(row_id):
    if not row_id:
        return {"error": "missing id"}
    try:
        res = (
            supabase.table("restaurant_tags")
            .select("tags")
            .eq("r_id", row_id)
            .execute()
        )
        if not res.data:
            return {"error": "No tags found for this id"}
        return res.data
    except Exception as e:
        return {"error": str(e)}


def get_all_r_tags():
    try:
        res = supabase.table("restaurant_tags").select("tags").execute()
        rows = res.data or []

        seen = set()
        all_tags = []
        for row in rows:
            for tag in (row.get("tags") or []):
                s = str(tag).strip()
                if not s:
                    continue
                key = s.lower()
                if key not in seen:
                    seen.add(key)
                    all_tags.append(s)

        all_tags.sort(key=str.lower)
        return {"tags": all_tags}
    except Exception as e:
        return {"error": str(e)}


def insert_r_tags(restaurant_id, tags):
    if not restaurant_id:
        return {"error": "missing restaurant_id"}
    try:
        payload = {"r_id": restaurant_id, "tags": tags or []}
        res = (
            supabase.table("restaurant_tags")
            .insert(payload)
            .execute()
        )
        rows = res.data or []
        if not rows:
            return {"error": "Insert failed"}
        return rows[0]
    except Exception as e:
        return {"error": str(e)}

# Recipe methods


def update_recipe(id: str, author: str, title: str, desc: str, ingredients, instructions: str, nutrition, allergens,
                  posting: bool, images, tags,  prep_time: int, cook_time: int, visibility: str = 'public'):

    try:
        image_url = None
        has_new_image = False
        if images:
            key = images.filename.lstrip("/")
            data = images.read()
            s3.put_object(Bucket=BUCKET, Key=key, Body=data)
            # FIX: missing slash after {url}
            image_url = f"{url}/storage/v1/object/public/{BUCKET}/{key}"
            has_new_image = True
            print(f"New image uploaded: {image_url}")

        # Validate visibility
        if visibility not in ['public', 'private']:
            visibility = 'public'

        print(f"Recipe ID: {id}")
        if id == "new":
            print("Creating new recipe")
            response = supabase.table('recipes').insert({
                "author_id": author, "title": title, "description": desc, "ingredients": ingredients,
                "instructions": instructions, "nutrition_facts": nutrition, "allergens": allergens,
                "posted": posting, "image": image_url, "visibility": visibility, "tags": tags,
                "prep_time": prep_time, "cook_time": cook_time}).execute()
        else:
            # Verify that user is authorized
            verify = supabase.table('recipes').select(
                'author_id').eq('recipe_id', id).single().execute()
            print(verify)
            if (verify.data['author_id'] != author):
                return {"error": "This account is not the correct author."}

            print(f"Updating existing recipe: {id}")
            # Build update payload - only include image if a new one was uploaded
            update_payload = {
                "recipe_id": id,
                "author_id": author,
                "title": title,
                "description": desc,
                "ingredients": ingredients,
                "instructions": instructions,
                "nutrition_facts": nutrition,
                "allergens": allergens,
                "posted": posting,
                "visibility": visibility,
                "tags": tags,
                "prep_time": prep_time,
                "cook_time": cook_time
            }

            # Only update image if a new one was provided
            if has_new_image:
                update_payload["image"] = image_url

            response = supabase.table('recipes').upsert(
                update_payload).execute()

        print(f"Recipe upsert response: {response}")

        if response.data:
            print(response.data[0])
            return {"message": "Recipe updated successfully", "data": response.data[0]}
        else:
            return {"error": "Failed to update recipe"}

    except Exception as e:
        print(f"Error in update_recipe: {str(e)}")
        return {"error": str(e)}


def get_recipe(id: str, user_id: str = None):
    try:
        if id:
            if id == "new":
                return {"error": "Recipe not in database"}
            response = supabase.table('recipes').select(
                "*, users!recipes_author_id_fkey(username)").eq("recipe_id", id).single().execute()

            print("Full recipe response:", response.data)

            if response.data and "users" in response.data:
                print("Author username:",
                      response.data["users"].get("username"))
            else:
                print("No users.username found")

            # Check privacy/visibility
            recipe_visibility = response.data.get('visibility', 'public')
            recipe_author_id = response.data.get('author_id')

            # If recipe is private, check permissions
            if recipe_visibility == 'private':
                # Author can always view
                if user_id != recipe_author_id:
                    # Check if viewer is a follower
                    if user_id:
                        follow_check = supabase.table('followers').select('id').eq(
                            'follower_id', user_id).eq('following_id', recipe_author_id).execute()
                        if not follow_check.data:
                            return {"error": "This recipe is private. Follow the author to view it.", "private": True}
                    else:
                        return {"error": "This recipe is private. Follow the author to view it.", "private": True}

            # Count likes directly (more reliable than waiting for trigger)
            like_count_result = supabase.table('recipe_likes').select(
                'id', count='exact').eq('recipe_id', id).eq('is_dislike', False).execute()
            like_count = like_count_result.count if like_count_result.count is not None else 0
            # Count dislikes directly (more reliable than waiting for trigger)
            dislike_count_result = supabase.table('recipe_likes').select(
                'id', count='exact').eq('recipe_id', id).eq('is_dislike', True).execute()
            dislike_count = dislike_count_result.count if dislike_count_result.count is not None else 0
            print(
                f"Direct count of likes: {like_count}, dislikes: {dislike_count}")

            response.data['like_count'] = like_count
            response.data['dislike_count'] = dislike_count

            # Check if user has liked this recipe
            if user_id and response.data:
                liked_response = supabase.table('recipe_likes').select(
                    'id').eq('recipe_id', id).eq('user_id', user_id).eq('is_dislike', False).execute()
                response.data['user_has_liked'] = len(liked_response.data) > 0

                disliked_response = supabase.table('recipe_likes').select(
                    'id').eq('recipe_id', id).eq('user_id', user_id).eq('is_dislike', True).execute()
                response.data['user_has_disliked'] = len(
                    disliked_response.data) > 0
            else:
                response.data['user_has_liked'] = False
                response.data['user_has_disliked'] = False

            print("End of get_recipe: ")
            print(response.data)

            return response.data
        else:
            return {"error": "Failed to get recipe"}

    except Exception as e:
        print(f"Error in get_recipe: {str(e)}")
        return {"error": str(e)}


def like_recipe(user_id: str, recipe_id: str, is_dislike: bool):
    """Add a like to a recipe"""
    try:
        print(f"Like attempt - user_id: {user_id}, recipe_id: {recipe_id}")

        # Check if already liked or disliked
        existing = supabase.table('recipe_likes').select('id').eq(
            'user_id', user_id).eq('recipe_id', recipe_id).execute()
        print(f"Existing likes: {existing.data}")

        if existing.data:
            # Check if double-liking or double-disliking
            double = supabase.table('recipe_likes').select('id').eq('user_id', user_id).eq(
                'recipe_id', recipe_id).eq('is_dislike', is_dislike).execute()
            if double.data:
                # Get current like count
                recipe = supabase.table('recipes').select('like_count').eq(
                    'recipe_id', recipe_id).single().execute()
                # Count likes directly (more reliable than waiting for trigger)
                like_count_result = supabase.table('recipe_likes').select(
                    'id', count='exact').eq('recipe_id', recipe_id).eq('is_dislike', False).execute()
                like_count = like_count_result.count if like_count_result.count is not None else 0
                # Count dislikes directly (more reliable than waiting for trigger)
                dislike_count_result = supabase.table('recipe_likes').select(
                    'id', count='exact').eq('recipe_id', recipe_id).eq('is_dislike', True).execute()
                dislike_count = dislike_count_result.count if dislike_count_result.count is not None else 0
                print(
                    f"Direct count of likes: {like_count}, dislikes: {dislike_count}")
                return {"error": "Recipe already liked", "like_count": like_count, "dislike_count": dislike_count, "is_dislike": is_dislike}
            else:
                # Invert like
                response = supabase.table('recipe_likes').update({'is_dislike': is_dislike}).eq(
                    'id', existing.data[0]['id']).execute()
                print(f"Update response: {response.data}")
        else:
            # Insert like
            response = supabase.table('recipe_likes').insert({
                'user_id': user_id,
                'recipe_id': recipe_id,
                'is_dislike': is_dislike
            }).execute()
            print(f"Insert response: {response.data}")

        if response.data:
            # Count likes directly (more reliable than waiting for trigger)
            like_count_result = supabase.table('recipe_likes').select(
                'id', count='exact').eq('recipe_id', recipe_id).eq('is_dislike', False).execute()
            like_count = like_count_result.count if like_count_result.count is not None else 0
            # Count dislikes directly (more reliable than waiting for trigger)
            dislike_count_result = supabase.table('recipe_likes').select(
                'id', count='exact').eq('recipe_id', recipe_id).eq('is_dislike', True).execute()
            dislike_count = dislike_count_result.count if dislike_count_result.count is not None else 0
            print(
                f"Direct count of likes: {like_count}, dislikes: {dislike_count}")

            # Also get the like_count column value to verify trigger
            recipe = supabase.table('recipes').select('like_count').eq(
                'recipe_id', recipe_id).single().execute()
            print(
                f"Like count from column: {recipe.data.get('like_count', 0)}")

            print(response.data)

            return {"message": "Recipe rated", "like_count": like_count, "dislike_count": dislike_count, "is_dislike": response.data[0]['is_dislike']}

        return {"error": "Failed to rated recipe"}

    except Exception as e:
        print(f"Error in like_recipe: {str(e)}")
        return {"error": str(e)}


def unlike_recipe(user_id: str, recipe_id: str):
    """Remove a like from a recipe"""
    try:
        print(f"Unlike attempt - user_id: {user_id}, recipe_id: {recipe_id}")

        # Check if like exists first
        existing = supabase.table('recipe_likes').select('id').eq(
            'user_id', user_id).eq('recipe_id', recipe_id).execute()
        print(f"Existing likes found: {existing.data}")

        if not existing.data:
            return {"error": "Like not found"}

        # Delete the like
        response = supabase.table('recipe_likes').delete().eq(
            'user_id', user_id).eq('recipe_id', recipe_id).execute()
        print(f"Delete response: {response.data}")

        # Count likes directly (more reliable than waiting for trigger)
        like_count_result = supabase.table('recipe_likes').select(
            'id', count='exact').eq('recipe_id', recipe_id).eq('is_dislike', False).execute()
        like_count = like_count_result.count if like_count_result.count is not None else 0
        print(f"Direct count of likes after unlike: {like_count}")
        # Count dislikes directly (more reliable than waiting for trigger)
        dislike_count_result = supabase.table('recipe_likes').select(
            'id', count='exact').eq('recipe_id', recipe_id).eq('is_dislike', True).execute()
        dislike_count = dislike_count_result.count if dislike_count_result.count is not None else 0
        print(
            f"Direct count of likes: {like_count}, dislikes: {dislike_count}")

        # Also get the like_count column value to verify trigger
        recipe = supabase.table('recipes').select('like_count').eq(
            'recipe_id', recipe_id).single().execute()
        print(f"Like count from column: {recipe.data.get('like_count', 0)}")

        print(response.data)

        return {"message": "Recipe unliked", "like_count": like_count, "dislike_count": dislike_count, "is_dislike": response.data[0]['is_dislike']}

    except Exception as e:
        print(f"Error in unlike_recipe: {str(e)}")
        return {"error": str(e)}


def check_recipe_liked(user_id: str, recipe_id: str):
    """Check if a user has liked a specific recipe"""
    try:
        response = supabase.table('recipe_likes').select('id').eq(
            'user_id', user_id).eq('recipe_id', recipe_id).eq('is_dislike', False).execute()
        return {"liked": len(response.data) > 0}
    except Exception as e:
        print(f"Error in check_recipe_liked: {str(e)}")
        return {"error": str(e)}


def get_user_likes(user_id: str):
    """Fetch all recipes liked by a specific user"""
    try:
        print(f"Fetching all likes for user: {user_id}")

        if not user_id:
            return {"error": "Missing user_id"}

        # Join recipe_likes with recipes to get recipe info
        response = (
            supabase.table("recipe_likes")
            .select("recipe_id, recipes!inner(title, author_id, posted)")
            .eq("user_id", user_id)
            .eq("is_dislike", False)
            .execute()
        )

        if not response.data:
            return {"likes": []}

        liked_recipes = [
            {
                "recipe_id": r["recipe_id"],
                "title": r["recipes"]["title"],
                "author_id": r["recipes"]["author_id"],
                "posted": r["recipes"]["posted"]
            }
            for r in response.data
            if r.get("recipes")
        ]

        print(f"Found {len(liked_recipes)} liked recipes.")
        return {"likes": liked_recipes}

    except Exception as e:
        print(f"Error in get_user_likes: {str(e)}")
        return {"error": str(e)}


# Comment methods


def add_comment(recipe_id: str, author_id: str, content: str):
    """Add a comment to a recipe"""
    try:
        print(f"Add comment - recipe_id: {recipe_id}, author_id: {author_id}")

        if not content or not content.strip():
            return {"error": "Comment content cannot be empty"}

        # Insert comment (explicitly set parent_comment_id to None for root comments)
        response = supabase.table('recipe_comments').insert({
            'recipe_id': recipe_id,
            'author_id': author_id,
            'content': content.strip(),
            'parent_comment_id': None
        }).execute()

        print(f"Comment insert response: {response.data}")

        if response.data:
            # Fetch the comment with author username
            comment_id = response.data[0]['comment_id']
            comment = supabase.table('recipe_comments').select(
                '*, users!recipe_comments_author_id_fkey(username, email)'
            ).eq('comment_id', comment_id).single().execute()

            return {"message": "Comment added", "comment": comment.data}

        return {"error": "Failed to add comment"}

    except Exception as e:
        print(f"Error in add_comment: {str(e)}")
        return {"error": str(e)}


def get_comments(recipe_id: str, user_id: str = None):
    """Get all comments for a recipe with replies, sorted by newest first"""
    try:
        print(f"Fetching comments for recipe: {recipe_id}")

        # Fetch all comments (parent and replies)
        response = supabase.table('recipe_comments').select(
            '*, users!recipe_comments_author_id_fkey(username, email)'
        ).eq('recipe_id', recipe_id).order('created_at', desc=False).execute()

        all_comments = response.data

        print(f"All comments raw data: {all_comments}")

        # Separate parents and replies (handle None, null, and missing key)
        parent_comments = [
            c for c in all_comments if not c.get('parent_comment_id')]
        replies = [c for c in all_comments if c.get('parent_comment_id')]

        print(
            f"Parent comments: {len(parent_comments)}, Replies: {len(replies)}")

        # Add like information and replies to each parent comment
        for comment in parent_comments:
            # Get like count and user's like status
            like_count_result = supabase.table('comment_likes').select(
                'id', count='exact').eq('comment_id', comment['comment_id']).execute()
            comment['like_count'] = like_count_result.count if like_count_result.count is not None else 0

            if user_id:
                liked_response = supabase.table('comment_likes').select('id').eq(
                    'comment_id', comment['comment_id']).eq('user_id', user_id).execute()
                comment['user_has_liked'] = len(liked_response.data) > 0
            else:
                comment['user_has_liked'] = False

            # Add replies for this comment
            comment['replies'] = [r for r in replies if r.get(
                'parent_comment_id') == comment['comment_id']]

            # Add like info to each reply
            for reply in comment['replies']:
                like_count_result = supabase.table('comment_likes').select(
                    'id', count='exact').eq('comment_id', reply['comment_id']).execute()
                reply['like_count'] = like_count_result.count if like_count_result.count is not None else 0

                if user_id:
                    liked_response = supabase.table('comment_likes').select('id').eq(
                        'comment_id', reply['comment_id']).eq('user_id', user_id).execute()
                    reply['user_has_liked'] = len(liked_response.data) > 0
                else:
                    reply['user_has_liked'] = False

        # Sort parent comments by newest first
        parent_comments.sort(key=lambda x: x['created_at'], reverse=True)

        print(f"Found {len(parent_comments)} parent comments with replies")

        return {"comments": parent_comments}

    except Exception as e:
        print(f"Error in get_comments: {str(e)}")
        return {"error": str(e)}


def delete_comment(comment_id: str, user_id: str):
    """Delete a comment (only if user is the author)"""
    try:
        print(f"Delete comment - comment_id: {comment_id}, user_id: {user_id}")

        # Check if comment exists and belongs to user
        existing = supabase.table('recipe_comments').select('author_id').eq(
            'comment_id', comment_id).execute()

        if not existing.data:
            return {"error": "Comment not found"}

        if existing.data[0]['author_id'] != user_id:
            return {"error": "Unauthorized: You can only delete your own comments"}

        # Delete the comment
        response = supabase.table('recipe_comments').delete().eq(
            'comment_id', comment_id).execute()

        print(f"Comment deleted: {response.data}")

        return {"message": "Comment deleted successfully"}

    except Exception as e:
        print(f"Error in delete_comment: {str(e)}")
        return {"error": str(e)}

# Comment likes methods


def like_comment(user_id: str, comment_id: str):
    """Add a like to a comment"""
    try:
        print(f"Like comment - user_id: {user_id}, comment_id: {comment_id}")

        # Check if already liked
        existing = supabase.table('comment_likes').select('id').eq(
            'user_id', user_id).eq('comment_id', comment_id).execute()

        if existing.data:
            # Get current like count
            comment = supabase.table('recipe_comments').select('like_count').eq(
                'comment_id', comment_id).single().execute()
            return {"error": "Comment already liked", "like_count": comment.data.get('like_count', 0)}

        # Insert like
        response = supabase.table('comment_likes').insert({
            'user_id': user_id,
            'comment_id': comment_id
        }).execute()

        if response.data:
            # Count likes directly
            like_count_result = supabase.table('comment_likes').select(
                'id', count='exact').eq('comment_id', comment_id).execute()
            like_count = like_count_result.count if like_count_result.count is not None else 0
            print(f"Direct count of comment likes: {like_count}")

            return {"message": "Comment liked", "like_count": like_count}

        return {"error": "Failed to like comment"}

    except Exception as e:
        print(f"Error in like_comment: {str(e)}")
        return {"error": str(e)}


def unlike_comment(user_id: str, comment_id: str):
    """Remove a like from a comment"""
    try:
        print(f"Unlike comment - user_id: {user_id}, comment_id: {comment_id}")

        # Check if like exists
        existing = supabase.table('comment_likes').select('id').eq(
            'user_id', user_id).eq('comment_id', comment_id).execute()

        if not existing.data:
            return {"error": "Like not found"}

        # Delete the like
        response = supabase.table('comment_likes').delete().eq(
            'user_id', user_id).eq('comment_id', comment_id).execute()

        # Count likes directly
        like_count_result = supabase.table('comment_likes').select(
            'id', count='exact').eq('comment_id', comment_id).execute()
        like_count = like_count_result.count if like_count_result.count is not None else 0
        print(f"Direct count of comment likes after unlike: {like_count}")

        return {"message": "Comment unliked", "like_count": like_count}

    except Exception as e:
        print(f"Error in unlike_comment: {str(e)}")
        return {"error": str(e)}


def add_reply(comment_id: str, author_id: str, content: str, recipe_id: str):
    """Add a reply to a comment"""
    try:
        print(
            f"Add reply - parent_comment_id: {comment_id}, author_id: {author_id}")

        if not content or not content.strip():
            return {"error": "Reply content cannot be empty"}

        # Insert reply
        response = supabase.table('recipe_comments').insert({
            'recipe_id': recipe_id,
            'author_id': author_id,
            'content': content.strip(),
            'parent_comment_id': comment_id
        }).execute()

        print(f"Reply insert response: {response.data}")

        if response.data:
            # Fetch the reply with author username
            reply_id = response.data[0]['comment_id']
            reply = supabase.table('recipe_comments').select(
                '*, users!recipe_comments_author_id_fkey(username, email)'
            ).eq('comment_id', reply_id).single().execute()

            return {"message": "Reply added", "reply": reply.data}

        return {"error": "Failed to add reply"}

    except Exception as e:
        print(f"Error in add_reply: {str(e)}")
        return {"error": str(e)}


def get_comment_with_likes(comment_id: str, user_id: str = None):
    """Get a comment with its like status for a user"""
    try:
        # Get like count directly
        like_count_result = supabase.table('comment_likes').select(
            'id', count='exact').eq('comment_id', comment_id).execute()
        like_count = like_count_result.count if like_count_result.count is not None else 0

        # Check if user has liked this comment
        user_has_liked = False
        if user_id:
            liked_response = supabase.table('comment_likes').select('id').eq(
                'comment_id', comment_id).eq('user_id', user_id).execute()
            user_has_liked = len(liked_response.data) > 0

        return {
            "like_count": like_count,
            "user_has_liked": user_has_liked
        }

    except Exception as e:
        print(f"Error in get_comment_with_likes: {str(e)}")
        return {"error": str(e)}


def edit_user_tags(user_id: str, tags):
    try:
        print(tags)
        response = supabase.table('users').update(
            {"dietary_restrictions": tags}).eq("id", user_id).execute()

        print(f"Response: {response}")

        if response.data:
            return {"message": "Restrictions changed successfully"}
        else:
            return {"error": "Failed to change restrictions"}

    except Exception as e:
        print(f"Error in edit_user_tags: {str(e)}")
        return {"error": str(e)}


def get_user_tags(id: str):
    try:
        if id:
            response = supabase.table('users').select(
                "dietary_restrictions").eq("id", id).execute()

            print("Response:", response.data)

            return response.data
        else:
            return {"error": "Failed to get recipe"}

    except Exception as e:
        print(f"Error in get_recipe: {str(e)}")
        return {"error": str(e)}


def upload_profile_picture(user_id: str, file_content: bytes, file_name: str, content_type: str):
    """Upload profile picture to Supabase storage and update user profile"""
    try:
        allowed_types = ['image/jpeg', 'image/jpg',
                         'image/png', 'image/gif', 'image/webp']
        if content_type not in allowed_types:
            return {"error": "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."}

        import uuid
        file_extension = file_name.split(
            '.')[-1] if '.' in file_name else 'jpg'
        unique_filename = f"profile_pictures/{user_id}_{uuid.uuid4().hex}.{file_extension}"

        s3.put_object(
            Bucket=BUCKET,
            Key=unique_filename,
            Body=file_content,
            ContentType=content_type,
            ACL='public-read'
        )

        profile_picture_url = f"https://ckejrfkzghamajcnryga.supabase.co/storage/v1/object/public/{BUCKET}/{unique_filename}"

        update_response = supabase.table('users').update({
            'profile_picture_url': profile_picture_url
        }).eq('id', user_id).execute()

        if update_response.data:
            return {
                "message": "Profile picture uploaded successfully",
                "profile_picture_url": profile_picture_url
            }
        else:
            return {"error": "Failed to update user profile"}

    except Exception as e:
        print(f"Error in upload_profile_picture: {str(e)}")
        return {"error": f"Failed to upload profile picture: {str(e)}"}


def get_user_profile(user_id: str, viewer_id: str = None):
    """Get user profile including profile picture URL, description, and privacy settings"""
    try:
        response = supabase.table('users').select(
            'id, username, email, profile_picture_url, description, follower_count, following_count, profile_visibility').eq('id', user_id).execute()

        if response.data:
            user_data = response.data[0]
            profile_visibility = user_data.get('profile_visibility', 'public')

            # Check if viewer is the owner
            is_owner = viewer_id and viewer_id == user_id

            # If profile is private and viewer is not the owner, return limited info
            if profile_visibility == 'private' and not is_owner:
                return {
                    "user": {
                        "id": user_data['id'],
                        "username": user_data['username'],
                        "profile_visibility": "private"
                    },
                    "is_private": True
                }

            return {"user": user_data, "is_private": False}
        else:
            return {"error": "User not found"}

    except Exception as e:
        print(f"Error in get_user_profile: {str(e)}")
        return {"error": str(e)}


def update_user_description(user_id: str, description: str):
    """Update user profile description"""
    try:
        # Validate description length (optional, but recommended)
        if description and len(description) > 500:
            return {"error": "Description must be 500 characters or less"}

        response = supabase.table('users').update({
            'description': description
        }).eq('id', user_id).execute()

        if response.data:
            return {
                "message": "Description updated successfully",
                "description": description
            }
        else:
            return {"error": "Failed to update description"}

    except Exception as e:
        print(f"Error in update_user_description: {str(e)}")
        return {"error": str(e)}


def get_privacy_settings(user_id: str):
    try:
        response = admin_supabase.table('users').select(
            'profile_visibility'
        ).eq('id', user_id).execute()

        if response.data:
            return {
                "profile_visibility": response.data[0].get('profile_visibility', 'public')
            }
        else:
            return {"error": "User not found"}

    except Exception as e:
        print(f"Error in get_privacy_settings: {str(e)}")
        return {"error": str(e)}


def update_privacy_settings(user_id: str, profile_visibility: str):
    try:
        if profile_visibility not in ['public', 'private']:
            return {"error": "Invalid visibility setting. Must be 'public' or 'private'"}

        response = admin_supabase.table('users').update({
            'profile_visibility': profile_visibility
        }).eq('id', user_id).execute()

        if response.data:
            return {
                "message": "Privacy settings updated successfully",
                "profile_visibility": profile_visibility
            }
        else:
            return {"error": "Failed to update privacy settings"}

    except Exception as e:
        print(f"Error in update_privacy_settings: {str(e)}")
        return {"error": str(e)}


def check_profile_visibility(user_id: str, viewer_id: str = None):
    try:
        response = admin_supabase.table('users').select(
            'profile_visibility'
        ).eq('id', user_id).execute()

        if not response.data:
            return {"visible": False, "reason": "User not found"}

        profile_visibility = response.data[0].get(
            'profile_visibility', 'public')

        if viewer_id and viewer_id == user_id:
            return {"visible": True, "is_owner": True}

        if profile_visibility == 'private':
            return {"visible": False, "reason": "private"}

        return {"visible": True}

    except Exception as e:
        print(f"Error in check_profile_visibility: {str(e)}")
        return {"visible": False, "reason": str(e)}


def validate_social_url(platform: str, url: str):
    """Validate social media URL format"""
    import re

    url_pattern = re.compile(
        r'^https?://'
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'
        r'localhost|'
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        r'(?::\d+)?'
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    if not url_pattern.match(url):
        return False

    platform_patterns = {
        'twitter': [r'twitter\.com/', r'x\.com/'],
        'instagram': [r'instagram\.com/'],
        'facebook': [r'facebook\.com/', r'fb\.com/'],
        'linkedin': [r'linkedin\.com/'],
        'youtube': [r'youtube\.com/', r'youtu\.be/'],
        'tiktok': [r'tiktok\.com/'],
        'github': [r'github\.com/'],
        'website': []
    }

    if platform in platform_patterns and platform != 'website':
        patterns = platform_patterns[platform]
        if not any(re.search(pattern, url, re.IGNORECASE) for pattern in patterns):
            return False

    return True


def add_social_link(user_id: str, platform: str, url: str):
    try:
        valid_platforms = ['twitter', 'instagram', 'facebook', 'linkedin',
                           'youtube', 'tiktok', 'github', 'website']

        if platform not in valid_platforms:
            return {"error": f"Invalid platform. Must be one of: {', '.join(valid_platforms)}"}

        if not validate_social_url(platform, url):
            return {"error": f"Invalid {platform} URL format"}

        existing = admin_supabase.table('social_links').select('id').eq(
            'user_id', user_id).eq('platform', platform).execute()

        if existing.data:
            response = admin_supabase.table('social_links').update({
                'url': url,
                'updated_at': 'now()'
            }).eq('user_id', user_id).eq('platform', platform).execute()
        else:
            response = admin_supabase.table('social_links').insert({
                'user_id': user_id,
                'platform': platform,
                'url': url
            }).execute()

        if response.data:
            return {
                "success": True,
                "message": f"{platform.capitalize()} link added successfully",
                "link": response.data[0]
            }
        else:
            return {"error": "Failed to add social link"}

    except Exception as e:
        print(f"Error in add_social_link: {str(e)}")
        return {"error": str(e)}


def get_social_links(user_id: str):
    try:
        response = admin_supabase.table('social_links').select('*').eq(
            'user_id', user_id).order('created_at').execute()

        return {
            "success": True,
            "links": response.data or []
        }

    except Exception as e:
        print(f"Error in get_social_links: {str(e)}")
        return {"error": str(e)}


def remove_social_link(user_id: str, platform: str):
    try:
        response = admin_supabase.table('social_links').delete().eq(
            'user_id', user_id).eq('platform', platform).execute()

        if response.data:
            return {
                "success": True,
                "message": f"{platform.capitalize()} link removed successfully"
            }
        else:
            return {"error": "Social link not found"}

    except Exception as e:
        print(f"Error in remove_social_link: {str(e)}")
        return {"error": str(e)}


# Follower/Following methods

def follow_user(follower_id: str, following_id: str):
    """Follow a user"""
    try:
        print(
            f"Follow attempt - follower: {follower_id}, following: {following_id}")

        # Validate that users are not the same
        if follower_id == following_id:
            return {"error": "You cannot follow yourself"}

        # Check if already following
        existing = supabase.table('followers').select('id').eq(
            'follower_id', follower_id).eq('following_id', following_id).execute()

        if existing.data:
            return {"error": "Already following this user"}

        # Create follow relationship
        response = supabase.table('followers').insert({
            'follower_id': follower_id,
            'following_id': following_id
        }).execute()

        print(f"Follow insert response: {response.data}")

        if response.data:
            # Get updated follower count
            user = supabase.table('users').select('follower_count').eq(
                'id', following_id).single().execute()
            follower_count = user.data.get('follower_count', 0)

            return {
                "message": "Successfully followed user",
                "follower_count": follower_count
            }

        return {"error": "Failed to follow user"}

    except Exception as e:
        print(f"Error in follow_user: {str(e)}")
        return {"error": str(e)}


def unfollow_user(follower_id: str, following_id: str):
    """Unfollow a user"""
    try:
        print(
            f"Unfollow attempt - follower: {follower_id}, following: {following_id}")

        # Check if follow relationship exists
        existing = supabase.table('followers').select('id').eq(
            'follower_id', follower_id).eq('following_id', following_id).execute()

        if not existing.data:
            return {"error": "Not following this user"}

        # Delete follow relationship
        response = supabase.table('followers').delete().eq(
            'follower_id', follower_id).eq('following_id', following_id).execute()

        print(f"Unfollow delete response: {response.data}")

        # Get updated follower count
        user = supabase.table('users').select('follower_count').eq(
            'id', following_id).single().execute()
        follower_count = user.data.get('follower_count', 0)

        return {
            "message": "Successfully unfollowed user",
            "follower_count": follower_count
        }

    except Exception as e:
        print(f"Error in unfollow_user: {str(e)}")
        return {"error": str(e)}


def check_is_following(follower_id: str, following_id: str):
    """Check if a user is following another user"""
    try:
        response = supabase.table('followers').select('id').eq(
            'follower_id', follower_id).eq('following_id', following_id).execute()

        return {"is_following": len(response.data) > 0}

    except Exception as e:
        print(f"Error in check_is_following: {str(e)}")
        return {"error": str(e)}


def get_followers(user_id: str, limit: int = 50, offset: int = 0):
    """Get list of users following a specific user"""
    try:
        print(f"Getting followers for user: {user_id}")

        # Get followers with user info
        response = supabase.table('followers').select(
            'follower_id, created_at, users!followers_follower_id_fkey(id, username, profile_picture_url)'
        ).eq('following_id', user_id).order('created_at', desc=True).range(offset, offset + limit - 1).execute()

        if not response.data:
            return {"followers": [], "count": 0}

        followers = [
            {
                "user_id": follower['users']['id'],
                "username": follower['users']['username'],
                "profile_picture_url": follower['users'].get('profile_picture_url'),
                "followed_at": follower['created_at']
            }
            for follower in response.data
            if follower.get('users')
        ]

        # Get total count
        count_response = supabase.table('followers').select(
            'id', count='exact').eq('following_id', user_id).execute()
        total_count = count_response.count if count_response.count is not None else 0

        return {"followers": followers, "count": total_count}

    except Exception as e:
        print(f"Error in get_followers: {str(e)}")
        return {"error": str(e)}


def get_following(user_id: str, limit: int = 50, offset: int = 0):
    """Get list of users that a specific user is following"""
    try:
        print(f"Getting following list for user: {user_id}")

        # Get following with user info
        response = supabase.table('followers').select(
            'following_id, created_at, users!followers_following_id_fkey(id, username, profile_picture_url)'
        ).eq('follower_id', user_id).order('created_at', desc=True).range(offset, offset + limit - 1).execute()

        if not response.data:
            return {"following": [], "count": 0}

        following = [
            {
                "user_id": follow['users']['id'],
                "username": follow['users']['username'],
                "profile_picture_url": follow['users'].get('profile_picture_url'),
                "followed_at": follow['created_at']
            }
            for follow in response.data
            if follow.get('users')
        ]

        # Get total count
        count_response = supabase.table('followers').select(
            'id', count='exact').eq('follower_id', user_id).execute()
        total_count = count_response.count if count_response.count is not None else 0

        return {"following": following, "count": total_count}

    except Exception as e:
        print(f"Error in get_following: {str(e)}")
        return {"error": str(e)}


def get_feed_recipes(user_id: str, limit: int = 20, offset: int = 0):
    """Get recipes from users that the current user is following"""
    try:
        print(f"Fetching feed for user: {user_id}")

        # First, get the list of users this user is following
        following_response = supabase.table('followers').select(
            'following_id'
        ).eq('follower_id', user_id).execute()

        if not following_response.data:
            # User is not following anyone, return empty feed
            return {"recipes": [], "count": 0}

        # Extract the user IDs of people being followed
        following_ids = [f['following_id'] for f in following_response.data]

        print(f"User {user_id} is following {len(following_ids)} users")

        # Fetch recipes from followed users (only posted recipes)
        # Include both public and private recipes since user is following them
        recipes_response = supabase.table('recipes').select(
            '*, users!recipes_author_id_fkey(id, username, profile_picture_url)'
        ).in_('author_id', following_ids).eq('posted', True).order(
            'timestamp', desc=True
        ).range(offset, offset + limit - 1).execute()

        # Get total count of recipes in feed
        count_response = supabase.table('recipes').select(
            'recipe_id', count='exact'
        ).in_('author_id', following_ids).eq('posted', True).execute()

        total_count = count_response.count if count_response.count is not None else 0

        # Transform the response to include author info and visibility
        recipes = []
        for recipe in recipes_response.data:
            recipe_data = {
                'recipe_id': recipe['recipe_id'],
                'title': recipe['title'],
                'description': recipe.get('description'),
                'image': recipe.get('image'),
                'timestamp': recipe['timestamp'],
                'like_count': recipe.get('like_count', 0),
                'visibility': recipe.get('visibility', 'public'),
                'author': {
                    'id': recipe['users']['id'],
                    'username': recipe['users']['username'],
                    'profile_picture_url': recipe['users'].get('profile_picture_url')
                }
            }
            recipes.append(recipe_data)

        print(f"Found {len(recipes)} recipes in feed (total: {total_count})")

        return {"recipes": recipes, "count": total_count}

    except Exception as e:
        print(f"Error in get_feed_recipes: {str(e)}")
        return {"error": str(e)}


# Block/Unblock methods

def block_user(blocker_id: str, blocked_id: str):
    """Block a user"""
    try:
        print(f"Block attempt - blocker: {blocker_id}, blocked: {blocked_id}")

        # Validate that users are not the same
        if blocker_id == blocked_id:
            return {"error": "You cannot block yourself"}

        # Check if already blocked
        existing = supabase.table('blocked_users').select('id').eq(
            'blocker_id', blocker_id).eq('blocked_id', blocked_id).execute()

        if existing.data:
            return {"error": "User is already blocked"}

        # Create block relationship
        response = supabase.table('blocked_users').insert({
            'blocker_id': blocker_id,
            'blocked_id': blocked_id
        }).execute()

        print(f"Block insert response: {response.data}")

        if response.data:
            return {"message": "User blocked successfully"}

        return {"error": "Failed to block user"}

    except Exception as e:
        print(f"Error in block_user: {str(e)}")
        return {"error": str(e)}


def unblock_user(blocker_id: str, blocked_id: str):
    """Unblock a user"""
    try:
        print(
            f"Unblock attempt - blocker: {blocker_id}, blocked: {blocked_id}")

        # Check if block relationship exists
        existing = supabase.table('blocked_users').select('id').eq(
            'blocker_id', blocker_id).eq('blocked_id', blocked_id).execute()

        if not existing.data:
            return {"error": "User is not blocked"}

        # Delete block relationship
        response = supabase.table('blocked_users').delete().eq(
            'blocker_id', blocker_id).eq('blocked_id', blocked_id).execute()

        print(f"Unblock delete response: {response.data}")

        return {"message": "User unblocked successfully"}

    except Exception as e:
        print(f"Error in unblock_user: {str(e)}")
        return {"error": str(e)}


def check_is_blocked(user_a_id: str, user_b_id: str):
    """Check if there's a block relationship between two users (either direction)"""
    try:
        # Check if user_a blocked user_b OR user_b blocked user_a
        response = supabase.table('blocked_users').select('id, blocker_id, blocked_id').or_(
            f'and(blocker_id.eq.{user_a_id},blocked_id.eq.{user_b_id}),'
            f'and(blocker_id.eq.{user_b_id},blocked_id.eq.{user_a_id})'
        ).execute()

        if response.data:
            block = response.data[0]
            return {
                "is_blocked": True,
                "blocker_id": block['blocker_id'],
                "blocked_id": block['blocked_id'],
                "you_blocked_them": block['blocker_id'] == user_a_id
            }

        return {"is_blocked": False}

    except Exception as e:
        print(f"Error in check_is_blocked: {str(e)}")
        return {"error": str(e)}


def get_blocked_users(user_id: str, limit: int = 50, offset: int = 0):
    """Get list of users that the current user has blocked"""
    try:
        print(f"Getting blocked users for user: {user_id}")

        # Get blocked users with user info
        response = supabase.table('blocked_users').select(
            'blocked_id, created_at, users!blocked_users_blocked_id_fkey(id, username, profile_picture_url)'
        ).eq('blocker_id', user_id).order('created_at', desc=True).range(offset, offset + limit - 1).execute()

        if not response.data:
            return {"blocked_users": [], "count": 0}

        blocked_users = [
            {
                "user_id": block['users']['id'],
                "username": block['users']['username'],
                "profile_picture_url": block['users'].get('profile_picture_url'),
                "blocked_at": block['created_at']
            }
            for block in response.data
            if block.get('users')
        ]

        # Get total count
        count_response = supabase.table('blocked_users').select(
            'id', count='exact').eq('blocker_id', user_id).execute()
        total_count = count_response.count if count_response.count is not None else 0

        return {"blocked_users": blocked_users, "count": total_count}

    except Exception as e:
        print(f"Error in get_blocked_users: {str(e)}")
        return {"error": str(e)}


# Restaurant review methods

def fetch_restaurant_reviews(restaurant_id: str):
    """
    Return normalized rows for a given restaurant_id (r_id).
    Output keys: id, restaurant_id, author, text, rating
    """
    try:
        res = (
            supabase.table("about_restuarant_review")
            .select("id,r_id,name,text,rating")
            .eq("r_id", restaurant_id)
            .order("id", desc=True)
            .execute()
        )
        rows = res.data or []
        norm = [
            {
                "id": r.get("id"),
                "restaurant_id": r.get("r_id"),
                "author": r.get("name"),
                "text": r.get("text"),
                "rating": r.get("rating"),
            }
            for r in rows
        ]
        return norm
    except Exception as e:
        return {"error": str(e)}


def insert_restaurant_review(restaurant_id: str, author_name: str, body_text: str, rating: int):
    """
    Insert then return a normalized row.
    """
    try:
        payload = {
            "r_id": restaurant_id,
            "name": author_name,
            "text": body_text,
            "rating": int(rating),
        }
        res = supabase.table("about_restuarant_review").insert(
            payload).execute()
        if getattr(res, "error", None):
            return {"error": str(res.error)}
        if not res.data:
            return {"error": "insert failed"}
        r = res.data[0]
        return {
            "id": r.get("id"),
            "restaurant_id": r.get("r_id"),
            "author": r.get("name"),
            "text": r.get("text"),
            "rating": r.get("rating"),
        }
    except Exception as e:
        return {"error": str(e)}


# Notification methods

def get_notifications(user_id: str, limit: int = 50, offset: int = 0, unread_only: bool = False):
    """Get notifications for a user"""
    try:
        print(f"Fetching notifications for user: {user_id}")

        # Build query
        query = supabase.table('notifications').select(
            '*, actor:users!notifications_actor_id_fkey(username, profile_picture_url), recipe:recipes(title)'
        ).eq('user_id', user_id)

        if unread_only:
            query = query.eq('is_read', False)

        response = query.order('created_at', desc=True).range(
            offset, offset + limit - 1).execute()

        # Format notifications
        notifications = []
        for notif in response.data:
            notification_data = {
                'id': notif['id'],
                'type': notif['type'],
                'message': notif.get('message'),
                'is_read': notif['is_read'],
                'created_at': notif['created_at'],
                'actor': {
                    'id': notif['actor_id'],
                    'username': notif['actor']['username'] if notif.get('actor') else 'Unknown',
                    'profile_picture_url': notif['actor'].get('profile_picture_url') if notif.get('actor') else None
                }
            }

            # Add recipe info if present
            if notif.get('recipe_id') and notif.get('recipe'):
                notification_data['recipe'] = {
                    'id': notif['recipe_id'],
                    'title': notif['recipe'].get('title', 'Untitled')
                }

            # Add comment ID if present
            if notif.get('comment_id'):
                notification_data['comment_id'] = notif['comment_id']

            notifications.append(notification_data)

        # Get unread count
        unread_count_response = supabase.table('notifications').select(
            'id', count='exact').eq('user_id', user_id).eq('is_read', False).execute()
        unread_count = unread_count_response.count if unread_count_response.count is not None else 0

        return {
            "notifications": notifications,
            "unread_count": unread_count
        }

    except Exception as e:
        print(f"Error in get_notifications: {str(e)}")
        return {"error": str(e)}


def mark_notification_as_read(notification_id: str, user_id: str):
    """Mark a specific notification as read"""
    try:
        response = supabase.table('notifications').update({
            'is_read': True
        }).eq('id', notification_id).eq('user_id', user_id).execute()

        if response.data:
            return {"message": "Notification marked as read"}
        return {"error": "Notification not found"}

    except Exception as e:
        print(f"Error in mark_notification_as_read: {str(e)}")
        return {"error": str(e)}


def mark_all_notifications_as_read(user_id: str):
    """Mark all notifications as read for a user"""
    try:
        response = supabase.table('notifications').update({
            'is_read': True
        }).eq('user_id', user_id).eq('is_read', False).execute()

        count = len(response.data) if response.data else 0
        return {"message": f"Marked {count} notifications as read", "count": count}

    except Exception as e:
        print(f"Error in mark_all_notifications_as_read: {str(e)}")
        return {"error": str(e)}


def delete_notification(notification_id: str, user_id: str):
    """Delete a specific notification"""
    try:
        response = supabase.table('notifications').delete().eq(
            'id', notification_id).eq('user_id', user_id).execute()

        if response.data:
            return {"message": "Notification deleted"}
        return {"error": "Notification not found"}

    except Exception as e:
        print(f"Error in delete_notification: {str(e)}")
        return {"error": str(e)}


def get_unread_notification_count(user_id: str):
    """Get count of unread notifications"""
    try:
        response = supabase.table('notifications').select(
            'id', count='exact').eq('user_id', user_id).eq('is_read', False).execute()

        count = response.count if response.count is not None else 0
        return {"unread_count": count}

    except Exception as e:
        print(f"Error in get_unread_notification_count: {str(e)}")
        return {"error": str(e)}


def get_notification_preferences(user_id: str):
    """Get user's notification preferences"""
    try:
        response = supabase.table('users').select(
            'notification_preferences').eq('id', user_id).single().execute()

        if response.data:
            prefs = response.data.get('notification_preferences', {
                'likes': True,
                'comments': True,
                'replies': True,
                'follows': True,
                'recipe_updates': True
            })
            return {"preferences": prefs}

        return {"error": "User not found"}

    except Exception as e:
        print(f"Error in get_notification_preferences: {str(e)}")
        return {"error": str(e)}


def update_notification_preferences(user_id: str, preferences: dict):
    """Update user's notification preferences"""
    try:
        # Validate preferences structure
        valid_keys = {'likes', 'comments',
                      'replies', 'follows', 'recipe_updates'}
        prefs = {}

        for key in valid_keys:
            if key in preferences:
                prefs[key] = bool(preferences[key])

        if not prefs:
            return {"error": "No valid preferences provided"}

        # Get current preferences
        current_response = supabase.table('users').select(
            'notification_preferences').eq('id', user_id).single().execute()

        current_prefs = current_response.data.get(
            'notification_preferences', {}) if current_response.data else {}

        # Merge with new preferences
        updated_prefs = {**current_prefs, **prefs}

        # Update in database
        response = supabase.table('users').update({
            'notification_preferences': updated_prefs
        }).eq('id', user_id).execute()

        if response.data:
            return {
                "message": "Notification preferences updated",
                "preferences": updated_prefs
            }

        return {"error": "Failed to update preferences"}

    except Exception as e:
        print(f"Error in update_notification_preferences: {str(e)}")
        return {"error": str(e)}

# Is admin:

def is_admin(user_id: str):
    res = supabase.table('users').select('isAdmin') \
        .eq('id', user_id).execute()
    return res.data[0]['isAdmin']