import os
from supabase import create_client, Client
from dotenv import load_dotenv
from pandas import read_csv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

print(f"Supabase URL: {url}")
print(f"Supabase Key exists: {bool(key)}")

supabase: Client = create_client(url, key)

if not url or not key:
    raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables")

def update_names(csv_file):
    data = read_csv(csv_file, header=0, index_col=False)
    for index, row in data.iterrows():
        supabase.table('food_item') \
            .update({'name': row['new']}) \
            .eq('name', row['old']) \
            .execute()

def insert_food_items(csv_file):
    data = read_csv(csv_file, index_col=False)
    for index, row in data.iterrows():
        res = supabase.table('food_item') \
            .select('*') \
            .eq('name', row['name']) \
            .execute()
        if len(res.data) == 0:
            supabase.table('food_item') \
                .insert({
                    'name': row['name'],
                    'type': row['type'],
                    'description': row['description']
                }).execute()
        else:
            supabase.table('food_item') \
                .update({
                    'type': row['type'],
                    'description': row['description']
                }) \
                .eq('name', row['name']) \
                .execute()
        
def insert_nutrients(csv_file):
    data = read_csv(csv_file, index_col=False)
    for index, row in data.iterrows():
        res = supabase.table('nutrients') \
            .select('*') \
            .eq('name', row['name']) \
            .execute()
        if len(res.data) == 0:
            res = supabase.table('nutrients') \
                .insert({
                    'name': row['name'],
                    'description': row['description']
                }).execute()
        else:
            res = supabase.table('nutrients') \
                .update({
                    'description': row['description']
                }) \
                .eq('name', row['name']) \
                .execute()
        id = res.data[0]['id']
        foods = row['foods']
        try:
            foods = foods.split(' ')
        except Exception as e:
            continue
        supabase.table('item_has_nutrient') \
            .delete() \
            .eq('nutrient_id', id) \
            .execute()
        for food in foods:
            food_id = supabase.table('food_item') \
                .select('id') \
                .eq('name', food) \
                .execute().data[0]['id']
            supabase.table('item_has_nutrient') \
                .insert({
                    'nutrient_id': id,
                    'food_id': food_id
                }).execute()

def add_restrictions(csv_file):
    data = read_csv(csv_file, index_col=False)
    for index, row in data.iterrows():
        food_id = supabase.table('food_item') \
            .select('id') \
            .eq('name', row['food']) \
            .execute().data[0]['id']
        restrictions = row['restrictions'].split(' ')
        supabase.table('food_with_restriction') \
            .delete() \
            .eq('food_id', food_id) \
            .execute()
        for restr in restrictions:
            restr_id = supabase.table('restrictions') \
                .select('id') \
                .eq('name', restr) \
                .execute().data[0]['id']
            supabase.table('food_with_restriction') \
                .insert({
                    'food_id': food_id,
                    'restriction_id': restr_id
                }) \
                .execute()

if __name__ == '__main__':
    try:
        update_names('update_food_names.csv')
        print("Updated names.")
        insert_food_items('food_items.csv')
        print("Added food items.")
        insert_nutrients('nutrients.csv')
        print("Added nutrients.")
        add_restrictions('food_to_restr.csv')
        print("Added restrictions.")
    except Exception as e:
        print("Error: " + str(e))