'use client';

import {Meal} from '@/services/DietService'
import { Container, Group, Stack, Text, Title } from '@mantine/core'
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
    return (<Container>
        <Group>
            <Stack>
                <Title>{meal.name}</Title>
                <Text>{meal.calories}</Text>
            </Stack>
            <Text>{meal.time_aten.toString()}</Text>
        </Group>
    </Container>)
}