from supabase_instance import supabase
from dotenv import load_dotenv
from storage_objs import RestrictionItem

def get_restrictions(user_id):
    restrictions = supabase.table('restrictions').select('*') \
        .execute()
    id_to_restr = {}
    for restr in restrictions.data:
        item = RestrictionItem(restr['id'], restr['name'], False)
        id_to_restr[item.restr_id] = item
    user_to_restr = supabase.table('user_to_restr').select('*') \
        .eq('user_id', user_id).execute()
    for row in user_to_restr.data:
        id_to_restr[row['restr_id']].user_has = True
    return id_to_restr

def add_restriction(user_id, restr_id):
    supabase.table('user_to_restr').insert({
        'user_id': user_id,
        'restr_id': restr_id
    }).execute()

def remove_restriction(user_id, restr_id):
    supabase.table('user_to_restr').delete() \
        .eq('user_id', user_id).eq('restr_id', restr_id) \
        .execute()