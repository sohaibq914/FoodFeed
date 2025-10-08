from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase_backend import sign_up_user, sign_in_user, sign_out_user, change_user_password, add_restaurant, \
    fetch_restaurants, fetch_reviews, create_review, get_r_tags, insert_r_tags, get_all_r_tags
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

@app.route("/create_restaurants", methods=["POST"])
def create_restaurants():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    address = (data.get("address") or "").strip()
    owner = (data.get("owner") or "").strip()

    if not name or not address or not owner:
        return jsonify({"error": "Fields 'name', 'address', and 'owner' are required."}), 400

    created = add_restaurant(name=name, address=address, owner=owner)

    if isinstance(created, dict) and created.get("error"):
        return jsonify({"error": created["error"]}), 400

    return jsonify({"restaurant": created}), 201
@app.route("/restaurants", methods=["GET"])
def list_restaurants():
    rows = fetch_restaurants()
    if "error" in rows:
        return jsonify({"error": rows["error"]}), 400
    return jsonify({"restaurants": rows}), 200

@app.route("/reviews", methods=["GET"])
def reviews_list():
    rid = (request.args.get("restaurant_id") or "").strip()
    if not rid:
        return jsonify({"error": "missing restaurant_id"}), 400
    rows = fetch_reviews(rid)
    if isinstance(rows, dict) and rows.get("error"):
        return jsonify({"error": rows["error"]}), 400
    return jsonify({"reviews": rows}), 200

@app.route("/reviews", methods=["POST"])
def reviews_create():
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        f = request.form
        file = request.files.get("image")

        name_ok = file.filename.lower().endswith(".png")
        type_ok = (file.mimetype or "").lower() == "image/png"
        if not (name_ok and type_ok):
            return jsonify({"error": "Only PNG images are allowed"}), 400

        row = create_review(f.get("restaurant_id"), f.get("author"), f.get("text"), f.get("rating"), file)
    else:
        data = request.get_json(force=True) or {}
        row = create_review(data.get("restaurant_id"), data.get("author"), data.get("text"), data.get("rating"), None)

    if "error" in row:
        return jsonify({"error": row["error"]}), 400
    return jsonify({"review": row}), 201

@app.route("/restaurant_tags", methods=["GET"])
def get_restaurant_tags():
    tag_id = (request.args.get("restaurant_id") or "").strip()
    if not tag_id:
        return jsonify({"error": "missing id"}), 400
    ret = get_r_tags(tag_id)
    if isinstance(ret, dict) and ret.get("error"):
        return jsonify({"error": ret["error"]}), 400
    return jsonify(ret), 200

@app.route("/restaurant_tags_all", methods=["GET"])
def get_all_restaurant_tags():
    ret = get_all_r_tags()
    print(ret)
    if isinstance(ret, dict) and ret.get("error"):
        return jsonify({"error": ret["error"]}), 400
    return jsonify(ret), 200

@app.route("/restaurant_tags", methods=["POST"])
def insert_restaurant_tags():
    data = request.get_json(force=True) or {}
    r_id = (data.get("restaurant_id") or "").strip()
    tags = data.get("tags")

    if not r_id:
        return jsonify({"error": "missing restaurant_id"}), 400
    if not isinstance(tags, list):
        return jsonify({"error": "tags must be an array of strings"}), 400

    tags = [str(t).strip() for t in tags if str(t).strip()]

    ret = insert_r_tags(r_id, tags)
    if isinstance(ret, dict) and ret.get("error"):
        return jsonify({"error": ret["error"]}), 400
    return jsonify({"restaurant_tags": ret}), 201


if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True, port=5001)