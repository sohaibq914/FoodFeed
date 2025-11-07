'use client';
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Text,
  AppShell,
  Stack,
  Divider
} from '@mantine/core';
import {} from '@mantine/notifications'
import {FoodItem, NutritionItem, get_food_of_nutrient} from '@/services/DietService'
import FoodCard from './FoodCard'
import { useEffect, useState } from 'react'
import { IconHeart, IconHeartFilled } from '@tabler/icons-react';

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
            <Divider my="md"/>
            <Text>Elligible Foods:</Text>
            {loading ? <Text>Still loading...</Text>: 
                <Stack>
                    {food_items.sort((a, b) => {
                        if (a.favorite) {
                            return -1
                        }
                        else if (b.favorite) {
                            return 1
                        }
                        return 0
                    })
                        .map((value, index) => {
                        return <Group key={value.id}>
                                <FoodCard
                                    food_name={String(value.name)} 
                                    description={String(value.description)}
                                    ></FoodCard>
                                {value.favorite && <IconHeartFilled color='red'/>}
                            </Group>
                    })}
                </Stack>}
        </Container>
    )
}