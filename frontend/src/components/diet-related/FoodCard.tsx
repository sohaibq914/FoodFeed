'use client';

import Link from "next/link";
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Text,
  AppShell
} from '@mantine/core';
import { useState } from "react";

interface FoodCardInfo {
    food_name: string,
    description: string,
};

export default function FoodCard({food_name, description}: FoodCardInfo) {
    return (
        <Container>
            <Title order={4}>{food_name}</Title>
            <Text>{description}</Text>
        </Container>
    )
}