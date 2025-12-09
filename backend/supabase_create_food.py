import os
from supabase_instance import supabase
from dotenv import load_dotenv
from storage_objs import FoodForm

load_dotenv()

def submit_form(user_id, name, type, description):
    supabase.table('user_food_forms') \
        .insert({
            'user_id': user_id,
            'name': name,
            'type': type,
            'description': description,
            'status': 'Pending'
        }) \
        .execute()

def get_all_pending_forms():
    res = supabase.table('user_food_forms') \
        .select('*') \
        .eq('status', 'Pending') \
        .execute()
    forms = []
    for row in res.data:
        forms.append(FoodForm(row['id'], row['name'], row['type'], row['description'], row['user_id'], row['status']))
    return forms

def get_user_forms(user_id):
    res = supabase.table('user_food_forms') \
        .select('*') \
        .eq('user_id', user_id) \
        .execute()
    forms = []
    for row in res.data:
        forms.append(FoodForm(row['id'], row['name'], row['type'], row['description'], row['user_id'], row['status']))
    return forms

def accept_form(form_id):
    row = supabase.table('user_food_forms') \
        .select('*') \
        .eq('id', form_id) \
        .execute().data[0]
    supabase.table('user_food_forms') \
        .update({'status': 'Accepted'}) \
        .eq('id', form_id) \
        .execute()
    supabase.table('food_item') \
        .insert({
            'name': row['name'],
            'type': row['type'],
            'description': row['description']
        }).execute()

def reject_form(form_id):
    supabase.table('user_food_forms') \
        .update({'status': 'Rejected'}) \
        .eq('id', form_id) \
        .execute()