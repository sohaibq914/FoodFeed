import secrets
import hashlib
from datetime import datetime, timedelta
from supabase_backend import admin_supabase

def generate_reset_token():
    return secrets.token_urlsafe(32)

def hash_token(token: str):
    return hashlib.sha256(token.encode()).hexdigest()

def create_password_reset_token(email: str):
    try:
        user_data = admin_supabase.table('users').select('id, username, email').eq('email', email).execute()
        
        if not user_data.data:
            return {"success": True, "message": "If an account exists with this email, a reset link will be sent"}
        
        user = user_data.data[0]
        user_id = user['id']
        username = user['username']

        token = generate_reset_token()
        hashed_token = hash_token(token)

        expires_at = (datetime.utcnow() + timedelta(hours=1)).isoformat()

        admin_supabase.table('password_reset_tokens').delete().eq('user_id', user_id).execute()

        token_data = admin_supabase.table('password_reset_tokens').insert({
            'user_id': user_id,
            'token_hash': hashed_token,
            'expires_at': expires_at,
            'used': False
        }).execute()
        
        if not token_data.data:
            return {"success": False, "error": "Failed to create reset token"}
        
        return {
            "success": True,
            "token": token,
            "user_id": user_id,
            "username": username,
            "email": email
        }
        
    except Exception as e:
        print(f"Error creating password reset token: {e}")
        if hasattr(e, 'message'):
            print(f"Error details: {e.message}")
        return {"success": False, "error": str(e)}

def validate_reset_token(token: str):
    try:
        hashed_token = hash_token(token)

        token_data = admin_supabase.table('password_reset_tokens').select('*').eq('token_hash', hashed_token).execute()
        
        if not token_data.data:
            return {"valid": False, "error": "Invalid or expired reset token"}
        
        token_record = token_data.data[0]

        if token_record['used']:
            return {"valid": False, "error": "This reset link has already been used"}

        expires_at = datetime.fromisoformat(token_record['expires_at'].replace('Z', '+00:00'))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            return {"valid": False, "error": "This reset link has expired"}
        
        return {
            "valid": True,
            "user_id": token_record['user_id'],
            "token_id": token_record['id']
        }
        
    except Exception as e:
        print(f"Error validating reset token: {str(e)}")
        return {"valid": False, "error": str(e)}

def mark_token_as_used(token: str):
    try:
        hashed_token = hash_token(token)

        result = admin_supabase.table('password_reset_tokens').update({
            'used': True
        }).eq('token_hash', hashed_token).execute()
        
        if result.data:
            return {"success": True}
        return {"success": False, "error": "Failed to mark token as used"}
        
    except Exception as e:
        print(f"Error marking token as used: {str(e)}")
        return {"success": False, "error": str(e)}

def reset_user_password(user_id: str, new_password: str):
    try:
        if not admin_supabase:
            return {"success": False, "error": "Admin client not configured"}

        response = admin_supabase.auth.admin.update_user_by_id(
            user_id,
            {"password": new_password}
        )
        
        if response.user:
            print(f"Password successfully reset for user {user_id}")
            return {"success": True, "message": "Password reset successfully"}
        
        return {"success": False, "error": "Failed to reset password"}
        
    except Exception as e:
        print(f"Error resetting password: {str(e)}")
        return {"success": False, "error": str(e)}

def cleanup_expired_tokens():
    try:
        current_time = datetime.utcnow().isoformat()

        result = admin_supabase.table('password_reset_tokens').delete().lt('expires_at', current_time).execute()
        
        print(f"Cleaned up expired tokens")
        return {"success": True}
        
    except Exception as e:
        print(f"Error cleaning up expired tokens: {str(e)}")
        return {"success": False, "error": str(e)}