from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from supabase_backend import sign_up_user, sign_in_user, sign_out_user, change_user_password, deactivate_user_account, update_recipe, get_recipe, add_restaurant, \
    fetch_restaurants, fetch_reviews, create_review, get_r_tags, insert_r_tags, get_all_r_tags, like_recipe, unlike_recipe, check_recipe_liked, \
    add_comment, get_comments, delete_comment, like_comment, unlike_comment, add_reply, edit_user_tags, get_user_tags, get_user_likes, \
    upload_profile_picture, get_notifications, mark_notification_as_read, mark_all_notifications_as_read, delete_notification, get_unread_notification_count, \
    get_notification_preferences, update_notification_preferences, get_user_profile, update_user_description, add_social_link, get_social_links, remove_social_link, \
    follow_user, unfollow_user, check_is_following, get_followers, get_following, get_feed_recipes, \
    block_user, unblock_user, check_is_blocked, get_blocked_users, fetch_restaurant_reviews, insert_restaurant_review, \
    is_admin, insert_restaurant_review_draft, fetch_about_restaurant_review_drafts_for_user, fetch_restaurants_by_ids, fetch_unapproved_restaurants
import os
from dotenv import load_dotenv
from functools import wraps
from supabase_access_meal import *
from supabase_access_nutrition import *
from supabase_meal_planner import *
from supabase_create_food import *
from supabase_restrictions import *
from password_reset_handler import create_password_reset_token, validate_reset_token, mark_token_as_used, reset_user_password
from email_service import send_password_reset_email, send_verification_email, send_mfa_code_email
from verification_handler import create_verification_code, validate_verification_code, mark_code_as_used
from mfa_handler import create_mfa_code, validate_mfa_code, mark_mfa_code_as_used, enable_mfa, disable_mfa, check_mfa_enabled
import math
import json
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

# Admin status


@app.route("/is_admin", methods=["GET"])
def get_admin_status():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        return jsonify({"recipes": is_admin(user_id)}), 200
    except Exception as e:
        print(f"Admin exception: {str(e)}")
        return jsonify({"error": "Failed to get admin status."}), 500

@app.route("/is_admin", methods=["POST"])
def get_is_admin():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        return jsonify(is_admin(user_id)), 200
    except Exception as e:
        print(f"Admin exception: {str(e)}")
        return jsonify({"error": "Failed to get admin status."}), 500
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
        mfa_code = data.get("mfa_code")

        if not login or not password:
            return jsonify({"error": "Login and password are required"}), 400

        result = sign_in_user(login, password)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        if "user" in result:
            user = result["user"]

            mfa_status = check_mfa_enabled(user["id"])

            if mfa_status.get("success") and mfa_status.get("mfa_enabled"):
                if not mfa_code:
                    code_result = create_mfa_code(user["id"], user["email"])

                    if code_result.get("success"):
                        email_result = send_mfa_code_email(
                            user["email"],
                            code_result["code"],
                            user["username"]
                        )

                        if email_result.get("success"):
                            return jsonify({
                                "mfa_required": True,
                                "message": "MFA code sent to your email",
                                "user_id": user["id"]
                            }), 200
                        else:
                            return jsonify({"error": "Failed to send MFA code"}), 500
                    else:
                        return jsonify({"error": "Failed to generate MFA code"}), 500
                else:
                    validation_result = validate_mfa_code(user["id"], mfa_code)

                    if validation_result.get("valid"):
                        mark_mfa_code_as_used(user["id"], mfa_code)
                        return jsonify({
                            "message": "Login successful",
                            "user": user
                        }), 200
                    else:
                        return jsonify({
                            "error": validation_result.get("error", "Invalid MFA code"),
                            "mfa_required": True,
                            "user_id": user["id"]
                        }), 400
            else:
                return jsonify({
                    "message": "Login successful",
                    "user": user
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


@app.route("/mfa/enable", methods=["POST"])
def enable_mfa_endpoint():
    try:
        user_id = request.headers.get('X-User-ID')

        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        result = enable_mfa(user_id)

        if result.get("success"):
            return jsonify({"message": result["message"]}), 200
        else:
            return jsonify({"error": result.get("error", "Failed to enable MFA")}), 400

    except Exception as e:
        print(f"Enable MFA exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/mfa/disable", methods=["POST"])
def disable_mfa_endpoint():
    try:
        user_id = request.headers.get('X-User-ID')

        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        result = disable_mfa(user_id)

        if result.get("success"):
            return jsonify({"message": result["message"]}), 200
        else:
            return jsonify({"error": result.get("error", "Failed to disable MFA")}), 400

    except Exception as e:
        print(f"Disable MFA exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/mfa/status", methods=["GET"])
def check_mfa_status():
    try:
        user_id = request.headers.get('X-User-ID')

        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        result = check_mfa_enabled(user_id)

        if result.get("success"):
            return jsonify({"mfa_enabled": result["mfa_enabled"]}), 200
        else:
            return jsonify({"error": result.get("error", "Failed to check MFA status")}), 400

    except Exception as e:
        print(f"Check MFA status exception: {str(e)}")
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

        result = upload_profile_picture(
            user_id, file_content, file.filename, file.content_type)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Upload profile picture exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/<user_id>/profile", methods=["GET"])
def get_user_profile_endpoint(user_id):
    try:
        # Get the viewer's ID from headers (if authenticated)
        viewer_id = request.headers.get('X-User-ID')

        result = get_user_profile(user_id, viewer_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 404

        return jsonify(result), 200

    except Exception as e:
        print(f"Get user profile exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/<user_id>/description", methods=["PUT"])
def update_user_description_endpoint(user_id):
    try:
        data = request.get_json()
        description = data.get('description', '')

        # Verify the user is updating their own description
        requesting_user_id = request.headers.get('X-User-ID')
        if requesting_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        result = update_user_description(user_id, description)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Update user description exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/<user_id>/social-links", methods=["GET"])
def get_user_social_links(user_id):
    try:
        result = get_social_links(user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get social links exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/<user_id>/social-links", methods=["POST"])
def add_user_social_link(user_id):
    try:
        requesting_user_id = request.headers.get('X-User-ID')
        if requesting_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        platform = data.get('platform')
        url = data.get('url')

        if not platform or not url:
            return jsonify({"error": "Platform and URL are required"}), 400

        result = add_social_link(user_id, platform, url)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Add social link exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/<user_id>/social-links/<platform>", methods=["DELETE"])
def delete_user_social_link(user_id, platform):
    try:
        requesting_user_id = request.headers.get('X-User-ID')
        if requesting_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        result = remove_social_link(user_id, platform)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Remove social link exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/<user_id>/privacy", methods=["GET"])
def get_user_privacy_settings(user_id):
    try:
        from supabase_backend import get_privacy_settings

        requesting_user_id = request.headers.get('X-User-ID')
        if requesting_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        result = get_privacy_settings(user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get privacy settings exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/<user_id>/privacy", methods=["PUT"])
def update_user_privacy_settings(user_id):
    try:
        from supabase_backend import update_privacy_settings

        requesting_user_id = request.headers.get('X-User-ID')
        if requesting_user_id != user_id:
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        profile_visibility = data.get('profile_visibility')

        if not profile_visibility:
            return jsonify({"error": "profile_visibility is required"}), 400

        result = update_privacy_settings(user_id, profile_visibility)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Update privacy settings exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/user/by-username/<username>", methods=["GET"])
def get_user_by_username(username):
    try:
        from supabase_backend import supabase
        viewer_id = request.headers.get('X-User-ID')

        response = supabase.table('users').select(
            'id, username, profile_picture_url, description, profile_visibility').eq('username', username).execute()

        if response.data:
            user_data = response.data[0]
            profile_visibility = user_data.get('profile_visibility', 'public')
            is_owner = viewer_id and viewer_id == user_data['id']

            if profile_visibility == 'private' and not is_owner:
                return jsonify({
                    "user": {
                        "id": user_data['id'],
                        "username": user_data['username'],
                        "profile_visibility": "private"
                    },
                    "is_private": True
                }), 200

            return jsonify({"user": user_data, "is_private": False}), 200
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
    u_id = (data.get("u_id") or "").strip()

    if not name or not address or not owner:
        return jsonify({"error": "Fields 'name', 'address', and 'owner' are required."}), 400

    created = add_restaurant(name=name, address=address, owner=owner, u_id=u_id)

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
@app.route("/recipe_by_ingredient", methods=["POST"])
def handle_recipe_by_ingredient():
    try:
        limit = 5
        data = request.get_json()
        search_ingredient = data.get("ingredient")
        print(search_ingredient)
        res = supabase.table('recipes').select(
            "*").neq('ingredients', 'null').eq("posted", True).order('views', desc=True).execute()

        recipes = []
        for recipe in res.data:
            #if (recipe.ingredients)
            parsed_recipe = json.loads(recipe['ingredients'])
            print(parsed_recipe)
            added = False
            for ingredient in parsed_recipe:
                if (not added and (ingredient.get('name').lower() == search_ingredient.lower())):
                    print(ingredient.get('name'))
                    added = True
                    recipes.append(recipe)

        print(recipes)

        return jsonify({"recipes": recipes}), 200
    except Exception as e:
        print(f"List recipes exception: {str(e)}")
        return jsonify({"error": "Failed to fetch recipes"}), 500

@app.route("/view_recipe", methods=["POST"])
def view_recipe_handler():
    try:
        data = request.get_json()

        id = data.get("recipe_id")

        if not id:
            return jsonify({"error": "no recipe provided"}), 400

        result = supabase.table('recipes').select("views")\
            .eq("recipe_id", id).single().execute()
        if "error" in result:
            return jsonify({"error": result["error"]}), 400
        else:
            print(result.data["views"])

            result = supabase.table('recipes').update({"views": result.data["views"]+1}) \
                .eq("recipe_id", id).execute()
            if "error" in result:
                return jsonify({"error": result["error"]}), 400
            return jsonify({"message": "Recipe view incremented"}), 200
    except Exception as e:
        print(f"View recipe exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/update_recipe", methods=["POST"])
def update_recipe_handler():
    try:
        if request.content_type and request.content_type.startswith("multipart/form-data"):
            print("form")
            f = request.form
            file = request.files.get("image")

            id = f.get("recipe_id")
            author = f.get("author")
            title = f.get("title")
            desc = f.get("description")
            ingredients = f.get("ingredients")
            instructions = f.get("instructions")
            nutrition = f.get("nutrition")
            allergens = f.get("allergens")
            posting = f.get("posting")
            visibility = f.get("visibility", "public")
            images = file
            tags = f.get("tags")
            prep_time = f.get("prep_time")
            cook_time = f.get("cook_time")
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
            visibility = data.get("visibility", "public")
            images = None
            tags = data.get("tags")

            prep_time = data.get("prep_time")
            cook_time = data.get("cook_time")

        if not author or not title or not desc or not ingredients or not instructions:
            return jsonify({"error": "Missing author, title, description, ingredients, or instructions"}), 400

        if not id:
            id = "new"
        if not posting:
            posting = False
        if not visibility:
            visibility = "public"

        result = update_recipe(id, author, title, desc, ingredients, instructions,
                               nutrition, allergens, posting, images, tags,
                               prep_time, cook_time, visibility)

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
        #TODO: optimize, make get_recipe unnecessary

        limit = 5
        res = (
            supabase.table("recipes")
            # include it (quoted is safest)
            .select('recipe_id,title,posted,"timestamp",tags,views', count='exact')
            .eq("posted", True)
            .order("timestamp", desc=True)
            .execute()
        )

        page_count = math.ceil(res.count / limit)
        res.count = page_count

        print(res)
        print("pages:" + str(res.count))
        return jsonify({"recipes": res.data, "count": res.count}), 200
    except Exception as e:
        print(f"List recipes exception: {str(e)}")
        return jsonify({"error": "Failed to fetch recipes"}), 500

@app.route("/search_recipes", methods=["POST"])
def search_recipes():
    try:
        limit = 5
        data = request.get_json()
        search_string = data.get("search_string")
        res = (supabase
               .rpc('search_recipes', {'search_query': search_string}, count='exact')
               .eq("posted", True)
               .order("ts", desc=True)
               .execute())

        print(res)

        page_count = math.ceil(res.count / limit)
        res.count = page_count

        #print(res)
        #print("pages:" + str(res.count))
        return jsonify({"recipes": res.data, "count": res.count}), 200
    except Exception as e:
        print(f"List recipes exception: {str(e)}")
        return jsonify({"error": "Failed to fetch recipes"}), 500


@app.route("/feed", methods=["GET"])
@require_auth
def get_feed():
    """Get feed of recipes from users that the current user follows"""
    try:
        user_id = request.current_user_id
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))

        result = get_feed_recipes(user_id, limit, offset)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get feed exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/users/<username>/recipes", methods=["GET"])
def list_recipes_by_username(username):
    """
    Return all recipes (id + title [+ optional description]) for a given username.
    Filters private recipes based on follower status.
    """
    try:
        # Get viewer's user ID (if authenticated)
        viewer_id = request.headers.get(
            'X-User-ID') or request.args.get('viewer_id')

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

        profile_user_id = user_res.data["id"]

        # 2) Fetch that user's recipes
        rec_res = (
            supabase.table("recipes")
            .select("recipe_id, title, description, timestamp, posted, visibility")
            .eq("author_id", profile_user_id)
            .order("timestamp", desc=True)
            .execute()
        )

        # 3) Filter recipes based on privacy and viewer permissions
        filtered_recipes = []
        is_follower = False

        # Check if viewer is following the profile owner
        if viewer_id and viewer_id != profile_user_id:
            follow_check = supabase.table('followers').select('id').eq(
                'follower_id', viewer_id).eq('following_id', profile_user_id).execute()
            is_follower = len(follow_check.data) > 0

        for recipe in rec_res.data:
            # Owner can see all their recipes
            if viewer_id == profile_user_id:
                filtered_recipes.append(recipe)
            # Public recipes visible to all
            elif recipe.get('visibility', 'public') == 'public':
                filtered_recipes.append(recipe)
            # Private recipes only visible to followers
            elif recipe.get('visibility') == 'private' and is_follower:
                filtered_recipes.append(recipe)
            # Otherwise skip this recipe

        return jsonify({"recipes": filtered_recipes, "username": username}), 200

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
        is_dislike = data.get("is_dislike")

        print(is_dislike)

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
        if not is_dislike:
            is_dislike = False

        result = like_recipe(user_id, recipe_id, is_dislike)
        print(result)

        if "error" in result:
            # If already liked, return 200 with current state
            if result["error"] == "Recipe already liked":
                return jsonify({
                    "message": "Recipe already liked",
                    "like_count": result.get('like_count', 0),
                    "dislike_count": result.get('dislike_count', 0),
                    "liked": (not result.get('is_dislike')),
                    "disliked": result.get('is_dislike')
                }), 200
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "like_count": result["like_count"],
            "dislike_count": result['dislike_count'],
            "liked": (not result['is_dislike']),
            "disliked": result['is_dislike']
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
        print(result)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "like_count": result["like_count"],
            "dislike_count": result['dislike_count'],
            "liked": False,
            "disliked": False
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

# Update restrictions
@app.route("/settings/get_restrictions", methods=["POST"])
def get_all_restrictions():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        res = get_restrictions(user_id)
        print(res)
        vals = []
        for value in res.values():
            vals.append(value.to_json())
        return jsonify({"data": vals}), 200
    except Exception as e:
        print(f"Exception with getting restrictions: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/settings/add_restriction", methods=["POST"])
def add_a_restriction():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        restr_id = data.get("restr_id")
        add_restriction(user_id, restr_id)
        return jsonify({"result": "Successfully added!"}), 200
    except Exception as e:
        print(f"Exception with adding restrictions: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/settings/remove_restriction", methods=["POST"])
def remove_a_restriction():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        restr_id = data.get("restr_id")
        remove_restriction(user_id, restr_id)
        return jsonify({"result": "Successfully removed!"}), 200
    except Exception as e:
        print(f"Exception with removing restrictions: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    

# Get meals
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
        updated_template = update_user_meal_template(
            user_id, old_name, new_name, calories)
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
        loaded = data.get("loaded")
        amount = 2
        meals = get_all_user_meals(user_id)
        sent_meals = []
        averages = get_hour_average(meals)
        for i in range(loaded, min(loaded + amount, len(meals))):
            sent_meals.append(meals[i].to_json())
        res = jsonify({"meals": sent_meals,
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
        loaded = data.get("loaded")
        amount = 2
        meals = get_meals(user_id, start, end)
        print(meals)
        sent_meals = []
        averages = get_hour_average(meals)
        for i in range(loaded, min(loaded + amount, len(meals))):
            sent_meals.append(meals[i].to_json())
        return jsonify({"meals": sent_meals,
                        "averages": [str(average) for average in averages]}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# Get nutrition

def sort_by_favorite(food):
    return 0 if food.favorite else 1

def sort_by_name(food):
    return food.name

@app.route("/dieting/get_food_items", methods=["POST"])
def get_food_of_type():
    try:
        data = request.get_json()
        type = data.get('type')
        user_id = data.get('user_id')
        query = data.get('query')
        loaded = data.get("loaded")
        amount = 2
        foods = get_food_items(user_id, type, query)
        foods.sort(reverse=False, key= lambda x: (sort_by_favorite(x), sort_by_name(x)))
        sent_foods = []
        for i in range(loaded, min(loaded + amount, len(foods))):
            sent_foods.append(foods[i].to_json())
        return jsonify({'foods': sent_foods}), 200
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
        query = data.get('query')
        loaded = data.get("loaded")
        amount = 2
        foods = get_elligble_foods_type(user_id, type, query)
        foods.sort(reverse=False, key= lambda x: (sort_by_favorite(x), sort_by_name(x)))
        sent_foods = []
        for i in range(loaded, min(loaded + amount, len(foods))):
            sent_foods.append(foods[i].to_json())
        return jsonify({"foods": sent_foods}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/dieting/get_all_elligible_foods", methods=["POST"])
def get_all_elligible_foods():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        type = data.get('type')
        query = data.get('query')
        foods = get_elligble_foods_type(user_id, type, query)
        foods.sort(reverse=False, key= lambda x: (sort_by_favorite(x), sort_by_name(x)))
        return jsonify({"foods": [food.to_json() for food in foods]}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/dieting/get_foods_for_nutrient", methods=["POST"])
def get_food_of_nutrient():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        nutr_id = data.get('nutrient_id')
        query = data.get("query")
        loaded = data.get("loaded")
        amount = 2
        foods = get_elligble_foods_nutrient(user_id, nutr_id, query)
        foods.sort(reverse=False, key= lambda x: (sort_by_favorite(x), sort_by_name(x)))
        sent_foods = []
        for i in range(loaded, min(loaded + amount, len(foods))):
            sent_foods.append(foods[i].to_json())
        return jsonify({"foods": sent_foods}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/dieting/favorite_food", methods=["POST"])
def favorite_food_for_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        food_id = data.get('food_id')
        res = favorite_food(user_id, food_id)
        return jsonify({"result": res}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/dieting/defavorite_food", methods=["POST"])
def defavorite_food_for_user():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        food_id = data.get('food_id')
        res = defavorite_food(user_id, food_id)
        return jsonify({"result": res}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/dieting/get_calorie_intake", methods=["POST"])
def get_user_calorie_intake():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        res = get_calorie_intake(user_id)
        if res is None:
            res = 0
        return jsonify({"result": res}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/dieting/calculate_calorie_intake", methods=["POST"])
def calculate_user_calorie_intake():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        sex = data.get('sex')
        weight = data.get('weight')
        height = data.get('height')
        age = data.get('age')
        activity = data.get('activity')
        res = calculate_calorie_intake(
            user_id, sex, weight, height, age, activity)
        return jsonify({"result": res}), 200
    except Exception as e:
        print(f"Exception calc: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# New Food Items


@app.route("/create_foods/submit_form", methods=["POST"])
def submit_user_form_for_food():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        name = data.get('name')
        type = data.get('type')
        description = data.get('description')
        submit_form(user_id, name, type, description)
        return jsonify({"data": "Success"}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/create_foods/get_all_pending_forms", methods=["POST"])
def get_all_pending_food_forms():
    try:
        data = request.get_json()
        forms = get_all_pending_forms()
        return jsonify({"forms": [form.to_json() for form in forms]}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/create_foods/get_user_forms", methods=["POST"])
def get_user_food_forms():
    print('eeee')
    try:
        print('accessed')
        data = request.get_json()
        user_id = data.get('user_id')
        forms = get_user_forms(user_id)
        print(forms)
        return jsonify({"forms": [form.to_json() for form in forms]}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/create_foods/reject_form", methods=["POST"])
def reject_food_form():
    try:
        data = request.get_json()
        id = data.get('id')
        reject_form(id)
        return jsonify({"data": True}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/create_foods/accept_form", methods=["POST"])
def accept_food_form():
    try:
        data = request.get_json()
        id = data.get('id')
        accept_form(id)
        return jsonify({"data": True}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# Meal Plans

@app.route("/meal_plan/get_all_meal_plans", methods=["POST"])
def get_all_of_users_meal_plans():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        plans = get_all_meal_plans(user_id)
        return jsonify({"plans": [plan.to_json() for plan in plans]}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/meal_plan/set_meal_plan_name", methods=["POST"])
def set_name_of_meal_plan():
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        name = data.get('name')
        update_meal_plan_name(plan_id, name)
        return jsonify({"message": "Succeeded!"}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/meal_plan/set_meal_plan_desc", methods=["POST"])
def set_desc_of_meal_plan():
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        desc = data.get('desc')
        update_meal_plan_desc(plan_id, desc)
        return jsonify({"message": "Succeeded!"}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/meal_plan/get_meal_plan", methods=["POST"])
def get_user_meal_plan():
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        plan = get_meal_plan(plan_id)
        if plan == None:
            return jsonify({"data": None}), 200
        return jsonify({"plan": plan.to_json()}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500
    
@app.route("/meal_plan/delete_meal_plan", methods=["POST"])
def delete_a_plan_of_user():
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        plan = delete_meal_plan(plan_id)
        return jsonify({"message": "Succeeded!"}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/meal_plan/create_meal_plan", methods=["POST"])
def create_user_meal_plan():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        plan_id = create_meal_plan(user_id)
        if plan_id == None:
            return jsonify({"error": "Could not create."}), 500
        return jsonify({"plan_id": plan_id}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/meal_plan/add_component", methods=["POST"])
def add_component_to_plan():
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        food_id = data.get('food_id')
        amount = data.get('amount')
        id = add_component(plan_id, food_id, amount)
        return jsonify({"id": id}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/meal_plan/update_component", methods=["POST"])
def update_component_of_plan():
    try:
        data = request.get_json()
        id = data.get('id')
        amount = data.get('amount')
        update_component(id, amount)
        return jsonify({"data": True}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/meal_plan/delete_component", methods=["POST"])
def delete_component_in_plan():
    try:
        data = request.get_json()
        id = data.get('id')
        delete_component(id)
        return jsonify({"data": True}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/meal_plan/get_days_plan_is_completed", methods=["POST"])
def get_days_of_plan():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        plan_id = data.get('plan_id')
        days = get_days_plan_is_completed(user_id, plan_id)
        return jsonify({"days": days}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/meal_plan/mark_day", methods=["POST"])
def mark_day_of_plan():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        plan_id = data.get('plan_id')
        day = data.get('day')
        mark_day(user_id, plan_id, day)
        return jsonify({"data": True}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route("/meal_plan/get_nutrients_to_food", methods=["POST"])
def get_map_of_nutrients_to_food():
    try:
        data = request.get_json()
        res = get_nutrients_to_foods()
        output = []
        for key in res.keys():
            output.append({
                'nutr_id': key,
                'food_ids': res.get(key)
            })
        return jsonify({"data": output}), 200
    except Exception as e:
        print(f"Exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

# Forgot password


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
            print(
                f"Failed to send verification email: {email_result.get('error')}")
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
# @login_required
def handle_api_template():
    data = request.json
    if 'parameter_1' in data and 'parameter_2' in data:
        parameter_1 = request.json['parameter_1']
        parameter_2 = request.json['parameter_2']

        my_message = parameter_2 + str(parameter_1)
        return jsonify({"message": my_message}), 200

    return jsonify({"message": "Error: invalid parameters"}), 400


# ==================== FOLLOWER/FOLLOWING ROUTES ====================

@app.route('/users/<user_id>/follow', methods=['POST'])
@require_auth
def follow_user_handler(user_id):
    """Follow a user"""
    try:
        follower_id = request.current_user_id

        # Prevent self-follow
        if follower_id == user_id:
            return jsonify({"error": "You cannot follow yourself"}), 400

        result = follow_user(follower_id, user_id)

        if "error" in result:
            if result["error"] == "Already following this user":
                return jsonify({
                    "message": "Already following this user",
                    "follower_count": result.get('follower_count', 0),
                    "is_following": True
                }), 200
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "follower_count": result["follower_count"],
            "is_following": True
        }), 200

    except Exception as e:
        print(f"Follow user exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/users/<user_id>/unfollow', methods=['POST'])
@require_auth
def unfollow_user_handler(user_id):
    """Unfollow a user"""
    try:
        follower_id = request.current_user_id

        result = unfollow_user(follower_id, user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "follower_count": result["follower_count"],
            "is_following": False
        }), 200

    except Exception as e:
        print(f"Unfollow user exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/users/<user_id>/is-following', methods=['GET'])
def check_is_following_handler(user_id):
    """Check if the current user is following another user"""
    try:
        follower_id = request.args.get('follower_id')

        if not follower_id:
            return jsonify({"error": "Missing follower_id"}), 400

        result = check_is_following(follower_id, user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Check is following exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/users/<user_id>/followers', methods=['GET'])
def get_followers_handler(user_id):
    """Get list of followers for a user"""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        result = get_followers(user_id, limit, offset)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get followers exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/users/<user_id>/following', methods=['GET'])
def get_following_handler(user_id):
    """Get list of users that a user is following"""
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        result = get_following(user_id, limit, offset)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get following exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ==================== BLOCK/UNBLOCK ROUTES ====================

@app.route('/users/<user_id>/block', methods=['POST'])
@require_auth
def block_user_handler(user_id):
    """Block a user"""
    try:
        blocker_id = request.current_user_id

        # Prevent self-block
        if blocker_id == user_id:
            return jsonify({"error": "You cannot block yourself"}), 400

        result = block_user(blocker_id, user_id)

        if "error" in result:
            if result["error"] == "User is already blocked":
                return jsonify({
                    "message": "User is already blocked",
                    "is_blocked": True
                }), 200
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "is_blocked": True
        }), 200

    except Exception as e:
        print(f"Block user exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/users/<user_id>/unblock', methods=['POST'])
@require_auth
def unblock_user_handler(user_id):
    """Unblock a user"""
    try:
        blocker_id = request.current_user_id

        result = unblock_user(blocker_id, user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify({
            "message": result["message"],
            "is_blocked": False
        }), 200

    except Exception as e:
        print(f"Unblock user exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/users/<user_id>/is-blocked', methods=['GET'])
def check_is_blocked_handler(user_id):
    """Check if there's a block relationship between the current user and another user"""
    try:
        current_user_id = request.args.get('current_user_id')

        if not current_user_id:
            return jsonify({"error": "Missing current_user_id"}), 400

        result = check_is_blocked(current_user_id, user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Check is blocked exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/blocked-users', methods=['GET'])
@require_auth
def get_blocked_users_handler():
    """Get list of users that the current user has blocked"""
    try:
        user_id = request.current_user_id
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        result = get_blocked_users(user_id, limit, offset)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get blocked users exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


# ==================== RESTAURANT REVIEWS ROUTES ====================

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

        ratings = [r["rating"]
                   for r in rows if isinstance(r.get("rating"), (int, float))]
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

        res = supabase.table("rest_favs").select(
            "r_id").eq("user", user_id).execute()
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
            out = updated.data[0] if updated.data else {
                "r_id": rid, "count": new_count, "r_name": rname}
            return jsonify({"trending": out}), 200
        else:
            inserted = (
                supabase.table("rest_trending")
                .insert({"r_id": rid, "r_name": rname, "count": 1})
                .execute()
            )
            out = inserted.data[0] if inserted.data else {
                "r_id": rid, "r_name": rname, "count": 1}
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


# ==================== NOTIFICATIONS ROUTES ====================

@app.route('/notifications', methods=['GET'])
@require_auth
def get_notifications_handler():
    """Get notifications for the current user"""
    try:
        user_id = request.current_user_id
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        unread_only = request.args.get(
            'unread_only', 'false').lower() == 'true'

        result = get_notifications(user_id, limit, offset, unread_only)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get notifications exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/notifications/unread-count', methods=['GET'])
@require_auth
def get_unread_count_handler():
    """Get count of unread notifications"""
    try:
        user_id = request.current_user_id
        result = get_unread_notification_count(user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get unread count exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/notifications/<notification_id>/read', methods=['POST'])
@require_auth
def mark_notification_read_handler(notification_id):
    """Mark a notification as read"""
    try:
        user_id = request.current_user_id
        result = mark_notification_as_read(notification_id, user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Mark notification read exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/notifications/mark-all-read', methods=['POST'])
@require_auth
def mark_all_read_handler():
    """Mark all notifications as read"""
    try:
        user_id = request.current_user_id
        result = mark_all_notifications_as_read(user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Mark all read exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/notifications/<notification_id>', methods=['DELETE'])
@require_auth
def delete_notification_handler(notification_id):
    """Delete a notification"""
    try:
        user_id = request.current_user_id
        result = delete_notification(notification_id, user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Delete notification exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/notification-preferences', methods=['GET'])
@require_auth
def get_notification_preferences_handler():
    """Get user's notification preferences"""
    try:
        user_id = request.current_user_id
        result = get_notification_preferences(user_id)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Get notification preferences exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500


@app.route('/notification-preferences', methods=['POST'])
@require_auth
def update_notification_preferences_handler():
    """Update user's notification preferences"""
    try:
        user_id = request.current_user_id
        data = request.get_json()

        preferences = data.get('preferences', {})
        result = update_notification_preferences(user_id, preferences)

        if "error" in result:
            return jsonify({"error": result["error"]}), 400

        return jsonify(result), 200

    except Exception as e:
        print(f"Update notification preferences exception: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/restaurant_review_drafts", methods=["POST"])
def restaurant_review_drafts_create():
    data = request.get_json(silent=True) or {}
    print(data)
    rid = (data.get("restaurant_id") or "").strip()
    name = (data.get("author") or "").strip()
    body = (data.get("text") or "").strip()
    rating = (data.get("rating"))
    if rating == None:
        rating = 0
    uid = (data.get("u_id"))

    if not rid:
        return jsonify({"error": "missing restaurant_id"}), 400

    if not name:
        name = "Anonymous"

    row = insert_restaurant_review_draft(rid, name, body, rating, uid)
    if isinstance(row, dict) and "error" in row:
        return jsonify({"error": row["error"]}), 400

    return jsonify({"draft": row}), 201

@app.route("/restaurant_review_drafts", methods=["GET"])
def restaurant_review_drafts_for_user():
    u_id = (request.args.get("u_id") or "").strip()
    if not u_id:
        return jsonify({"error": "missing u_id"}), 400

    # 1) Get this user's drafts from about_restaurant_reviews_drafts
    drafts = fetch_about_restaurant_review_drafts_for_user(u_id)
    if isinstance(drafts, dict) and "error" in drafts:
        return jsonify({"error": drafts["error"]}), 400

    # If no drafts, just return empty lists
    if not drafts:
        return jsonify({"drafts": [], "restaurants": []}), 200

    # 2) Collect unique restaurant IDs from drafts
    restaurant_ids = sorted({d["r_id"] for d in drafts if d.get("r_id")})

    # 3) Fetch restaurants info separately
    restaurants = fetch_restaurants_by_ids(restaurant_ids)
    if isinstance(restaurants, dict) and "error" in restaurants:
        return jsonify({"error": restaurants["error"]}), 400

    # All good
    return jsonify({
        "drafts": drafts,
        "restaurants": restaurants,
    }), 200
@app.route("/restaurant_review_drafts/<int:draft_id>", methods=["PATCH"])
def update_restaurant_review_draft(draft_id):
    data = request.get_json(silent=True) or {}

    raw_text = data.get("text", None)
    raw_rating = data.get("rating", None)

    update_data = {}

    if "text" in data:
        update_data["text"] = (raw_text or "").strip()

    if "rating" in data:
        rating = raw_rating if raw_rating not in (None, "", "null") else 0
        update_data["rating"] = int(rating)

    try:
        res = (
            supabase
            .table("about_restaurant_review_draft")
            .update(update_data)
            .eq("id", draft_id)
            .execute()
        )

        rows = res.data or []
        if not rows:
            return jsonify({"error": "draft not found"}), 404

        return jsonify({"draft": rows[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/restaurant_review_drafts/<int:draft_id>", methods=["DELETE"])
def delete_restaurant_review_draft(draft_id):
    try:
        res = (
            supabase
            .table("about_restaurant_review_draft")
            .delete()
            .eq("id", draft_id)
            .execute()
        )

        rows = res.data or []
        if not rows:
            return jsonify({"error": "draft not found"}), 404

        return jsonify({"deleted": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/restaurants/unapproved", methods=["GET"])
def restaurants_unapproved():
    try:

        res = (
            supabase
            .table("restaurant")
            .select("*")
            .eq("approved", False)
            .execute()
        )

        rows = res.data or []

        u_ids = {row.get("u_id") for row in rows if row.get("u_id")}
        emails_by_id: dict[str, str] = {}

        if u_ids:
            users_res = (
                supabase
                .table("users")
                .select("id, email")
                .in_("id", list(u_ids))
                .execute()
            )

            for urow in users_res.data or []:
                uid = urow.get("id")
                email = urow.get("email")
                if uid:
                    emails_by_id[uid] = email

        results = []
        for row in rows:
            u_id = row.get("u_id")
            results.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "address": row.get("address"),
                    "owner": row.get("owner"),
                    "owner_email": emails_by_id.get(u_id),
                    "approved": row.get("approved"),
                }
            )

        return jsonify({"restaurants": results}), 200

    except Exception as e:
        print(f"Error fetching unapproved restaurants: {e}")
        return jsonify({"error": "Failed to load unapproved restaurants"}), 500


@app.route("/restaurants/<restaurant_id>/approve", methods=["POST"])
def approve_restaurant(restaurant_id):
    try:
        res = (
            supabase
            .table("restaurant")
            .update({"approved": True})
            .eq("id", restaurant_id)
            .execute()
        )

        rows = res.data or []
        if not rows:
            return jsonify({"error": "restaurant not found"}), 404

        return jsonify({"restaurant": rows[0]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route("/restaurants/<restaurant_id>", methods=["DELETE"])
def delete_restaurant(restaurant_id):
    try:

        res = (
            supabase
            .table("restaurant_tags")
            .delete()
            .eq("r_id", restaurant_id)
            .execute()
        )

        res = (
            supabase
            .table("restaurant")
            .delete()
            .eq("id", restaurant_id)
            .execute()
        )

        rows = res.data or []
        if not rows:
            return jsonify({"error": "restaurant not found"}), 404

        return jsonify({"deleted": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400



if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', debug=True,
                 port=5001, allow_unsafe_werkzeug=True)
