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
                'username, profile_picture_url').eq('id', response.user.id).execute()
            if user_profile.data:
                return {
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
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
            supabase.table('comments').delete().eq('user_id', user_id).execute()
            print(f"Deleted comments for user {user_id}")
        except Exception as e:
            print(f"Warning: Could not delete comments: {e}")
        
        try:
            supabase.table('recipe_likes').delete().eq('user_id', user_id).execute()
            print(f"Deleted likes for user {user_id}")
        except Exception as e:
            print(f"Warning: Could not delete likes: {e}")
        
        try:
            supabase.table('messages').delete().eq('sender_id', user_id).execute()
            supabase.table('messages').delete().eq('receiver_id', user_id).execute()
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
            supabase.table('user_restrictions').delete().eq('user_id', user_id).execute()
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
                print(f"Successfully deleted user {user_id} from Supabase Auth")
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


def update_recipe(id: str, author: str, title: str, desc: str, ingredients: str, instructions: str, nutrition, allergens, posting: bool, images, tags):
    try:
        image_url = None
        if images:
            key = images.filename.lstrip("/")
            data = images.read()
            s3.put_object(Bucket=BUCKET, Key=key, Body=data)
            # FIX: missing slash after {url}
            image_url = f"{url}/storage/v1/object/public/{BUCKET}/{key}"
            print(image_url)

        print(id)
        if id == "new":
            print("new row")
            response = supabase.table('recipes').insert({
                "author_id": author, "title": title, "description": desc, "ingredients": ingredients,
                "instructions": instructions, "nutrition_facts": nutrition, "allergens": allergens, "posted": posting, "image": image_url, "tags": tags}).execute()
        else:
            print("update")
            response = supabase.table('recipes').upsert({
                "recipe_id": id, "author_id": author, "title": title, "description": desc, "ingredients": ingredients,
                "instructions": instructions, "nutrition_facts": nutrition, "allergens": allergens, "posted": posting, "image": image_url, "tags": tags}).execute()

        print(f"Recipe upsert response: {response}")

        if response.data:
            print(response.data[0])
            return {"message": "Recipe added", "data": response.data[0]}
        else:
            return {"error": "Failed to add recipe"}

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

            # Get actual like count from recipe_likes table
            like_count_result = supabase.table('recipe_likes').select(
                'id', count='exact').eq('recipe_id', id).execute()
            actual_like_count = like_count_result.count if like_count_result.count is not None else 0
            response.data['like_count'] = actual_like_count
            print(f"Actual like count for recipe {id}: {actual_like_count}")

            # Check if user has liked this recipe
            if user_id and response.data:
                liked_response = supabase.table('recipe_likes').select(
                    'id').eq('recipe_id', id).eq('user_id', user_id).execute()
                response.data['user_has_liked'] = len(liked_response.data) > 0
            else:
                response.data['user_has_liked'] = False

            return response.data
        else:
            return {"error": "Failed to get recipe"}

    except Exception as e:
        print(f"Error in get_recipe: {str(e)}")
        return {"error": str(e)}


def like_recipe(user_id: str, recipe_id: str):
    """Add a like to a recipe"""
    try:
        print(f"Like attempt - user_id: {user_id}, recipe_id: {recipe_id}")

        # Check if already liked
        existing = supabase.table('recipe_likes').select('id').eq(
            'user_id', user_id).eq('recipe_id', recipe_id).execute()
        print(f"Existing likes: {existing.data}")

        if existing.data:
            # Get current like count
            recipe = supabase.table('recipes').select('like_count').eq(
                'recipe_id', recipe_id).single().execute()
            return {"error": "Recipe already liked", "like_count": recipe.data.get('like_count', 0)}

        # Insert like
        response = supabase.table('recipe_likes').insert({
            'user_id': user_id,
            'recipe_id': recipe_id
        }).execute()
        print(f"Insert response: {response.data}")

        if response.data:
            # Count likes directly (more reliable than waiting for trigger)
            like_count_result = supabase.table('recipe_likes').select(
                'id', count='exact').eq('recipe_id', recipe_id).execute()
            like_count = like_count_result.count if like_count_result.count is not None else 0
            print(f"Direct count of likes: {like_count}")

            # Also get the like_count column value to verify trigger
            recipe = supabase.table('recipes').select('like_count').eq(
                'recipe_id', recipe_id).single().execute()
            print(
                f"Like count from column: {recipe.data.get('like_count', 0)}")

            return {"message": "Recipe liked", "like_count": like_count}

        return {"error": "Failed to like recipe"}

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
            'id', count='exact').eq('recipe_id', recipe_id).execute()
        like_count = like_count_result.count if like_count_result.count is not None else 0
        print(f"Direct count of likes after unlike: {like_count}")

        # Also get the like_count column value to verify trigger
        recipe = supabase.table('recipes').select('like_count').eq(
            'recipe_id', recipe_id).single().execute()
        print(f"Like count from column: {recipe.data.get('like_count', 0)}")

        return {"message": "Recipe unliked", "like_count": like_count}

    except Exception as e:
        print(f"Error in unlike_recipe: {str(e)}")
        return {"error": str(e)}


def check_recipe_liked(user_id: str, recipe_id: str):
    """Check if a user has liked a specific recipe"""
    try:
        response = supabase.table('recipe_likes').select('id').eq(
            'user_id', user_id).eq('recipe_id', recipe_id).execute()
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

def edit_user_tags(user_id: str, tags ):
    try:
        print(tags)
        response = supabase.table('users').update({"dietary_restrictions": tags}).eq("id", user_id).execute()

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
            response = supabase.table('users').select("dietary_restrictions").eq("id", id).execute()

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
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if content_type not in allowed_types:
            return {"error": "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."}

        import uuid
        file_extension = file_name.split('.')[-1] if '.' in file_name else 'jpg'
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


def get_user_profile(user_id: str):
    """Get user profile including profile picture URL"""
    try:
        response = supabase.table('users').select('id, username, email, profile_picture_url').eq('id', user_id).execute()
        
        if response.data:
            return {"user": response.data[0]}
        else:
            return {"error": "User not found"}
            
    except Exception as e:
        print(f"Error in get_user_profile: {str(e)}")
        return {"error": str(e)}

