from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from supabase_backend import sign_up_user, sign_in_user, sign_out_user, change_user_password, update_recipe, get_recipe, add_restaurant, \
    fetch_restaurants, fetch_reviews, create_review, get_r_tags, insert_r_tags, get_all_r_tags
import os
from dotenv import load_dotenv
from functools import wraps

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

        name_ok = file.filename.lower().endswith(".png")
        type_ok = (file.mimetype or "").lower() == "image/png"
        if not (name_ok and type_ok):
            return jsonify({"error": "Only PNG images are allowed"}), 400

        row = create_review(f.get("restaurant_id"), f.get("author"), f.get("text"), f.get("rating"), file)
    else:
        data = request.get_json()
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
    #Reason for isinstance check: return errors with "error" key which I didn't mean to do but oh well
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

        if not author or not title or not desc or not ingredients or not instructions:
            return jsonify({"error": "Missing author, title, description, ingredients, or instructions"}), 400

        if not id:
            id = "new"
        if not posting:
            posting = False

        result = update_recipe(id, author, title, desc, ingredients, instructions, nutrition, allergens, posting)

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

        if not id:
            return jsonify({"error": "Missing recipe id"}), 400

        result = get_recipe(id)

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


if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', debug=True,
                 port=5001, allow_unsafe_werkzeug=True)
