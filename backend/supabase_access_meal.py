import os
from supabase_instance import supabase
from dotenv import load_dotenv
from storage_objs import Meal, MealTemplate
from datetime import datetime, timezone, timedelta

load_dotenv()

def get_user_meal_templates(user_id):
    try: 
        res = supabase.table('meal_template') \
            .select('*') \
            .eq('owner', user_id) \
            .execute()
        templates = []
        for row in res.data:
            templates.append(MealTemplate(row['name'], row['calories']))
        return templates
    except Exception as e:
        print("Template error: " + str(e))
        return []
    
def add_user_meal_template(user_id, name, calories):
    try: 
        if has_meal_name(user_id, name):
            return False
        res = supabase.table('meal_template') \
            .insert({
                'owner': user_id,
                'name': name,
                'calories': calories
            }) \
            .execute()
        return True
    except Exception as e:
        print("Error: " + str(e))
        return False
    
def has_meal_name(user_id, name):
    try: 
        res = supabase.table('meal_template') \
            .select('*') \
            .eq('owner', user_id) \
            .eq('name', name) \
            .execute()
        print("Res: " + str(res))
        return len(res.data) != 0
    except Exception as e:
        print("Error: " + str(e))
        return False
    
def update_user_meal_template(user_id, old_name, new_name, calories):
    try: 
        if old_name != new_name:
            if not has_meal_name(user_id, old_name) or has_meal_name(user_id, new_name):
                return False
        supabase.table('meal_template') \
            .update({
                'name': new_name,
                'calories': calories
            }) \
            .eq('owner', user_id) \
            .eq('name', old_name) \
            .execute()
        return True
    except Exception as e:
        print("Error: " + str(e))
        return False
    
def delete_meal_template_of_user(user_id, name):
    try: 
        if not has_meal_name(user_id, name):
            return False
        supabase.table('meal_template') \
            .delete() \
            .eq('owner', user_id) \
            .eq('name', name) \
            .execute()
        return True
    except Exception as e:
        print("Error: " + str(e))
        return False

def add_meal(user_id, name, calories, ate_at):
    try: 
        now = datetime.now(tz=timezone.utc)
        if now < datetime.fromisoformat(ate_at):
            return None
        res = supabase.table('meal') \
            .insert({
                'owner': user_id,
                'name': name,
                'calories': calories,
                'ate_at': ate_at
            }) \
            .execute()
        return res.data[0]['id']
    except Exception as e:
        print("Error: " + str(e))
        return None  
    
def delete_meal(meal_id):
    try: 
        res = supabase.table('meal') \
            .select("*") \
            .eq('id', meal_id) \
            .execute()
        print(datetime.fromisoformat(res.data[0]['ate_at']))
        print(timedelta(days=1) + datetime.now(tz=timezone.utc))
        if datetime.fromisoformat(res.data[0]['ate_at']) < (datetime.now(tz=timezone.utc) - timedelta(days=1)):
            return False
        supabase.table('meal') \
            .delete() \
            .eq('id', meal_id) \
            .execute()
        return True
    except Exception as e:
        print("Error: " + str(e))
        return False  
    
def get_all_user_meals(user_id):
    try: 
        res = supabase.table('meal') \
            .select('*') \
            .eq('owner', user_id) \
            .order('ate_at', desc=False) \
            .execute()
        meals = []
        for row in res.data:
            meals.append(Meal(row['id'], row['name'], row['calories'], row['ate_at']))
        return meals
    except Exception as e:
        print("Failed: " + str(e))
        return []    
    
def get_meals(user_id, start, end):
    try: 
        res = supabase.table('meal') \
            .select('*') \
            .eq('owner', user_id) \
            .gte('ate_at', start) \
            .lte('ate_at', end) \
            .order('ate_at', desc=False) \
            .execute()
        meals = []
        for row in res.data:
            meals.append(Meal(row['id'], row['name'], row['calories'], row['ate_at']))
        return meals
    except Exception as e:
        print("Error: " + str(e))
        return [Meal('', '', 0, datetime.now().isoformat())]
    
def get_hour_average(meals):
    total = []
    for i in range(24):
        total.append([0, 0])
    for meal in meals:
        timestamp = datetime.fromisoformat(meal.time_aten)
        total[timestamp.hour][0] += meal.calories
        total[timestamp.hour][1] += 1
    average = []
    for i in range(24):
        if (total[i][1] == 0):
            average.append(0)
        else:
            average.append(total[i][0] * 1.0 / total[i][1])
    return average