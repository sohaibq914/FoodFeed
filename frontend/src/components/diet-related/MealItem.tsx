'use client';

import {Meal} from '@/services/DietService'
import { Card, Container, Divider, Group, Stack, Text, Title } from '@mantine/core'
import { useState } from 'react'

interface MealItemInfo {
    meal: Meal,
}

class TempMeal implements Meal {
    id: string = ''
    name: string = ''
    calories: number = 0
    time_aten: Date = new Date(0)
}
export default function MealItem({meal}: MealItemInfo) {
    console.log(meal.time_aten)
    return (<Container>
        <Group>
            <Stack>
                <Title order={3}>{meal.name}</Title>
                <Text>{meal.calories}</Text>
            </Stack>
            <Stack>
                <Text>{meal.time_aten.toLocaleDateString()}</Text>
                <Text>{meal.time_aten.toLocaleTimeString()}</Text>
            </Stack>
        </Group>
    </Container>)
}