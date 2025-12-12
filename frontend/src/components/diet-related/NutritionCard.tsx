'use client';
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Text,
  AppShell,
  Stack,
  Divider,
  ActionIcon
} from '@mantine/core';
import {} from '@mantine/notifications'
import {FoodItem, NutritionItem, get_food_of_nutrient} from '@/services/DietService'
import FoodCard from './FoodCard'
import { useEffect, useState } from 'react'
import { IconHeart, IconHeartFilled, IconLoader } from '@tabler/icons-react';

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
    const [query, set_query] = useState('')
    const [food_items, set_food_items] = useState([] as FoodItem[])
    const [loaded_foods, set_loaded_foods] = useState(0)
    const [loading, setLoading] = useState(true);
    
    const load_more_foods = async () => {
        const {success, message, foods} = await get_food_of_nutrient(user_id, item.id, query, loaded_foods);
        if (success) {
            const len = loaded_foods + foods?.length!
            set_food_items(food_items.concat(foods!));
            set_loaded_foods(len)
        }
    }
    useEffect(() => {
        const runner = async () => {
            setLoading(true)
            await load_more_foods()
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
                    {food_items.length == 0 ? <Text>-- Sorry, we're still currently looking into this!</Text>: <></>}
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
                                    type={""}
                                    description={String(value.description)}
                                    ></FoodCard>
                                {value.favorite && <IconHeartFilled color='red'/>}
                            </Group>
                    })}
                    <ActionIcon
                        color="blue"
                        size="md"
                        radius="xl"
                        onClick={(e) => {load_more_foods()}}
                        style={{
                        transition: "all 0.2s ease",
                        }}>
                        <IconLoader/>
                    </ActionIcon>
                </Stack>}
        </Container>
    )
}