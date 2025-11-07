'use client';

import Link from "next/link";
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Text,
  AppShell,
  Card
} from '@mantine/core';
import { useState } from "react";

interface FoodCardInfo {
    food_name: string,
    description: string,
};

export default function FoodCard({food_name, description}: FoodCardInfo) {
    return (
        <Card withBorder
            radius="md"
            p="md" w={700}>
            <Title order={4}>{food_name}</Title>
            <Text>{description}</Text>
        </Card>
    )
}