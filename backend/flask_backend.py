from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase_backend import sign_up_user, sign_in_user, sign_out_user, change_user_password
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

@app.route("/verify-session", methods=["POST"])
def verify_session():
    """Verify if the stored session is still valid"""
    try:
        data = request.get_json()
        user_data = data.get("user")
        
        if not user_data or not user_data.get("id"):
            return jsonify({"error": "Invalid session data"}), 400
        
        from supabase_backend import supabase
        
        result = supabase.table('users').select('*').eq('id', user_data.get("id")).execute()
        
        if result.data:
            user_info = result.data[0]
            return jsonify({
                "valid": True,
                "user": {
                    "id": user_info["id"],
                    "email": user_info["email"],
                    "username": user_info["username"]
                }
            }), 200
        else:
            return jsonify({"valid": False}), 200
            
    except Exception as e:
        print(f"Session verification exception: {str(e)}")
        return jsonify({"valid": False}), 200

@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        print(f"Received registration data: {data}")
        
        email = data.get("email")
        password = data.get("password")
        username = data.get("username")
        
        if not email or not password or not username:
            return jsonify({"error": "Email, password, and username are required"}), 400
        
        result = sign_up_user(email, password, username)
        print(f"Registration result: {result}")
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        if "user" in result:
            return jsonify({
                "message": "User registered successfully", 
                "user": result["user"]
            }), 201
        else:
            return jsonify({"error": "Registration failed"}), 400
            
    except Exception as e:
        print(f"Registration exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        login = data.get("login") # Email or username
        password = data.get("password")
        
        if not login or not password:
            return jsonify({"error": "Login and password are required"}), 400
        
        result = sign_in_user(login, password)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        if "user" in result:
            return jsonify({
                "message": "Login successful",
                "user": result["user"]
            }), 200
        else:
            return jsonify({"error": "Login failed"}), 400
            
    except Exception as e:
        print(f"Login exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/logout", methods=["POST"])
def logout():
    try:
        result = sign_out_user()
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify({"message": "Logout successful"}), 200
    except Exception as e:
        print(f"Logout exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/change-password", methods=["POST"])
def change_password():
    try:
        data = request.get_json()
        email = data.get("email")
        current_password = data.get("currentPassword")
        new_password = data.get("newPassword")
        
        if not email or not current_password or not new_password:
            return jsonify({"error": "Email, current password, and new password are required"}), 400
        
        if len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400
        
        result = change_user_password(email, current_password, new_password)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify({"message": "Password changed successfully"}), 200
        
    except Exception as e:
        print(f"Change password exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True, port=5001)