'use client';

import { Container, Stack, Text, Title} from "@mantine/core";
import {FoodItem, get_food_of_type} from '@/services/DietService'
import { useEffect, useState } from "react";
import FoodCard from "./FoodCard";
interface MenuInfo {
    user_id: string;
    type: string;
}

export default function Menu({user_id, type}: MenuInfo) {
    const [food_items, set_food_items] = useState([] as FoodItem[])
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const runner = async () => {
            setLoading(true)
            const {success, message, foods} = await get_food_of_type(user_id, type);
            if (success) {
                set_food_items(foods!);
            }
            setLoading(false);
        }
        runner();
    }, ['foods']);
    
    return (<Container>
        {loading ? <Text>Still loading...</Text>: 
            <Stack align='flex-start'>
                {food_items.map((value, index) => {
                    return <FoodCard 
                        food_name={String(value.name)} 
                        description={String(value.description)}
                        key={index}></FoodCard>
                })}
            </Stack>}
    </Container>)
}