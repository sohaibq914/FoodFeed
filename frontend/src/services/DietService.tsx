"use client";
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { time } from 'console';
import { API_Caller, get_caller } from '@/misc/Connection'

let caller = get_caller()

export interface FoodItem {
    id: string;
    name: string;
    description: string;
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
export const get_ = async (user_id: string): Promise<{success: boolean, message:}> => {    
    const response = await fetch('http://localhost:5001/dieting/', { //note the port number -andrew
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            'user_id': user_id
        }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
        let templates: { data: [] } = JSON.parse(data.toString())
        return {success: true, message: }
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
            let templates: { data: MealTemplate[] } = data
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

export const get_user_meals = async (user_id: string): Promise<{success: boolean, message: string|null, meals: Meal[]|null, averages: number[]|null}> => {   
    const {response, data} = await caller.call_function(
        'dieting/get_meals',
        JSON.stringify({
            'user_id': user_id,
        }),
    );
    try {
        if (response.ok) {
            let items: { meals: Meal[], averages: number[] } = data
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
    let averages = []
    for (let i = 0; i < 24; i++) {
        averages.push(0)
    }
    return {success: false, message: data.error, meals: null, averages: averages};
}

export const get_user_meals_range = async (user_id: string, start: Date, end: Date): Promise<{success: boolean, message: string|null, meals: Meal[]|null, averages: number[]|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_meal_range',
        JSON.stringify({
            'user_id': user_id,
            'start': start.toISOString(),
            'end': end.toISOString()
        })
    );
      
    try {
        if (response.ok) {
            let items: { meals: Meal[], averages: number[] } = data
            items.meals = items.meals.map((value, index) => {
                value.time_aten = new Date(Date.parse(value.time_aten as unknown as string))
                return value
            }) as Meal[]
            console.log("Meals: " + String(items.meals))
            console.log("Averages: " + String(items.averages))
            return {success: true, message: null, meals: items.meals, averages: items.averages}
        }
    }
    catch {
    }
    return {success: false, message: data.error, meals: null, averages: null};
}

export const get_food_items = async (type: string): Promise<{success: boolean, message: string|null, foods: FoodItem[]|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_food_items',
        JSON.stringify({
            'type': type
        }),
    );
        
    try {
        if (response.ok) {
            console.log("EE")
            let items: { foods: FoodItem[] } = data
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
            let items: { nutrients: NutritionItem[] } = data
            return {success: true, message: null, nutrients: items.nutrients}
        }
    }
    catch {
    }
    return {success: false, message: data.error, nutrients: null};
}

export const get_food_of_type = async (user_id: string, type: string): Promise<{success: boolean, message:string|null, foods:FoodItem[]|null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_elligible_foods',
        JSON.stringify({
            'user_id': user_id,
            'type': type
        })
    );
        
    try {
        if (response.ok) {
            console.log()
            let items: { foods: FoodItem[] } = data
            return {success: true, message: null, foods: items.foods}
        }
    }
    catch {
    }
    return {success: false, message: data.error, foods: null};
}

export const get_food_of_nutrient = async (user_id: string, nutrient_id: string): Promise<{success: boolean, message: string|null, foods: FoodItem[] | null}> => {    
    const {response, data} = await caller.call_function(
        'dieting/get_foods_for_nutrient',
        JSON.stringify({
            'user_id': user_id,
            'nutrient_id': nutrient_id
        }),
    );
    
    try {
        if (response.ok) {
            let items: { foods: FoodItem[] } = data
            console.log("Found foods: ")
            console.log(data)
            return {success: true, message: null, foods: items.foods}
        }
    }
    catch {
    }
    return {success: false, message: data.error, foods: null};
}