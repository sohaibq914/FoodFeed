import os
from supabase_instance import supabase
from dotenv import load_dotenv
from storage_objs import Plan, PlanComponent
from datetime import datetime, timezone, timedelta

load_dotenv()
# supabase: Client = create_client(url, key)

def get_food_name(food_id):
    return supabase.table('food_item') \
        .select('*') \
        .eq('id', food_id) \
        .execute().data[0]['name']

def get_meal_plan(user_id):
    plan_res = supabase.table('meal_plan') \
        .select('*') \
        .eq('user_id', user_id) \
        .execute()
    if (len(plan_res.data) == 0):
        return None
    plan_id = plan_res.data[0]['id']
    comp_res = supabase.table('plan_components') \
        .select('*') \
        .eq('plan_id', plan_id) \
        .execute()
    components = []
    for row in comp_res.data:
        components.append(PlanComponent(row['id'], row['food_id'], row['amount']))
    return Plan(plan_id, components)
    
def add_component(plan_id, food_id, amount):
    return supabase.table('plan_components') \
        .insert({
            'plan_id': plan_id,
            'food_id': food_id,
            'amount': amount}) \
        .execute().data[0]['id']

def update_component(id, amount):
    supabase.table('plan_components') \
        .update({'amount': amount}) \
        .eq('id', id) \
        .execute()

def delete_component(id):
    supabase.table('plan_components') \
        .delete() \
        .eq('id', id) \
        .execute()

def create_meal_plan(user_id):
    row = supabase.table('meal_plan') \
        .insert({'user_id': user_id}) \
        .execute().data[0]
    return row['id']

def get_days_plan_is_completed(user_id, plan_id):
    times = []
    res = supabase.table('fulfilled_plan_days') \
        .select('*') \
        .eq('user_id', user_id) \
        .eq('plan_id', plan_id) \
        .execute()
    for row in res.data:
        times.append(row['day'])
    return times

def mark_day(user_id, plan_id, day):
    res = supabase.table('fulfilled_plan_days') \
        .insert({
            'user_id': user_id,
            'plan_id': plan_id,
            'day': day
        }) \
        .execute()