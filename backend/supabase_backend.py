import os

import boto3
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
storage= "https://ckejrfkzghamajcnryga.storage.supabase.co/storage/v1/s3"
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
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")

supabase: Client = create_client(url, key)

def sign_up_user(email: str, password: str, username: str):
    try:
        print(f"Attempting to register user: {email}, username: {username}")
        
        existing_user = supabase.table('users').select('username').eq('username', username).execute()
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
                "email": email
            }).execute()
            
            print(f"User table insert response: {user_data}")
            
            if user_data.data:
                return {
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "username": username
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
            user_data = supabase.table('users').select('email').eq('username', login).execute()
            if not user_data.data:
                return {"error": "Invalid username or password"}
            
            email = user_data.data[0]['email']
            response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
        
        if response.user:
            user_profile = supabase.table('users').select('username').eq('id', response.user.id).execute()
            if user_profile.data:
                return {
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "username": user_profile.data[0]['username']
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
        res = supabase.table("restaurant").select("id,name,address,owner").order("name").execute()
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
def update_recipe(id: str, author: str, title: str, desc: str, ingredients: str, instructions: str, nutrition, allergens, posting: bool):
    try:
        print(id)
        if id == "new":
            print("new row")
            response = supabase.table('recipes').insert({
            "author_id": author, "title": title, "description": desc, "ingredients": ingredients,
            "instructions": instructions, "nutrition_facts": nutrition, "allergens": allergens, "posted": posting}).execute()
        else:
            print("update")
            response = supabase.table('recipes').upsert({
            "recipe_id": id, "author_id": author, "title": title, "description": desc, "ingredients": ingredients,
            "instructions": instructions, "nutrition_facts": nutrition, "allergens": allergens, "posted": posting}).execute()

        print(f"Recipe upsert response: {response}")

        if response.data:
            print(response.data[0])
            return {"message": "Recipe added", "data": response.data[0]}
        else:
            return {"error": "Failed to add recipe"}

    except Exception as e:
        print(f"Error in update_recipe: {str(e)}")
        return {"error": str(e)}

def get_recipe(id: str):
    try:
        if id:
            if id == "new":
                return {"error": "Recipe not in database"}
            response = supabase.table('recipes').select("*").eq("recipe_id", id).execute()

        print(f"Recipe get response: {response}")

        if response.data:
            print(response.data[0])
            return response.data[0]

        else:
            return {"error": "Failed to get recipe"}

    except Exception as e:
        print(f"Error in get_recipe: {str(e)}")
        return {"error": str(e)}
