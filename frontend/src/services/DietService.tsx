"use client";
import { act, createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { time } from 'console';
import { API_Caller, get_caller } from '@/misc/Connection'

const caller = get_caller()

export interface FoodItem {
    id: string;
    name: string;
    description: string;
    favorite: boolean;
}

export interface NutritionItem {
    id: string;
    name: string;
    amount: number;
    description: string;
    is_eaten: boolean;
}

export interface MealTemplate {
    name: string;
    calories: number;
}

export interface Meal {
    id: string;
    name: string;
    calories: number;
    time_aten: Date;
}

export interface FoodForm {
    id: string;
    name: string;
    type: string;
    desc: string;
    user_id: string;
    status: string;
}

export interface PlanComponent {
    id: string;
    food_id: string;
    amount: number;
}

export interface Plan {
    plan_id: string;
    components: PlanComponent[];
}

export interface NutrFood { 
    nutr_id: string;
    food_ids: string[];
}

export interface RestrictionItem {
    id: string;
    name: string;
    user_has: string;
}  

class MealHolder implements Meal {
    id: string;
    name: string;
    calories: number;
    time_aten: Date;

    public constructor(id: string, name: string, calories: number, time_aten: Date) {
        this.id = id;
        this.name = name;
        this.calories = calories;
        this.time_aten = time_aten;
    }
}
/*
Template:
export const get_ = async (user_id: string): Promise<{success: boolean, message: string|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/',
        JSON.stringify({
        }),
    );
    try {    
        if (response.ok) {
            let templates: { } = data
            return {success: true, message: null}
        }
    }
    catch {
        
    }
    return {success: false, message: data.error};
}
*/
export const get_meal_templates = async (user_id: string): Promise<{success: boolean, message: string|null, templates: MealTemplate[]|null}> => {    
    console.log("Passed id: " + user_id)
    const {response, data} = await caller.call_function(
        'dieting/get_meal_templates',
        JSON.stringify({
            'user_id': user_id,
        })
    );
    
    try {
        if (response.ok) {
            const templates: { data: MealTemplate[] } = data
            return {success: true, message: null, templates: templates.data}
        }
        else {
            return {success: false, message: data.error, templates: null};
        }
    }
    catch {
    }
    return {success: false, message: 'Some error', templates: null};
}

export const add_meal_template = async (user_id: string, name: string, calories: number): Promise<{success: boolean, message: string}> => {    
    const {response, data} = await caller.call_function(
        'dieting/add_meal_template',
        JSON.stringify({
            'user_id': user_id,
            'name': name,
            'calories': calories
        })
    );
        
    if (response.ok) {
        return {success: true, message: data.result}
    }
    return {success: false, message: data.error};
}

export const update_meal_template = async (user_id: string, old_name: string, new_name: string, calories: number): Promise<{success: boolean, message: string}> => {    
    const {response, data} = await caller.call_function(
        'dieting/update_meal_template',
        JSON.stringify({
            'user_id': user_id,
            'old_name': old_name,
            'new_name': new_name,
            'calories': calories
        })
    );
        
    if (response.ok) {
        return {success: true, message: data.result}
    }
    return {success: false, message: data.error};
}

export const delete_meal_template = async (user_id: string, name: string): Promise<{success: boolean, message: string}> => {    
    const {response, data} = await caller.call_function(
        'dieting/delete_meal_template',
        JSON.stringify({
            'user_id': user_id, 
            'name': name
        })
    );
        
    if (response.ok) {
        return {success: true, message: data.result}
    }
    return {success: false, message: data.error};
}

export const add_meal = async (user_id: string, name: string, calories: number, ate_at: Date): Promise<{success: boolean, message: string, res: Meal|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/add_meal',
        JSON.stringify({
            'user_id': user_id,
            'name': name,
            'calories': calories,
            'ate_at': ate_at.toISOString()
        }),
    );
    
    if (response.ok) {
        return {success: true, message: data.result, 
            res: new MealHolder(data.id, name, calories, ate_at) 
        }
    }
    return {success: false, message: data.error, res: null};
}

export const delete_meal = async (meal_id: string): Promise<{success: boolean, message: string}> => {    
    const {response, data} = await caller.call_function(
        'dieting/delete_meal',
        JSON.stringify({
            'meal_id': meal_id,
        }),
    );
        
    if (response.ok) {
        return {success: true, message: data.result}
    }
    return {success: false, message: data.error};
}

export const get_user_meals = async (user_id: string, loaded: number): Promise<{success: boolean, message: string|null, meals: Meal[]|null, averages: number[]|null}> => {   
    const {response, data} = await caller.call_function(
        'dieting/get_meals',
        JSON.stringify({
            'user_id': user_id,
            'loaded': loaded
        }),
    );
    try {
        if (response.ok) {
            const items: { meals: Meal[], averages: number[] } = data
            items.meals = items.meals.map((value, index) => {
                value.time_aten = new Date(Date.parse(value.time_aten as unknown as string))
                return value
            }) as Meal[]
            console.log("Averages in all: " + String(items.averages))
            return {success: true, message: null, meals: items.meals, averages: items.averages}
        }
    }
    catch {     
    }
    const averages = []
    for (let i = 0; i < 24; i++) {
        averages.push(0)
    }
    return {success: false, message: data.error, meals: null, averages: averages};
}

export const get_user_meals_range = async (user_id: string, start: Date, end: Date, loaded: number): Promise<{success: boolean, message: string|null, meals:Meal[]|null, averages: number[]|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_meal_range',
        JSON.stringify({
            'user_id': user_id,
            'start': start.toISOString(),
            'end': end.toISOString(),
            'loaded': loaded
        })
    );
      
    try {
        if (response.ok) {
            const items: { meals: Meal[], averages: number[] } = data
            items.meals = items.meals.map((value, index) => {
                value.time_aten = new Date(Date.parse(value.time_aten as unknown as string))
                return value
            }) as Meal[]
            console.log("Averages: " + String(items.averages))
            return {success: true, message: null, meals: items.meals, averages: items.averages}
        }
    }
    catch {
    }
    return {success: false, message: data.error, meals: null, averages: null};
}

export const get_food_items = async (type: string, query: string, loaded: number): Promise<{success: boolean, message: string|null, foods: FoodItem[]|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_food_items',
        JSON.stringify({
            'type': type,
            'query': query,
            'loaded': loaded
        }),
    );
        
    try {
        if (response.ok) {
            console.log("EE")
            const items: { foods: FoodItem[] } = data
            console.log("Res: " + String(items));
            return {success: true, message: null, foods: items.foods};
        }
    }
    catch (e) {
        console.log(e)
    }
    return {success: false, message: data.error, foods: null};

}

export const add_nutrient = async (nutrient_id: string, user_id: string, amount: number): Promise<{success: boolean, message: string}> => {    
    const {response, data} = await caller.call_function(
        'dieting/add_nutrient_to_user',
        JSON.stringify({
            'user_id': user_id,
            'nutrient_id': nutrient_id,
            'amount': amount
        }),
    );
        
    if (response.ok) {
        return {success: true, message: data.result}
    }
    return {success: false, message: data.error};
}

export const update_nutrient = async (nutrient_id: string, user_id: string, amount: number): Promise<{success: boolean, message: string}> => {    
    const {response, data} = await caller.call_function(
        'dieting/update_nutrient_amount',
        JSON.stringify({
            'user_id': user_id,
            'nutrient_id': nutrient_id,
            'amount': amount
        }),
    );
        
    if (response.ok) {
        return {success: true, message: data.result}
    }
    return {success: false, message: data.error};
}

export const remove_nutrient = async (nutrient_id: string, user_id: string): Promise<{success: boolean, message: string}> => {    
    const {response, data} = await caller.call_function(
        'dieting/remove_nutrient_from_user',
        JSON.stringify({
            'user_id': user_id,
            'nutrient_id': nutrient_id
        }),
    );
    
    
    if (response.ok) {
        return {success: true, message: data.result}
    }
    return {success: false, message: data.error};
}

export const get_all_nutrients = async (user_id: string): Promise<{success: boolean, message:string|null, nutrients: NutritionItem[]|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_all_nutrients',
        JSON.stringify({
            'user_id': user_id
        }),
    );
    
    try {
        if (response.ok) {
            const items: { nutrients: NutritionItem[] } = data
            return {success: true, message: null, nutrients: items.nutrients}
        }
    }
    catch {
    }
    return {success: false, message: data.error, nutrients: null};
}

export const favorite_food = async (user_id: string, food_id: string): Promise<{success: boolean, message:string|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/favorite_food',
        JSON.stringify({
            'user_id': user_id,
            'food_id': food_id
        }),
    );
    
    try {
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {
    }
    return {success: false, message: data.error};
}

export const defavorite_food = async (user_id: string, food_id: string): Promise<{success: boolean, message:string|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/defavorite_food',
        JSON.stringify({
            'user_id': user_id,
            'food_id': food_id
        }),
    );
    
    try {
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {
    }
    return {success: false, message: data.error};
}

export const get_food_of_type = async (user_id: string, type: string, query: string, loaded: number): Promise<{success: boolean, message:string|null, foods:FoodItem[]|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_elligible_foods',
        JSON.stringify({
            'user_id': user_id,
            'type': type,
            'query': query,
            'loaded': loaded
        })
    );
        
    try {
        if (response.ok) {
            console.log()
            const items: { foods: FoodItem[] } = data
            return {success: true, message: null, foods: items.foods}
        }
    }
    catch {
    }
    return {success: false, message: data.error, foods: null};
}

export const get_food_of_nutrient = async (user_id: string, nutrient_id: string, query: string, loaded: number): Promise<{success: boolean, message: string|null, foods: FoodItem[] | null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_foods_for_nutrient',
        JSON.stringify({
            'user_id': user_id,
            'nutrient_id': nutrient_id,
            'query': query,
            'loaded': loaded
        }),
    );
    
    try {
        if (response.ok) {
            const items: { foods: FoodItem[] } = data
            console.log("Found foods: ")
            console.log(data)
            return {success: true, message: null, foods: items.foods}
        }
    }
    catch {
    }
    return {success: false, message: data.error, foods: null};
}

export const get_calorie_intake = async (user_id: string): Promise<{success: boolean, message:string|null, intake: number|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_calorie_intake',
        JSON.stringify({
            'user_id': user_id,
        }),
    );
    
    try {
        if (response.ok) {
            if (data.result == 0) {
                return {success: false, message: null, intake: -1}
            }
            return {success: true, message: null, intake: data.result}
        }
    }
    catch {
    }
    return {success: false, message: data.error, intake: null};
}

export const calculate_calorie_intake = async (user_id: string, sex: string, weight: number, height: number, age: number, activity: number): Promise<{success: boolean, message:string|null, intake: number|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/calculate_calorie_intake',
        JSON.stringify({
            'user_id': user_id,
            'sex': sex,
            'weight': weight,
            'height': height,
            'age': age,
            'activity': activity
        }),
    );
    
    try {
        if (response.ok) {
            return {success: true, message: null, intake: data.result}
        }
    }
    catch {
    }
    return {success: false, message: data.error, intake: null};
}

//  Food forms
export const submit_form = async (user_id: string, name: string, type: string, description: string): Promise<{success: boolean, message:string|null}> => {    
    const {response, data} = await caller.call_function(
        'create_foods/submit_form',
        JSON.stringify({
            'user_id': user_id,
            'name': name,
            'type': type,
            'description': description
        }),
    );
    
    try {
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {
    }
    return {success: false, message: data.error};
}

export const get_all_pending_forms = async (): Promise<{success: boolean, message: string|null, forms:FoodForm[]|null}> => {    
    const {response, data} = await caller.call_function(
        'create_foods/get_all_pending_forms',
        JSON.stringify({
        }),
    );
    try {    
        if (response.ok) {
            const items: {forms: FoodForm[]} = data;
            return {success: true, message: null, forms: items.forms}
        }
    }
    catch {

    }
    return {success: false, message: data.error, forms: null};
}

export const get_user_forms = async (user_id: string): Promise<{success: boolean, message: string|null, forms: FoodForm[]|null}> => {    
    const {response, data} = await caller.call_function(
        'create_foods/get_user_forms',
        JSON.stringify({
            'user_id': user_id
        }),
    );
    try {    
        if (response.ok) {
            const items: {forms: FoodForm[]} = data;
            return {success: true, message: null, forms: items.forms}
        }
    }
    catch {

    }
    return {success: false, message: data.error, forms: null};
}

export const reject_form = async (form_id: string): Promise<{success: boolean, message: string|null}> => {    
    const {response, data} = await caller.call_function(
        'create_foods/reject_form',
        JSON.stringify({
            'id': form_id
        }),
    );
    try {    
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {

    }
    return {success: false, message: data.error};
}

export const accept_form = async (form_id: string): Promise<{success: boolean, message: string|null}> => {    
    const {response, data} = await caller.call_function(
        'create_foods/accept_form',
        JSON.stringify({
            'id': form_id
        }),
    );
    try {    
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {

    }
    return {success: false, message: data.error};
}

// Plans

export const get_meal_plan = async (user_id: string): Promise<{success: boolean, message: string|null, plan: Plan|null}> => {    
    const {response, data} = await caller.call_function(
        'meal_plan/get_meal_plan',
        JSON.stringify({
            'user_id': user_id
        }),
    );
    try {    
        if (response.ok) {
            const items: { plan: Plan } = data
            return {success: true, message: null, plan: items.plan}
        }
    }
    catch {
        
    }
    return {success: false, message: data.error, plan: null};
}

export const create_meal_plan = async (user_id: string): Promise<{success: boolean, message: string|null, plan_id: string|null}> => {    
    const {response, data} = await caller.call_function(
        'meal_plan/create_meal_plan',
        JSON.stringify({
            'user_id': user_id
        }),
    );
    try {    
        if (response.ok) {
            const items: { plan_id: string } = data
            return {success: true, message: null, plan_id: items.plan_id}
        }
    }
    catch {
        
    }
    return {success: false, message: data.error, plan_id: null};
}

export const add_component = async (plan_id: string, food_id: string, amount: number): Promise<{success: boolean, message: string|null, id: string|null}> => {    
    const {response, data} = await caller.call_function(
        'meal_plan/add_component',
        JSON.stringify({
            'plan_id': plan_id,
            'food_id': food_id,
            'amount': amount
        }),
    );
    try {    
        if (response.ok) {
            return {success: true, message: null, id: data.id}
        }
    }
    catch {
        
    }
    return {success: false, message: data.error, id: null};
}

export const update_component = async (id: string, amount: number): Promise<{success: boolean, message: string|null}> => {    
    const {response, data} = await caller.call_function(
        'meal_plan/update_component',
        JSON.stringify({
            'id': id,
            'amount': amount
        }),
    );
    try {    
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {
        
    }
    return {success: false, message: data.error};
}

export const delete_component = async (id: string): Promise<{success: boolean, message: string|null}> => {    
    const {response, data} = await caller.call_function(
        'meal_plan/delete_component',
        JSON.stringify({
            'id': id
        }),
    );
    try {    
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {
        
    }
    return {success: false, message: data.error};
}

export const get_days_of_plan = async (user_id: string, plan_id: string): Promise<{success: boolean, message: string|null, days: Date[]|null}> => {    
    const {response, data} = await caller.call_function(
        'meal_plan/get_days_plan_is_completed',
        JSON.stringify({
            'user_id': user_id,
            'plan_id': plan_id
        }),
    );
    try {    
        if (response.ok) {
            const items: {days: Date[]} = data
            items.days = items.days.map((value, index) => {
                return new Date(Date.parse(value as unknown as string))
            })
            return {success: true, message: null, days: items.days}
        }
    }
    catch {
        
    }
    return {success: false, message: data.error, days: null};
}

export const mark_day = async (user_id: string, plan_id: string, day: Date): Promise<{success: boolean, message: string|null}> => {    
    const {response, data} = await caller.call_function(
        'meal_plan/mark_day',
        JSON.stringify({
            'user_id': user_id,
            'plan_id': plan_id,
            'day': day.toISOString()
        }),
    );
    try {    
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {
        
    }
    return {success: false, message: data.error};
}

export const get_nutrients_to_foods = async (): Promise<{success: boolean, message: string|null, nutrs_to_foods: Map<String, Set<String>>|null}> => {    
    const {response, data} = await caller.call_function(
        'meal_plan/get_nutrients_to_food',
        JSON.stringify({}),
    );
    try {    
        if (response.ok) {
            const items: { data : NutrFood[]} = data
            let res = new Map<String, Set<String>>() 
            items.data.forEach((value) => {
                let foods = new Set<String>()
                value.food_ids.forEach((value) => {
                    foods.add(value)
                })
                res.set(value.nutr_id, foods)
            })
            return {success: true, message: null, nutrs_to_foods: res}
        }
    }
    catch {
        
    }
    return {success: false, message: data.error, nutrs_to_foods: null};
}

export const get_restrictions = async(user_id: string): Promise<{success: boolean, message: string|null, 
        restrictions: RestrictionItem[] | null}> => {
    const {response, data} = await caller.call_function(
        'settings/get_restrictions',
        JSON.stringify({'user_id': user_id}),
    );
    try {
        if (response.ok) {
            const items: { data: RestrictionItem[] } = data
            return {success: true, message: null, restrictions: items.data}
        }
    }
    catch {

    }
    return {success: false, message: data.error, restrictions: null};
}

export const add_restriction = async(user_id: string, restr_id: string): Promise<{success: boolean, message: string|null}> => {
    const {response, data} = await caller.call_function(
        'settings/add_restriction',
        JSON.stringify({'user_id': user_id, 'restr_id' : restr_id}),
    );
    try {
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {

    }
    return {success: false, message: data.error};
}

export const remove_restriction = async(user_id: string, restr_id: string): Promise<{success: boolean, message: string|null}> => {
    const {response, data} = await caller.call_function(
        'settings/remove_restriction',
        JSON.stringify({'user_id': user_id, 'restr_id' : restr_id}),
    );
    try {
        if (response.ok) {
            return {success: true, message: null}
        }
    }
    catch {

    }
    return {success: false, message: data.error};
}