'use client';

import { ActionIcon, Button, Container, Group, Stack, Text, TextInput, Title} from "@mantine/core";
import {FoodItem, get_food_of_type, favorite_food, defavorite_food} from '@/services/DietService'
import { useEffect, useState } from "react";
import FoodCard from "./FoodCard";
import { IconHeart, IconHeartFilled, IconSearch } from "@tabler/icons-react";
interface MenuInfo {
    user_id: string;
    type: string;
}

export default function Menu({user_id, type}: MenuInfo) {
    const [query, set_query] = useState('')
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
    
    const change_favorite_status = async (item: FoodItem) => {
        const {success, message} = (!item.favorite) ? 
            await favorite_food(user_id, item.id) :
            await defavorite_food(user_id, item.id)
        if (success) {
            set_food_items(food_items.map((value, index) => {
                if (value.id == item.id) {
                    value.favorite = !value.favorite;
                }
                return value
            }))
        }
    }

    return (<Container>
        {loading ? <Text>Still loading...</Text>: 
            <Stack align='flex-start'>
                <Group align="end" mb="xs" wrap="wrap">
                    <TextInput
                        label="Search"
                        placeholder="Name"
                        value={query}
                        onChange={(e) => set_query(e.currentTarget.value)}
                        style={{ flex: 1, minWidth: 120 }}
                    />
                    <Button type="button" disabled leftSection={<IconSearch size={16} /> as React.ReactNode}>
                    </Button>
                </Group>
                {food_items
                    .toSorted((a, b) => {
                        if (a.favorite) {
                            return -1;
                        }
                        else if (b.favorite) {
                            return 1;
                        }
                        return 0;
                    })
                    .filter((value) => {
                        return value.name.toLowerCase().includes(query.toLowerCase())
                    }).map((value, index) => {
                        return <Group key={index}>
                                <FoodCard food_name={String(value.name)} 
                                description={String(value.description)}></FoodCard>
                                <Group gap="xs" align="center" onClick={(e) => e.preventDefault()}>
                                    <ActionIcon
                                        variant={value.favorite ? "filled" : "light"}
                                        color={value.favorite ? "red" : "gray"}
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => change_favorite_status(value)}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}
                                    >
                                        {value.favorite ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                                    </ActionIcon>
                                </Group>
                            </Group>
                    })}
            </Stack>}
    </Container>)
}