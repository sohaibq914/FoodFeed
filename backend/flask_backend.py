from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from supabase_backend import sign_up_user, sign_in_user, sign_out_user, change_user_password, deactivate_user_account, update_recipe, get_recipe, add_restaurant, \
    fetch_restaurants, fetch_reviews, create_review, get_r_tags, insert_r_tags, get_all_r_tags, like_recipe, unlike_recipe, check_recipe_liked, \
    add_comment, get_comments, delete_comment, like_comment, unlike_comment, add_reply, edit_user_tags, get_user_tags, get_user_likes, \
    upload_profile_picture, get_user_profile, fetch_restaurant_reviews, insert_restaurant_review
import os
from dotenv import load_dotenv
from functools import wraps
from supabase_access_meal import *
from supabase_access_nutrition import *
from password_reset_handler import create_password_reset_token, validate_reset_token, mark_token_as_used, reset_user_password
from email_service import send_password_reset_email, send_verification_email
from verification_handler import create_verification_code, validate_verification_code, mark_code_as_used

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

# Import supabase client from supabase_backend for messages functionality
try:
    from supabase_backend import supabase
    print("✓ Supabase client imported successfully")
except Exception as e:
    print(f"✗ Failed to import supabase: {e}")
    raise

# Auth decorator for messages routes


def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Try to get user_id from JSON body first
        user_id = None
        if request.is_json:
            data = request.get_json(silent=True)
            if data:
                user_id = data.get('user_id')

        # If not in body, try query parameters
        if not user_id:
            user_id = request.args.get('user_id')

        # If still no user_id, try header
        if not user_id:
            user_id = request.headers.get('X-User-ID')

        if not user_id:
            return jsonify({'error': 'No user_id provided'}), 401

        # Verify user exists in database
        try:
            result = supabase.table('users').select(
                'id').eq('id', user_id).execute()
            if not result.data:
                return jsonify({'error': 'Invalid user'}), 401
            request.current_user_id = user_id
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401
    return decorated_function


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

        result = supabase.table('users').select(
            '*').eq('id', user_data.get("id")).execute()

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
        login = data.get("login")  # Email or username
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


@app.route("/deactivate-account", methods=["POST"])
def deactivate_account():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        result = deactivate_user_account(email, password)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify({"message": "Account deactivated successfully"}), 200

    except Exception as e:
        print(f"Deactivate account exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/upload-profile-picture", methods=["POST"])
def upload_user_profile_picture():
    try:
        if 'profile_picture' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['profile_picture']
        user_id = request.form.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
            return jsonify({"error": "Invalid file type. Only PNG, JPG, JPEG, GIF, and WebP files are allowed"}), 400
        
        file_content = file.read()

        if len(file_content) > 5 * 1024 * 1024:
            return jsonify({"error": "File size too large. Maximum size is 5MB"}), 400
        
        result = upload_profile_picture(user_id, file_content, file.filename, file.content_type)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Upload profile picture exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/<user_id>/profile", methods=["GET"])
def get_user_profile_endpoint(user_id):
    try:
        result = get_user_profile(user_id)
        
        if "error" in result:
            return jsonify({"error": result["error"]}), 404
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Get user profile exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/by-username/<username>", methods=["GET"])
def get_user_by_username(username):
    try:
        from supabase_backend import supabase
        response = supabase.table('users').select('id, username, profile_picture_url').eq('username', username).execute()
        
        if response.data:
            return jsonify({"user": response.data[0]}), 200
        else:
            return jsonify({"error": "User not found"}), 404
            
    except Exception as e:
        print(f"Get user by username exception: {str(e)}")
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
    if "error" in rows:
        return jsonify({"error": rows["error"]}), 400
    return jsonify({"reviews": rows}), 200


@app.route("/reviews", methods=["POST"])
def reviews_create():
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        f = request.form
        file = request.files.get("image")
        if file:
            name_ok = file.filename.lower().endswith(".png")
            type_ok = (file.mimetype or "").lower() == "image/png"
            if not (name_ok and type_ok):
                return jsonify({"error": "Only PNG images are allowed"}), 400

        row = create_review(f.get("restaurant_id"), f.get(
            "author"), f.get("text"), f.get("rating"), file)
    else:
        data = request.get_json()
        row = create_review(data.get("restaurant_id"), data.get(
            "author"), data.get("text"), data.get("rating"), None)

    if "error" in row:
        return jsonify({"error": row["error"]}), 400
    return jsonify({"review": row}), 201


@app.route("/restaurant_tags", methods=["GET"])
def get_restaurant_tags():
    tag_id = (request.args.get("restaurant_id") or "").strip()
    if not tag_id:
        return jsonify({"error": "missing id"}), 400
    ret = get_r_tags(tag_id)
    # Reason for isinstance check: return errors with "error" key which I didn't mean to do but oh well
    if "error" in ret:
        print(ret["error"])
        return jsonify({"error": ret["error"]}), 400
    return jsonify(ret), 200


@app.route("/restaurant_tags_all", methods=["GET"])
def get_all_restaurant_tags():
    ret = get_all_r_tags()
    print(ret)
    if "error" in ret:
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
    if "error" in ret:
        return jsonify({"error": ret["error"]}), 400
    return jsonify({"restaurant_tags": ret}), 201


# ==================== MESSAGES ROUTES ====================

@app.route('/messages/send', methods=['POST'])
@require_auth
def send_message():
    data = request.get_json()

    # Simple validation
    if not data.get('receiver_id') or not data.get('content'):
        return jsonify({'error': 'Missing receiver_id or content'}), 400

    # Insert message
    result = supabase.table('messages').insert({
        'sender_id': request.current_user_id,
        'receiver_id': data['receiver_id'],
        'content': data['content']
    }).execute()

    return jsonify({'success': True, 'message': result.data[0]})


@app.route('/messages/<user_id>', methods=['GET'])
@require_auth
def get_messages(user_id):
    # Get messages between current user and user_id
    messages = supabase.table('messages').select('*').or_(
        # i sent to them
        f'and(sender_id.eq.{request.current_user_id},receiver_id.eq.{user_id}),'
        # they sent to me
        f'and(sender_id.eq.{user_id},receiver_id.eq.{request.current_user_id})'
    ).order('timestamp').execute()

    return jsonify({'messages': messages.data})


@app.route('/messages/conversations', methods=['GET'])
@require_auth
def get_conversations():
    # Get all users except the current user
    all_users = supabase.table('users').select('id, username, email').neq(
        'id', request.current_user_id).execute()

    # Get all messages involving the current user to find last message info
    messages = supabase.table('messages').select('*').or_(
        f'sender_id.eq.{request.current_user_id},'
        f'receiver_id.eq.{request.current_user_id}'
    ).order('timestamp', desc=True).execute()

    # Create a map of user_id to last message info
    last_messages = {}
    for msg in messages.data:
        other_user = msg['receiver_id'] if msg['sender_id'] == request.current_user_id else msg['sender_id']
        if other_user not in last_messages:
            last_messages[other_user] = {
                'content': msg['content'],
                'timestamp': msg['timestamp']
            }

    # Build conversations list with all users
    conversations = []
    for user in all_users.data:
        last_msg = last_messages.get(user['id'], {})
        conversations.append({
            'user_id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'last_message': last_msg.get('content', 'No messages yet'),
            'timestamp': last_msg.get('timestamp', user.get('created_at', ''))
        })

    # Sort by timestamp (most recent first), putting users with no messages at the end
    conversations.sort(
        key=lambda x: x['timestamp'] if x['last_message'] != 'No messages yet' else '', reverse=True)

    return jsonify({'conversations': conversations})


@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')


@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')


@socketio.on('join_conversation')
def handle_join_conversation(data):
    """Join a conversation room for real-time updates"""
    user_id = data.get('user_id')
    other_user_id = data.get('other_user_id')

    if user_id and other_user_id:
        # Create a consistent room name regardless of who joins first
        room = f"chat_{min(user_id, other_user_id)}_{max(user_id, other_user_id)}"
        join_room(room)
        print(f'User {user_id} joined room: {room}')
        emit('joined_conversation', {'room': room, 'status': 'success'})


@socketio.on('send_message')
def handle_send_message(data):
    """Handle message sending via WebSocket"""
    user_id = data.get('user_id')
    receiver_id = data.get('receiver_id')
    content = data.get('content')

    if not user_id or not receiver_id or not content:
        emit('error', {'message': 'Missing required fields'})
        return

    try:
        # Insert message into database
        result = supabase.table('messages').insert({
            'sender_id': user_id,
            'receiver_id': receiver_id,
            'content': content
        }).execute()

        if result.data:
            message = result.data[0]

            # Create room name
            room = f"chat_{min(user_id, receiver_id)}_{max(user_id, receiver_id)}"

            # Broadcast to everyone in the room (including sender)
            emit('new_message', message, room=room)
            print(f'Message sent in room {room}: {content[:50]}...')
    except Exception as e:
        print(f'Error sending message: {str(e)}')
        emit('error', {'message': 'Failed to send message'})


# Recipe handlers
@app.route("/update_recipe", methods=["POST"])
def update_recipe_handler():
    try:
        if request.content_type and request.content_type.startswith("multipart/form-data"):
            print("form")
            f = request.form
            file = request.files.get("image")
            #if file:
                #name_ok = file.filename.lower().endswith(".png")
                #type_ok = (file.mimetype or "").lower() == "image/png"
                #if not (name_ok and type_ok):
                #    return jsonify({"error": "Only PNG images are allowed"}), 400

            id = f.get("recipe_id")
            author = f.get("author")
            title = f.get("title")
            desc = f.get("description")
            ingredients = f.get("ingredients")
            instructions = f.get("instructions")
            nutrition = f.get("nutrition")
            allergens = f.get("allergens")
            posting = f.get("posting")
            images = file
        else:
            print("data")
            data = request.get_json()
            id = data.get("recipe_id")
            author = data.get("author")
            title = data.get("title")
            desc = data.get("description")
            ingredients = data.get("ingredients")
            instructions = data.get("instructions")
            nutrition = data.get("nutrition")
            allergens = data.get("allergens")
            posting = data.get("posting")
            images = None

        if not author or not title or not desc or not ingredients or not instructions:
            return jsonify({"error": "Missing author, title, description, ingredients, or instructions"}), 400

        if not id:
            id = "new"
        if not posting:
            posting = False

        result = update_recipe(
            id, author, title, desc, ingredients, instructions, nutrition, allergens, posting, images)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        print(result)

        return jsonify({"message": "Recipe saved", "recipe_id": result['data']['recipe_id']}), 200

    except Exception as e:
        print(f"Update recipe exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/get_recipe", methods=["POST"])
def get_recipe_handler():
    try:
        data = request.get_json()
        id = data.get("recipe_id")
        # Optional user ID to check if user has liked
        user_id = data.get("user_id")

        if not id:
            return jsonify({"error": "Missing recipe id"}), 400

        result = get_recipe(id, user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200

    except Exception as e:
        print(f"Get recipe exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/recipes", methods=["GET"])
def list_recipes():
    try:
        res = supabase.table("recipes") \
            .select("recipe_id,title,posted") \
            .order("timestamp", desc=True) \
            .execute()

        return jsonify({"recipes": res.data}), 200
    except Exception as e:
        print(f"List recipes exception: {str(e)}")
        return jsonify({"error": "Failed to fetch recipes"}), 500


@app.route("/users/<username>/recipes", methods=["GET"])
def list_recipes_by_username(username):
    """
    Return all recipes (id + title [+ optional description]) for a given username.
    """
    try:
        # 1) Find the user id for this username
        user_res = (
            supabase.table("users")
            .select("id, username")
            .eq("username", username)
            .single()
            .execute()
        )
        if not user_res.data:
            return jsonify({"recipes": [], "userNotFound": True}), 200

        user_id = user_res.data["id"]


        # 2) Fetch that user's recipes
        rec_res = (
            supabase.table("recipes")
            .select("recipe_id, title, description, timestamp, posted")
            .eq("author_id", user_id)
            .order("timestamp", desc=True)
            .execute()
        )



        return jsonify({"recipes": rec_res.data, "username": username}), 200

    except Exception as e:
        print(f"list_recipes_by_username error: {e}")
        return jsonify({"error": "Failed to fetch user's recipes"}), 500
    
@app.route("/recipes/<recipe_id>/draft", methods=["POST"])
@require_auth
def move_to_draft(recipe_id):
    try:
        user_id = request.headers.get("X-User-ID")
        if not user_id:
            return jsonify({"error": "Missing user ID"}), 401

        # Ensure the recipe belongs to this user
        check = (
            supabase.table("recipes")
            .select("author_id")
            .eq("recipe_id", recipe_id)
            .single()
            .execute()
        )

        if not check.data or check.data["author_id"] != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        # Update the recipe: set posted = False
        res = (
            supabase.table("recipes")
            .update({"posted": False})
            .eq("recipe_id", recipe_id)
            .execute()
        )

        return jsonify({"message": "Recipe moved to draft", "data": res.data}), 200

    except Exception as e:
        print(f"move_to_draft error: {e}")
        return jsonify({"error": "Failed to move recipe to draft"}), 500


@app.route("/recipes/<recipe_id>", methods=["DELETE"])
@require_auth
def delete_recipe(recipe_id):
    try:
        # Optional: ensure the recipe belongs to the requester (defense-in-depth
        # even if RLS already enforces it)
        owned = (
            supabase.table("recipes")
            .select("recipe_id, author_id")
            .eq("recipe_id", recipe_id)
            .single()
            .execute()
        )
        if not owned.data:
            return jsonify({"error": "Recipe not found"}), 404
        if owned.data["author_id"] != request.current_user_id:
            return jsonify({"error": "Not authorized"}), 403

        supabase.table("recipes").delete().eq("recipe_id", recipe_id).execute()
        return jsonify({"message": "Recipe deleted"}), 200
    except Exception as e:
        print(f"delete_recipe error: {e}")
        return jsonify({"error": "Failed to delete recipe"}), 500


@app.route("/update_restrictions", methods=["POST"])
def edit_restrictions_handler():
    try:
        data = request.get_json()
        id = data.get("user_id")
        tags = data.get("tags")

        if not id or not tags:
            return jsonify({"error": "Missing id or tags"}), 400

        result = edit_user_tags(id, tags)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200

    except Exception as e:
        print(f"Update dietary restrictions exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/get_restrictions", methods=["POST"])
def get_restrictions_handler():
    try:
        data = request.get_json()
        id = data.get("user_id")

        if not id:
            return jsonify({"error": "Missing id"}), 400

        result = get_user_tags(id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        response = jsonify(result)
        response.headers.add('Access-Control-Allow-Origin', '*')
        print(response)
        return response, 200

    except Exception as e:
        print(f"Get dietary restrictions exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# ==================== RECIPE LIKES ROUTES ====================

@app.route("/recipes/<recipe_id>/like", methods=["POST"])
def like_recipe_handler(recipe_id):
    """Like a recipe"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        result = like_recipe(user_id, recipe_id)

        if "error" in result:
            # If already liked, return 200 with current state
            if result["error"] == "Recipe already liked":
                return jsonify({
                    "message": "Recipe already liked",
                    "like_count": result.get('like_count', 0),
                    "liked": True
                }), 200
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "like_count": result["like_count"],
            "liked": True
        }), 200

    except Exception as e:
        print(f"Like recipe exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/recipes/<recipe_id>/unlike", methods=["POST"])
def unlike_recipe_handler(recipe_id):
    """Unlike a recipe"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        result = unlike_recipe(user_id, recipe_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "like_count": result["like_count"],
            "liked": False
        }), 200

    except Exception as e:
        print(f"Unlike recipe exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/recipes/<recipe_id>/check-like", methods=["GET"])
def check_like_handler(recipe_id):
    """Check if a user has liked a recipe"""
    try:
        user_id = request.args.get("user_id")

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        result = check_recipe_liked(user_id, recipe_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Check like exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/likes", methods=["GET"])
@require_auth
def get_my_likes():
    try:
        user_id = request.current_user_id
        result = get_user_likes(user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        return jsonify(result), 200
    except Exception as e:
        print(f"/likes error: {e}")
        return jsonify({"error": "Failed to fetch likes"}), 500


# ==================== RECIPE COMMENTS ROUTES ====================

@app.route("/recipes/<recipe_id>/comments", methods=["GET"])
def get_comments_handler(recipe_id):
    """Get all comments for a recipe with replies and like information"""
    try:
        user_id = request.args.get("user_id")  # Optional
        result = get_comments(recipe_id, user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get comments exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/recipes/<recipe_id>/comments", methods=["POST"])
def add_comment_handler(recipe_id):
    """Add a comment to a recipe"""
    try:
        data = request.get_json()
        author_id = data.get("author_id")
        content = data.get("content")

        if not author_id:
            return jsonify({"error": "Missing author_id"}), 400

        if not content:
            return jsonify({"error": "Missing content"}), 400

        result = add_comment(recipe_id, author_id, content)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 201

    except Exception as e:
        print(f"Add comment exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/comments/<comment_id>", methods=["DELETE"])
def delete_comment_handler(comment_id):
    """Delete a comment"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        result = delete_comment(comment_id, user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Delete comment exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ==================== COMMENT LIKES ROUTES ====================

@app.route("/comments/<comment_id>/like", methods=["POST"])
def like_comment_handler(comment_id):
    """Like a comment"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        result = like_comment(user_id, comment_id)

        if "error" in result:
            # If already liked, return 200 with current state
            if result["error"] == "Comment already liked":
                return jsonify({
                    "message": "Comment already liked",
                    "like_count": result.get('like_count', 0),
                    "liked": True
                }), 200
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "like_count": result["like_count"],
            "liked": True
        }), 200

    except Exception as e:
        print(f"Like comment exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/comments/<comment_id>/unlike", methods=["POST"])
def unlike_comment_handler(comment_id):
    """Unlike a comment"""
    try:
        data = request.get_json()
        user_id = data.get("user_id")

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        result = unlike_comment(user_id, comment_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "like_count": result["like_count"],
            "liked": False
        }), 200

    except Exception as e:
        print(f"Unlike comment exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ==================== COMMENT REPLIES ROUTES ====================

@app.route("/comments/<comment_id>/reply", methods=["POST"])
def add_reply_handler(comment_id):
    """Add a reply to a comment"""
    try:
        data = request.get_json()
        author_id = data.get("author_id")
        content = data.get("content")
        recipe_id = data.get("recipe_id")

        if not author_id:
            return jsonify({"error": "Missing author_id"}), 400

        if not content:
            return jsonify({"error": "Missing content"}), 400

        if not recipe_id:
            return jsonify({"error": "Missing recipe_id"}), 400

        result = add_reply(comment_id, author_id, content, recipe_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 201

    except Exception as e:
        print(f"Add reply exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


### Get meals
@app.route("/dieting/get_meal_templates", methods=["POST"])
def get_meal_templates():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        templates = get_user_meal_templates(user_id)
        return jsonify({"data": [t.to_json() for t in templates]}), 200
    except Exception as e:
        print(f"Exception templates: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/add_meal_template", methods=["POST"])
def add_meal_template():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        name = data.get("name")
        calories = data.get("calories")
        added_template = add_user_meal_template(user_id, name, calories)
        if not added_template:
            return jsonify({"error": "Name already exists."}), 400
        return jsonify({"result": "Successfully added!"}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/update_meal_template", methods=["POST"])
def update_meal_template():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        old_name = data.get("old_name")
        new_name = data.get("new_name")
        calories = data.get("calories")
        updated_template = update_user_meal_template(user_id, old_name, new_name, calories)
        if not updated_template:
            return jsonify({"error": "Could not update. Maybe check the name?"}), 400
        return jsonify({"result": "Successfully updated!"}), 200        
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/delete_meal_template", methods=["POST"])
def delete_meal_template():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        name = data.get("name")
        deleted_template = delete_meal_template_of_user(user_id, name)
        if not deleted_template:
            return jsonify({"error": "Could not delete."}), 400
        return jsonify({"result": "Successfully deleted!"}), 200        
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/add_meal", methods=["POST"])
def add_user_meal():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        name = data.get("name")
        calories = data.get("calories")
        ate_at = data.get("ate_at")
        meal_id = add_meal(user_id, name, calories, ate_at)
        if meal_id is None:
            return jsonify({"error": "Could not add meal."}), 400
        return jsonify({"result": "Successfully added meal!", "id": meal_id}), 200        
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/delete_meal", methods=["POST"])
def delete_user_meal():
    try:
        data = request.get_json()
        meal_id = data.get("meal_id")
        is_deleted = delete_meal(meal_id)
        if not is_deleted:
            return jsonify({"error": "Could not delete meal."}), 400
        return jsonify({"result": "Successfully deleted meal!"}), 200        
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/get_meals", methods=["POST"])
def get_user_meals():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        meals = get_all_user_meals(user_id)
        averages = get_hour_average(meals)
        res = jsonify({"meals": [meal.to_json() for meal in meals],
                "averages": [str(average) for average in averages]})
        return res, 200        
    except Exception as e:
        print(f"Exception meal: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/get_meal_range", methods=["POST"])
def get_user_meals_range():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        start = data.get("start")
        end = data.get("end")
        meals = get_meals(user_id, start, end)
        averages = get_hour_average(meals)
        return jsonify({"meals": [meal.to_json() for meal in meals],
                "averages": [str(average) for average in averages]}), 200         
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

### Get nutrition
@app.route("/dieting/get_food_items", methods=["POST"])
def get_food_of_type():
    try:
        data = request.get_json()
        type = data.get('type')
        foods = get_food_items(type)
        return jsonify({'foods': [food.to_json() for key, food in foods]}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
 
@app.route("/dieting/add_nutrient_to_user", methods=["POST"])
def add_nutrient_to_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        nutr_id = data.get('nutrient_id')
        amount = data.get('amount')
        add_user_nutrient(user_id, nutr_id, amount)
        return jsonify({"result": "Added nutrient."}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/update_nutrient_amount", methods=["POST"])
def update_nutrient_amount():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        nutr_id = data.get('nutrient_id')
        amount = data.get('amount')
        update_user_nutrient(user_id, nutr_id, amount)
        return jsonify({"result": "Added nutrient."}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/remove_nutrient_from_user", methods=["POST"])
def remove_nutrient_from_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        nutr_id = data.get('nutrient_id')
        remove_user_nutrient(user_id, nutr_id)
        return jsonify({"result": "Removed nutrient"}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/dieting/get_all_nutrients", methods=["POST"])
def get_all_nutrients():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        nutrients = get_nutrients(user_id)
        return jsonify({"nutrients": [nutrient.to_json() for nutrient in nutrients]}), 200
    except Exception as e:
        print(f"Nutr Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/dieting/get_elligible_foods", methods=["POST"])
def get_elligible_foods():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        type = data.get('type')
        foods = get_elligble_foods_type(user_id, type)
        return jsonify({"foods": [food.to_json() for key, food in foods]}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/dieting/get_foods_for_nutrient", methods=["POST"])
def get_food_of_nutrient():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        nutr_id = data.get('nutrient_id')
        foods = get_elligble_foods_nutrient(user_id, nutr_id)
        return jsonify({"foods": [food.to_json() for key, food in foods]}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    


@app.route('/forgot-password', methods=['POST'])
def handle_forgot_password():
    try:
        data = request.json
        if not data or 'email' not in data:
            return jsonify({"error": "Email is required"}), 400
        
        email = data['email']

        result = create_password_reset_token(email)
        
        if not result.get('success'):
            return jsonify({"message": "If an account exists with this email, a reset link will be sent"}), 200

        email_result = send_password_reset_email(
            to_email=result['email'],
            reset_token=result['token'],
            username=result['username']
        )
        
        if not email_result.get('success'):
            print(f"Failed to send email: {email_result.get('error')}")
            return jsonify({"message": "If an account exists with this email, a reset link will be sent"}), 200
        
        return jsonify({"message": "If an account exists with this email, a reset link will be sent"}), 200
        
    except Exception as e:
        print(f"Error in forgot password: {str(e)}")
        return jsonify({"error": "An error occurred processing your request"}), 500


@app.route('/validate-reset-token', methods=['POST'])
def handle_validate_reset_token():
    try:
        data = request.json
        if not data or 'token' not in data:
            return jsonify({"error": "Token is required"}), 400
        
        token = data['token']
        
        result = validate_reset_token(token)
        
        if not result.get('valid'):
            return jsonify({"error": result.get('error', 'Invalid token')}), 400
        
        return jsonify({"message": "Token is valid", "valid": True}), 200
        
    except Exception as e:
        print(f"Error validating token: {str(e)}")
        return jsonify({"error": "An error occurred validating the token"}), 500


@app.route('/reset-password', methods=['POST'])
def handle_reset_password():
    try:
        data = request.json
        if not data or 'token' not in data or 'new_password' not in data:
            return jsonify({"error": "Token and new password are required"}), 400
        
        token = data['token']
        new_password = data['new_password']

        if len(new_password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400

        validation_result = validate_reset_token(token)
        
        if not validation_result.get('valid'):
            return jsonify({"error": validation_result.get('error', 'Invalid or expired token')}), 400
        
        user_id = validation_result['user_id']

        reset_result = reset_user_password(user_id, new_password)
        
        if not reset_result.get('success'):
            return jsonify({"error": reset_result.get('error', 'Failed to reset password')}), 500

        mark_token_as_used(token)
        
        return jsonify({"message": "Password reset successfully"}), 200
        
    except Exception as e:
        print(f"Error resetting password: {str(e)}")
        return jsonify({"error": "An error occurred resetting your password"}), 500

@app.route('/send-verification-code', methods=['POST'])
def handle_send_verification_code():
    try:
        data = request.json
        if not data or 'email' not in data or 'username' not in data:
            return jsonify({"error": "Email and username are required"}), 400
        
        email = data['email']
        username = data['username']

        if '@' not in email:
            return jsonify({"error": "Invalid email format"}), 400

        if len(username) < 3:
            return jsonify({"error": "Username must be at least 3 characters long"}), 400

        result = create_verification_code(email, username)
        
        if not result.get('success'):
            return jsonify({"error": result.get('error', 'Failed to create verification code')}), 400

        email_result = send_verification_email(
            to_email=result['email'],
            verification_code=result['code'],
            username=result['username']
        )
        
        if not email_result.get('success'):
            print(f"Failed to send verification email: {email_result.get('error')}")
            return jsonify({"error": "Failed to send verification email"}), 500
        
        return jsonify({"message": "Verification code sent to your email"}), 200
        
    except Exception as e:
        print(f"Error sending verification code: {str(e)}")
        return jsonify({"error": "An error occurred sending the verification code"}), 500


@app.route('/verify-code', methods=['POST'])
def handle_verify_code():
    try:
        data = request.json
        if not data or 'email' not in data or 'code' not in data:
            return jsonify({"error": "Email and code are required"}), 400
        
        email = data['email']
        code = data['code'].strip()

        if not code.isdigit() or len(code) != 6:
            return jsonify({"error": "Verification code must be 6 digits"}), 400

        result = validate_verification_code(email, code)
        
        if not result.get('valid'):
            return jsonify({"error": result.get('error', 'Invalid verification code')}), 400

        mark_code_as_used(email, code)
        
        return jsonify({
            "message": "Email verified successfully",
            "email": result['email'],
            "username": result['username']
        }), 200
        
    except Exception as e:
        print(f"Error verifying code: {str(e)}")
        return jsonify({"error": "An error occurred verifying the code"}), 500


# Template for HTTP-based API
# Accepts an HTTP request to the url: "[server address]/api_template"
# Takes parameters via JSON
# INPUT - POST
#   parameter_1: int
#   paremeter_2: string
# OUTPUT
#   HTML code - 200 for success, 400 for bad request
#   message: string (contains error message if an error occurs)

@app.route('/api_template', methods=['POST'])
#@login_required
def handle_api_template():
    data = request.json
    if 'parameter_1' in data and 'parameter_2' in data:
        parameter_1 = request.json['parameter_1']
        parameter_2 = request.json['parameter_2']

        my_message = parameter_2 + str(parameter_1)
        return jsonify({"message": my_message}), 200

    return jsonify({"message": "Error: invalid parameters"}), 400

@app.route("/restaurant_reviews", methods=["GET"])
def restaurant_reviews_list():

    rid = (request.args.get("restaurant_id") or "").strip()
    if not rid:
        return jsonify({"error": "missing restaurant_id"}), 400

    rows = fetch_restaurant_reviews(rid)
    if isinstance(rows, dict) and "error" in rows:
        return jsonify({"error": rows["error"]}), 400

    return jsonify({"reviews": rows}), 200


@app.route("/restaurant_reviews", methods=["POST"])
def restaurant_reviews_create():

    data = request.get_json(silent=True) or {}
    rid = (data.get("restaurant_id") or "").strip()
    author = (data.get("author") or "").strip()
    print(author)
    body = (data.get("text") or "").strip()
    rating = data.get("rating")

    if not rid:
        return jsonify({"error": "missing restaurant_id"}), 400

    try:
        rating = int(rating)
    except Exception:
        return jsonify({"error": "rating must be an integer 1..5"}), 400

    if rating < 1 or rating > 5:
        return jsonify({"error": "rating must be between 1 and 5"}), 400

    row = insert_restaurant_review(rid, author, body, rating)
    if isinstance(row, dict) and "error" in row:
        return jsonify({"error": row["error"]}), 400

    return jsonify({"review": row}), 201

@app.route("/restaurant_reviews/average", methods=["GET"])
def restaurant_reviews_average():
    rid = (request.args.get("restaurant_id") or "").strip()
    if not rid:
        return jsonify({"error": "missing restaurant_id"}), 400

    try:
        result = supabase.table("about_restuarant_review") \
            .select("rating") \
            .eq("r_id", rid) \
            .execute()

        rows = result.data or []
        if not rows:
            return jsonify({"avg_rating": None, "count": 0}), 200

        ratings = [r["rating"] for r in rows if isinstance(r.get("rating"), (int, float))]
        if not ratings:
            return jsonify({"avg_rating": None, "count": 0}), 200

        avg = sum(ratings) / len(ratings)
        return jsonify({"avg_rating": round(avg, 2), "count": len(ratings)}), 200

    except Exception as e:
        print("AVG rating error:", e)
        return jsonify({"error": "failed to compute average"}), 500

@app.route("/restaurant_favorites", methods=["POST"])
def add_restaurant_favorite():

    try:
        data = request.get_json() or {}
        print(data)
        restaurant_id = (data.get("restaurant_id") or "").strip()
        user_id = (data.get("user") or "").strip()

        if not restaurant_id or not user_id:
            return jsonify({"error": "Missing restaurant_id or user"}), 400

        res = supabase.table("rest_favs").insert({
            "r_id": restaurant_id,
            "user": user_id
        }).execute()

        return jsonify({"favorite": res.data[0] if res.data else None}), 201

    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500


@app.route("/restaurant_favorites", methods=["GET"])
def list_restaurant_favorites():

    try:
        user_id = (request.args.get("user") or "").strip()
        if not user_id:
            return jsonify({"error": "Missing user"}), 400

        res = supabase.table("rest_favs").select("r_id").eq("user", user_id).execute()
        rows = res.data or []

        return jsonify({"restaurants": [row["r_id"] for row in rows]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/restaurant_favorites", methods=["DELETE"])
def remove_restaurant_favorite():

    try:
        data = request.get_json(force=True) or {}
        restaurant_id = (data.get("restaurant_id") or "").strip()
        user_id = (data.get("user") or "").strip()

        if not restaurant_id or not user_id:
            return jsonify({"error": "Missing restaurant_id or user"}), 400

        res = (
            supabase.table("rest_favs")
            .delete()
            .eq("r_id", restaurant_id)
            .eq("user", user_id)
            .execute()
        )

        return jsonify({"deleted": len(res.data or [])}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/rest_trending/view", methods=["POST"])
def rest_trending_increment_view():

    try:
        data = request.get_json(force=True) or {}
        rid = (data.get("restaurant_id") or "").strip()
        rname = (data.get("name") or "").strip()

        if not rid:
            return jsonify({"error": "restaurant_id is required"}), 400

        existing = (
            supabase.table("rest_trending")
            .select("id,count")
            .eq("r_id", rid)
            .limit(1)
            .execute()
        )

        if existing.data:
            row = existing.data[0]
            new_count = int(row.get("count") or 0) + 1
            updated = (
                supabase.table("rest_trending")
                .update({"count": new_count})
                .eq("r_id", rid)
                .execute()
            )
            out = updated.data[0] if updated.data else {"r_id": rid, "count": new_count, "r_name": rname}
            return jsonify({"trending": out}), 200
        else:
            inserted = (
                supabase.table("rest_trending")
                .insert({"r_id": rid, "r_name": rname, "count": 1})
                .execute()
            )
            out = inserted.data[0] if inserted.data else {"r_id": rid, "r_name": rname, "count": 1}
            return jsonify({"trending": out}), 201

    except Exception as e:
        print(f"/rest_trending/view error: {e}")
        return jsonify({"error": "Failed to increment trending"}), 500


@app.route("/rest_trending", methods=["GET"])
def rest_trending_list():

    try:
        limit = 20

        res = (
            supabase.table("rest_trending")
            .select("r_id,r_name,count")
            .order("count", desc=True)
            .limit(limit)
            .execute()
        )
        return jsonify({"trending": res.data or []}), 200

    except Exception as e:
        print(f"/rest_trending error: {e}")
        return jsonify({"error": "Failed to fetch trending"}), 500



if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', debug=True,
                 port=5001, allow_unsafe_werkzeug=True)