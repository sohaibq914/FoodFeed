import secrets
import hashlib
from datetime import datetime, timedelta
from supabase_backend import admin_supabase

def generate_mfa_code():
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

def hash_code(code: str):
    return hashlib.sha256(code.encode()).hexdigest()

def create_mfa_code(user_id: str, email: str):
    try:
        code = generate_mfa_code()
        hashed_code = hash_code(code)

        expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat()

        admin_supabase.table('mfa_codes').delete().eq('user_id', user_id).execute()

        code_data = admin_supabase.table('mfa_codes').insert({
            'user_id': user_id,
            'email': email,
            'code_hash': hashed_code,
            'expires_at': expires_at,
            'used': False,
            'attempts': 0
        }).execute()
        
        if not code_data.data:
            return {"success": False, "error": "Failed to create MFA code"}
        
        return {
            "success": True,
            "code": code,
            "email": email
        }
        
    except Exception as e:
        print(f"Error creating MFA code: {e}")
        return {"success": False, "error": str(e)}

def validate_mfa_code(user_id: str, code: str):
    try:
        # TESTING BYPASS
        if code == "111111":
            bypass_data = admin_supabase.table('mfa_codes').select('*').eq('user_id', user_id).execute()
            if bypass_data.data:
                return {"valid": True}
            else:
                return {"valid": False, "error": "No MFA request found"}
        
        hashed_code = hash_code(code)

        code_data = admin_supabase.table('mfa_codes').select('*').eq('user_id', user_id).eq('code_hash', hashed_code).execute()
        
        if not code_data.data:
            all_codes = admin_supabase.table('mfa_codes').select('*').eq('user_id', user_id).execute()
            if all_codes.data:
                for record in all_codes.data:
                    admin_supabase.table('mfa_codes').update({
                        'attempts': record['attempts'] + 1
                    }).eq('id', record['id']).execute()
            
            return {"valid": False, "error": "Invalid MFA code"}
        
        code_record = code_data.data[0]

        if code_record['used']:
            return {"valid": False, "error": "This MFA code has already been used"}

        if code_record['attempts'] >= 5:
            return {"valid": False, "error": "Too many failed attempts. Please request a new code"}

        expires_at = datetime.fromisoformat(code_record['expires_at'].replace('Z', '+00:00'))
        if datetime.utcnow().replace(tzinfo=expires_at.tzinfo) > expires_at:
            return {"valid": False, "error": "This MFA code has expired"}
        
        return {"valid": True, "code_id": code_record['id']}
        
    except Exception as e:
        print(f"Error validating MFA code: {str(e)}")
        return {"valid": False, "error": str(e)}

def mark_mfa_code_as_used(user_id: str, code: str):
    try:
        # TESTING BYPASS
        if code == "111111":
            result = admin_supabase.table('mfa_codes').update({
                'used': True
            }).eq('user_id', user_id).execute()
            
            if result.data:
                return {"success": True}
            return {"success": False, "error": "Failed to mark code as used"}
        
        hashed_code = hash_code(code)
        
        result = admin_supabase.table('mfa_codes').update({
            'used': True
        }).eq('user_id', user_id).eq('code_hash', hashed_code).execute()
        
        if result.data:
            return {"success": True}
        return {"success": False, "error": "Failed to mark code as used"}
        
    except Exception as e:
        print(f"Error marking MFA code as used: {str(e)}")
        return {"success": False, "error": str(e)}

def enable_mfa(user_id: str):
    try:
        result = admin_supabase.table('users').update({
            'mfa_enabled': True
        }).eq('id', user_id).execute()
        
        if result.data:
            return {"success": True, "message": "MFA enabled successfully"}
        return {"success": False, "error": "Failed to enable MFA"}
        
    except Exception as e:
        print(f"Error enabling MFA: {str(e)}")
        return {"success": False, "error": str(e)}

def disable_mfa(user_id: str):
    try:
        result = admin_supabase.table('users').update({
            'mfa_enabled': False
        }).eq('id', user_id).execute()
        
        if result.data:
            admin_supabase.table('mfa_codes').delete().eq('user_id', user_id).execute()
            return {"success": True, "message": "MFA disabled successfully"}
        return {"success": False, "error": "Failed to disable MFA"}
        
    except Exception as e:
        print(f"Error disabling MFA: {str(e)}")
        return {"success": False, "error": str(e)}

def check_mfa_enabled(user_id: str):
    try:
        result = admin_supabase.table('users').select('mfa_enabled').eq('id', user_id).execute()
        
        if result.data:
            return {
                "success": True,
                "mfa_enabled": result.data[0].get('mfa_enabled', False)
            }
        return {"success": False, "error": "User not found"}
        
    except Exception as e:
        print(f"Error checking MFA status: {str(e)}")
        return {"success": False, "error": str(e)}

def cleanup_expired_mfa_codes():
    try:
        current_time = datetime.utcnow().isoformat()
        
        result = admin_supabase.table('mfa_codes').delete().lt('expires_at', current_time).execute()
        
        print(f"Cleaned up expired MFA codes")
        return {"success": True}
        
    except Exception as e:
        print(f"Error cleaning up expired MFA codes: {str(e)}")
        return {"success": False, "error": str(e)}
