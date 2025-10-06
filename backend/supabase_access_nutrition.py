import os
from supabase import create_client, Client
from dotenv import load_dotenv
from storage_objs import FoodItem, NutrientItem

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

print(f"Supabase URL: {url}")
print(f"Supabase Key exists: {bool(key)}")

if not url or not key:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")

supabase: Client = create_client(url, key)

def get_food_items(type):
    try:
        items = []
        res = supabase.table('food_item').select('*')\
            .eq("type", type).execute()
        for row in res.data:
            items.append(
                FoodItem(row['id'], row['name'], row['description'])
            )
        return items
    except Exception as e:
        print("Food Items: " + str(e))
        return [FoodItem('', '', '')]
    
    
def add_user_nutrient(user_id, nutrient_id, amount):
    try: 
        supabase.table('user_has_nutrient') \
            .insert({
                'user_id': user_id,
                'nutr_id': nutrient_id,
                'amount': amount
            }) \
            .execute()
    except Exception as e:
        return ["Failed"]
    
def update_user_nutrient(user_id, nutrient_id, amount):
    try: 
        supabase.table('user_has_nutrient') \
            .update('amount', amount) \
            .eq('user_id', user_id) \
            .eq('nutr_id', nutrient_id) \
            .execute()
    except Exception as e:
        return ["Failed"]
    
def remove_user_nutrient(user_id, nutrient_id):
    try: 
        supabase.table('user_has_nutrient') \
            .delete() \
            .eq('user_id', user_id) \
            .eq('nutr_id', nutrient_id) \
            .execute()
    except Exception as e:
        return ["Failed"]
    
def get_nutrients(user_id):
    try: 
        res = supabase.table('user_has_nutrient') \
            .select('nutr_id,amount') \
            .eq('user_id', user_id) \
            .execute()
        selected_nutrients = {}
        for row in res.data:
            selected_nutrients[row['nutr_id']] = row['amount']
        res = supabase.table('nutrients') \
            .select('*') \
            .execute()
        given_nutrients = []
        for row in res.data:
            given_nutrients.append(
                NutrientItem(row['id'],
                    row['name'],
                    row['description'],
                    selected_nutrients[row['id']],
                    row['id'] in selected_nutrients)
            )
        return given_nutrients
    except Exception as e:
        print("Nutrient Exception: " + str(e))
        return []

def get_foods_with_nutrient(nutr_id):
    try:
        res = supabase.table('item_has_nutrient') \
            .select('food_id') \
            .eq('nutrient_id', nutr_id) \
            .execute()
        foods = []
        for row in res.data:
            info = supabase.table('food_item') \
                .select('*') \
                .eq('id', row['food_id']) \
                .execute()
            foods.append(
                FoodItem(info['id'], info['name'], info['description'])
            )
        return foods
    except Exception as e:
        return [FoodItem('', '', '')]


def get_user_restriction_ids(user_id):
    try:
        res = supabase.table('user_to_restr') \
            .select('*') \
            .eq('user_id', user_id) \
            .execute()
        restriction_ids = []
        for row in res.data:
            restriction_ids.append(row['restr_id'])
        return restriction_ids
    except Exception as e:
        print("Restrictions: " + str(e))
        return []

def get_user_restrictions(user_id):
    try:
        ids = get_user_restriction_ids(user_id)
        restrictions = []
        for id in ids:
            name = supabase.table('restrictions') \
                .select('*') \
                .eq('id', id) \
                .execute()['data'][0]['name']
            restrictions.append(name)
    except Exception as e:
        return ["Failed"]
    
def get_elligble_foods(user_id, foods):
    try:
        ids_to_food = {}
        for food in foods:
            ids_to_food[food.id] = food
        restrictions = get_user_restriction_ids(user_id)
        for restr_id in restrictions:
            res = supabase.table('food_with_restriction') \
                .select('*') \
                .eq('restriction_id', restr_id) \
                .execute()
            for row in res.data:
                if row['food_id'] in ids_to_food:
                    ids_to_food.pop(row['food_id'])
        elligble_foods = []
        for food in ids_to_food.items():
            elligble_foods.append(food)
        return elligble_foods
    except Exception as e:
        print("Elligible Foods: " + str(e))
        return []

def get_elligble_foods_type(user_id, type):
    return get_elligble_foods(user_id, get_food_items(type))

def get_elligble_foods_nutrient(user_id, nutr_id):
    return get_elligble_foods(user_id, get_foods_with_nutrient(nutr_id))


