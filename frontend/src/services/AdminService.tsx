import { API_Caller, get_caller } from '@/misc/Connection'

const caller = get_caller()

export const is_admin = async (user_id: string): Promise<{success: boolean, message: string, is_admin: boolean}> => {    
    const {response, data} = await caller.call_function(
        'verify_admin/is_admin',
        JSON.stringify({
            'user_id': user_id
        })
    );
    if (response.ok) {
        const items: {is_admin: boolean} = data;
        return {success: true, message: data.result, is_admin: items.is_admin}
    }
    return {success: false, message: data.error, is_admin: false};
}