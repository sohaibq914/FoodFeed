'use client';
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Text,
  AppShell,
  Stack
} from '@mantine/core';
import {} from '@mantine/notifications'
import {FoodItem, NutritionItem, get_food_of_nutrient} from '@/services/DietService'
import FoodCard from './FoodCard'
import { useEffect, useState } from 'react'

export interface NutritionInfo {
    user_id: string;
    item: NutritionItem;
}

class NutrItemHolder implements NutritionItem {
    id: string = '';
    name: string = '';
    amount: number = 0;
    description: string = '';
    is_eaten: boolean = false;
}

export default function NutritionCard({user_id, item}: NutritionInfo) {
    const [food_items, set_food_items] = useState([] as FoodItem[])
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const runner = async () => {
            setLoading(true)
            const {success, message, foods} = await get_food_of_nutrient(user_id, item.id);
            console.log("Obtained foods: " + ", " + String(message) + ", " + String(foods))
            if (success) {
                set_food_items(foods!);
            }
            setLoading(false);
        }
        runner();
    }, ['nutrition']);
    
    return (
        <Container>
            <Title order={1}>{item.name}</Title>
            <Text>{item.description}</Text>
            <Text>Elligible Foods:</Text>
            {loading ? <Text>Still loading...</Text>: 
                <Stack>
                    {food_items.map((value, index) => {
                        return <FoodCard
                            food_name={String(value.name)} 
                            description={String(value.description)}
                            key={index}></FoodCard>
                    })}
                </Stack>}
        </Container>
    )
}