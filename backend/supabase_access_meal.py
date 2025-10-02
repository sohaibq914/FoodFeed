import os
from supabase import create_client, Client, time
from dotenv import load_dotenv
from storage_objs import Meal, MealTemplate
from datetime import datetime

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

print(f"Supabase URL: {url}")
print(f"Supabase Key exists: {bool(key)}")

if not url or not key:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")

supabase: Client = create_client(url, key)

def get_user_meal_templates(user_id):
    try: 
        res = supabase.table('meal_templates') \
            .select('*') \
            .eq('owner', user_id) \
            .execute()
        templates = []
        for row in res['data']:
            templates.append(MealTemplate(row['name'], row['calories']))
        return templates
    except:
        return [MealTemplate('', 0)]
    
def add_meal_template(user_id, name, calories):
    try: 
        if has_meal_name(user_id, name):
            return False
        res = supabase.table('meal_templates') \
            .insert({
                'owner_id': user_id,
                'name': name,
                'calories': calories
            }) \
            .execute()
        return True
    except:
        return False
    
def has_meal_name(user_id, name):
    try: 
        res = supabase.table('meal_templates') \
            .select('*') \
            .eq('owner_id', user_id) \
            .eq('name', name) \
            .execute()
        return len(res['data']) != 0
    except:
        return False
    
def update_meal_template(user_id, old_name, new_name, calories):
    try: 
        if old_name != new_name:
            if not has_meal_name(user_id, old_name) or has_meal_name(user_id, new_name):
                return False
        supabase.table('meal_templates') \
            .update({
                'name': new_name,
                'calories': calories
            }) \
            .eq('owner_id', user_id) \
            .eq('name', old_name) \
            .execute()
        return True
    except:
        return False
    
def delete_meal_template_of_user(user_id, name):
    try: 
        if not has_meal_name(name):
            return False
        supabase.table('meal_templates') \
            .delete() \
            .eq('owner_id', user_id) \
            .eq('name', name) \
            .execute()
        return True
    except:
        return False

def add_meal(user_id, name, calories, ate_at):
    try: 
        now = datetime.now().isoformat()
        if datetime.fromisoformat(now) - datetime.fromisoformat(ate_at) < 0:
            return None
        res = supabase.table('meal_templates') \
            .insert({
                'owner': user_id,
                'name': name,
                'calories': calories,
                'ate_at': ate_at
            }) \
            .execute()
        return res['data'][0]['id']
    except:
        return None  
    
def delete_meal(meal_id):
    try: 
        res = supabase.table('meal_templates') \
            .select("*") \
            .eq('id', meal_id) \
            .execute()
        if datetime.fromisoformat(res['data'][0]['ate_at']) > (datetime(hour=24) + datetime.now()):
            return False
        supabase.table('meal_templates') \
            .delete() \
            .eq('id', meal_id) \
            .execute()
        return True
    except:
        return False  
    
def get_meals(user_id):
    try: 
        res = supabase.table('meal_templates') \
            .select('*') \
            .eq('owner', user_id) \
            .execute()
        meals = []
        for row in res['data']:
            meals.append(Meal(row['id'], row['name'], row['calories'], row['ate_at']))
        return meals
    except:
        return [Meal('', 0, datetime.now().isoformat())]    
    
def get_meals(user_id, start, end):
    try: 
        res = supabase.table('meal_templates') \
            .select('*') \
            .eq('owner', user_id) \
            .gte('ate_at', start) \
            .lte('ate_at', end) \
            .execute()
        meals = []
        for row in res['data']:
            meals.append(Meal(row['id'], row['name'], row['calories'], row['ate_at']))
        return meals
    except:
        return [Meal('', '', 0, datetime.now().isoformat())]
    
def get_hour_average(meals):
    total = []
    for i in range(24):
        total.append([0, 0])
    for meal in meals:
        timestamp = datetime.fromisoformat(meal.ate_at)
        total[timestamp.hour][0] += meal.calories
        total[timestamp.hour][1] += 1
    average = []
    for i in range(24):
        if (total[i][1] == 0):
            average.append(0)
        else:
            average.append(total[i][0] * 1.0 / total[i][1])
    return average