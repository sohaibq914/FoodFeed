from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase_backend import sign_up_user, sign_in_user, sign_out_user, change_user_password
import os
from dotenv import load_dotenv
from supabase_access_meal import *
from supabase_access_nutrition import *

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
    
if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True, port=5001)