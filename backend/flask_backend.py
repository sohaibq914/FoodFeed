from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def hello_world():
    return "<p>Hello, World!</p>"

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
