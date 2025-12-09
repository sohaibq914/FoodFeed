import os
import re
from supabase_instance import supabase
from dotenv import load_dotenv
from storage_objs import FoodItem, NutrientItem

load_dotenv()

def get_all_favorite_foods(user_id):
    res = supabase.table('favorited_foods') \
        .select("food_id") \
        .eq('user_id', user_id) \
        .execute()
    favorite_set = set()
    for row in res.data:
        favorite_set.add(row['food_id'])
    return favorite_set
    

def get_food_is_favorite(user_id, food_id):
    res = supabase.table('favorited_foods') \
        .select("*") \
        .eq('user_id', user_id) \
        .eq('food_id', food_id) \
        .execute() 
    return len(res.data) > 0

def get_food_items(user_id, type, query):
    try:
        items = []
        res = supabase.table('food_item').select('*') \
            .eq("type", type) \
            .ilike('name', query) \
            .execute()
        for row in res.data:
            items.append(
                FoodItem(row['id'], row['name'], row['description'], get_food_is_favorite(user_id, row['id']))
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
            if row['id'] in selected_nutrients:
                given_nutrients.append(
                    NutrientItem(row['id'],
                        row['name'],
                        row['description'],
                        selected_nutrients[row['id']],
                        True)
                )
            else:
                given_nutrients.append(
                    NutrientItem(row['id'],
                        row['name'],
                        row['description'],
                        0,
                        False)
                )
        return given_nutrients
    except Exception as e:
        print("Nutrient Exception: " + str(e))
        return []

def get_foods_with_nutrient(user_id, nutr_id, query):
    try:
        res = supabase.from_('item_has_nutrient') \
            .select('food_id, food_item(name)') \
            .eq('nutrient_id', nutr_id) \
            .execute()
        foods = []
        for row in res.data:
            info = supabase.table('food_item') \
                .select('*') \
                .eq('id', row['food_id']) \
                .execute()
            if (not re.search(query, info.data[0]['name'], flags=re.IGNORECASE)):
                continue
            foods.append(
                FoodItem(info.data[0]['id'], info.data[0]['name'], info.data[0]['description'],
                    get_food_is_favorite(user_id, info.data[0]['id']))
            )
        return foods
    except Exception as e:
        print("Problem: " + str(e))
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

def get_nutrients_to_foods():
    try: 
        nutrs_to_foods = {}
        res = supabase.table('nutrients') \
            .select('id') \
            .execute()
        for row in res.data:
            id = row['id']
            foods = []
            food_res = supabase.table('item_has_nutrient') \
                .select('food_id') \
                .eq('nutrient_id', id) \
                .execute()
            for food_row in food_res.data:
                foods.append(food_row['food_id'])
            nutrs_to_foods[id] = foods
        return nutrs_to_foods
    except Exception as e:
        print(e)
        return {}

def favorite_food(user_id, food_id):
    if (not get_food_is_favorite(user_id, food_id)):
        supabase.table('favorited_foods') \
            .insert({'food_id': food_id, 'user_id': user_id}) \
            .execute()
        return True
    else:
        return False
    
def defavorite_food(user_id, food_id):
    if (get_food_is_favorite(user_id, food_id)):
        supabase.table('favorited_foods') \
            .delete() \
            .eq('food_id', food_id) \
            .eq('user_id', user_id) \
            .execute()
        return True
    else:
        return False

def calculate_calorie_intake(user_id, sex, weight, height, age, activity):
    if get_calorie_intake(user_id) is not None:
        return False

    calorie_intake = 10 * weight * 0.453592 \
            + 6.25 * height * 2.54 \
            - 5 * age
    if sex == 'm':
        calorie_intake += 161
    elif sex == 'f':
        calorie_intake -= 5

    if activity == 4:
        calorie_intake *= 1.9
    elif activity == 3:
        calorie_intake *= 1.725
    elif activity == 2:
        calorie_intake *= 1.55
    elif activity == 1:
        calorie_intake *= 1.375
    elif activity == 0:
        calorie_intake *= 1.2

    supabase.table('calorie_intake') \
        .insert({  
            'user_id': user_id,
            'intake': calorie_intake
        }) \
        .execute()
    return calorie_intake

def get_calorie_intake(user_id):
    res = supabase.table('calorie_intake') \
        .select('*') \
        .eq('user_id', user_id) \
        .execute()
    if (len(res.data) == 0):
        return None
    return res.data[0]['intake']

def get_elligble_foods_type(user_id, type, query):
    food_items = get_food_items(user_id, type, query)
    return get_elligble_foods(user_id, food_items)

def get_elligble_foods_nutrient(user_id, nutr_id, query):
    return get_elligble_foods(user_id, get_foods_with_nutrient(user_id, nutr_id, query))


