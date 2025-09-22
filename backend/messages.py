from flask import Flask, request, jsonify
from supabase import create_client, Client
import os
from functools import wraps

app = Flask(__name__)

# init supabase
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)


# this is a decorator to check for auth token in headers. it runs on every request and assigns request.current_user_id to the user id
# f is the function to be decorated
def require_auth(f):
    @wraps(f)  # to preserve function metadata
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token'}), 401  # Unauthorized
        token = auth_header.split(' ')[1]
        try:
            response = supabase.auth.get_user(token)
            request.current_user_id = response.user.id
            # call the original function with args and keyword args (kwargs)
            return f(*args, **kwargs)
        except:
            return jsonify({'error': 'Invalid token'}), 401
    return decorated_function


@app.route('/api/messages/send', methods=['POST'])
@require_auth  # runs before send_message() to check valid JWT token
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


@app.route('/api/messages/<user_id>', methods=['GET'])
@require_auth
def get_messages(user_id):
    # Get messages between current user and user_id
    messages = supabase.table('messages').select('*').or_(
        # i sent to thenm
        f'and(sender_id.eq.{request.current_user_id},receiver_id.eq.{user_id}),'
        # they sent to me
        f'and(sender_id.eq.{user_id},receiver_id.eq.{request.current_user_id})'
    ).order('timestamp').execute()

    return jsonify({'messages': messages.data})


@app.route('/api/messages/conversations', methods=['GET'])
@require_auth
def get_conversations():
    # Get all messages for current user, sorted by newest first
    messages = supabase.table('messages').select('*').or_(
        f'sender_id.eq.{request.current_user_id},'
        f'receiver_id.eq.{request.current_user_id}'
    ).order('timestamp', desc=True).execute()

    # Find unique conversations (simplified)
    seen_users = set()
    conversations = []

    for msg in messages.data:
        other_user = msg['receiver_id'] if msg['sender_id'] == request.current_user_id else msg['sender_id']
        if other_user not in seen_users:
            seen_users.add(other_user)
            conversations.append({
                'user_id': other_user,
                'last_message': msg['content'],
                'timestamp': msg['timestamp']
            })

    return jsonify({'conversations': conversations})


if __name__ == '__main__':
    app.run(debug=True)
