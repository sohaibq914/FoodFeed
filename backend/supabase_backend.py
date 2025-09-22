import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

print(f"Supabase URL: {url}")
print(f"Supabase Key exists: {bool(key)}")

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