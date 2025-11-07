'use client';
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Text,
  AppShell,
  Stack,
  Card
} from '@mantine/core';
import { FoodForm } from '@/services/DietService'

interface FoodFormDisplayInterface {
    item: FoodForm
}

export default function FoodFormDisplay ({item}: FoodFormDisplayInterface) {
    return <Card withBorder radius="md"><Group>
        <Stack>
            <Title order={2}>{item.name}</Title>
            <Title order={4}>{item.type}</Title>
        </Stack>
        <Text>{item.desc}</Text>
    </Group></Card>
}