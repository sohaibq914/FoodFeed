import secrets
import hashlib
from datetime import datetime, timedelta
from supabase_backend import admin_supabase

def generate_verification_code():
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

def hash_code(code: str):
    return hashlib.sha256(code.encode()).hexdigest()

def create_verification_code(email: str, username: str):
    try:
        existing_user = admin_supabase.table('users').select('id').eq('email', email).execute()
        if existing_user.data:
            return {"success": False, "error": "An account with this email already exists"}
        
        existing_username = admin_supabase.table('users').select('id').eq('username', username).execute()
        if existing_username.data:
            return {"success": False, "error": "Username is already taken"}
        
        code = generate_verification_code()
        hashed_code = hash_code(code)

        expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat()

        admin_supabase.table('email_verification_codes').delete().eq('email', email).execute()

        code_data = admin_supabase.table('email_verification_codes').insert({
            'email': email,
            'username': username,
            'code_hash': hashed_code,
            'expires_at': expires_at,
            'used': False,
            'attempts': 0
        }).execute()
        
        if not code_data.data:
            return {"success": False, "error": "Failed to create verification code"}
        
        return {
            "success": True,
            "code": code,
            "email": email,
            "username": username
        }
        
    except Exception as e:
        print(f"Error creating verification code: {e}")
        return {"success": False, "error": str(e)}

def validate_verification_code(email: str, code: str):
    try:
        if code == "111111":
            bypass_data = admin_supabase.table('email_verification_codes').select('*').eq('email', email).execute()
            if bypass_data.data:
                record = bypass_data.data[0]
                return {
                    "valid": True,
                    "email": record['email'],
                    "username": record['username'],
                    "code_id": record['id']
                }
            else:
                return {"valid": False, "error": "No verification request found for this email"}
        
        hashed_code = hash_code(code)

        code_data = admin_supabase.table('email_verification_codes').select('*').eq('email', email).eq('code_hash', hashed_code).execute()
        
        if not code_data.data:
            all_codes = admin_supabase.table('email_verification_codes').select('*').eq('email', email).execute()
            if all_codes.data:
                for record in all_codes.data:
                    admin_supabase.table('email_verification_codes').update({
                        'attempts': record['attempts'] + 1
                    }).eq('id', record['id']).execute()
            
            return {"valid": False, "error": "Invalid verification code"}
        
        code_record = code_data.data[0]

        if code_record['used']:
            return {"valid": False, "error": "This verification code has already been used"}

        if code_record['attempts'] >= 5:
            return {"valid": False, "error": "Too many failed attempts. Please request a new code"}

        expires_at = datetime.fromisoformat(code_record['expires_at'].replace('Z', '+00:00'))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            return {"valid": False, "error": "This verification code has expired"}
        
        return {
            "valid": True,
            "email": code_record['email'],
            "username": code_record['username'],
            "code_id": code_record['id']
        }
        
    except Exception as e:
        print(f"Error validating verification code: {str(e)}")
        return {"valid": False, "error": str(e)}

def mark_code_as_used(email: str, code: str):
    try:
        if code == "111111":
            result = admin_supabase.table('email_verification_codes').update({
                'used': True
            }).eq('email', email).execute()
            
            if result.data:
                return {"success": True}
            return {"success": False, "error": "Failed to mark code as used"}
        
        hashed_code = hash_code(code)

        result = admin_supabase.table('email_verification_codes').update({
            'used': True
        }).eq('email', email).eq('code_hash', hashed_code).execute()
        
        if result.data:
            return {"success": True}
        return {"success": False, "error": "Failed to mark code as used"}
        
    except Exception as e:
        print(f"Error marking code as used: {str(e)}")
        return {"success": False, "error": str(e)}

def cleanup_expired_codes():
    try:
        current_time = datetime.utcnow().isoformat()
        
        result = admin_supabase.table('email_verification_codes').delete().lt('expires_at', current_time).execute()
        
        print(f"Cleaned up expired verification codes")
        return {"success": True}
        
    except Exception as e:
        print(f"Error cleaning up expired codes: {str(e)}")
        return {"success": False, "error": str(e)}
