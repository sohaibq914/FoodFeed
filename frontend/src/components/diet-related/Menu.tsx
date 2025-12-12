'use client';

import { ActionIcon, Button, Container, Group, Stack, Text, TextInput, Title} from "@mantine/core";
import {FoodItem, get_food_of_type, favorite_food, defavorite_food} from '@/services/DietService'
import { useEffect, useState } from "react";
import FoodCard from "./FoodCard";
import { IconHeart, IconHeartFilled, IconLoader, IconSearch } from "@tabler/icons-react";
interface MenuInfo {
    user_id: string;
    type: string;
}

export default function Menu({user_id, type}: MenuInfo) {
    const [query, set_query] = useState('')
    const [food_items, set_food_items] = useState([] as FoodItem[])
    const [loaded_foods, set_loaded_foods] = useState(0)
    const [loading, setLoading] = useState(true);

    const load_more_foods = async(already_loaded: number) => {
        const {success, message, foods} = await get_food_of_type(user_id, type, query, already_loaded);
        if (success) {
            const len = already_loaded + foods?.length!
            console.log(already_loaded)
            if (already_loaded == 0) {
                set_food_items(foods!)
            }
            else {
                set_food_items(food_items.concat(foods!));
            }
            set_loaded_foods(len)
        }
    }

    useEffect(() => {
        const runner = async () => {
            setLoading(true)
            await load_more_foods(loaded_foods)
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
                    <Button type="button" leftSection={<IconSearch size={16} /> as React.ReactNode}
                        onClick={(e) => {
                            set_loaded_foods(0)
                            set_food_items([] as FoodItem[])
                            load_more_foods(0)
                        }}>
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
                    .map((value, index) => {
                        return <Group key={index}>
                                <FoodCard food_name={String(value.name)} 
                                description={String(value.description)}
                                type={type}></FoodCard>
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
                <ActionIcon
                    color="blue"
                    size="md"
                    radius="xl"
                    onClick={(e) => {load_more_foods(loaded_foods)}}
                    style={{
                    transition: "all 0.2s ease",
                    }}>
                    <IconLoader/>
                </ActionIcon>
            </Stack>}
    </Container>)
}