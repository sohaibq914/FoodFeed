"use client";
import { Container, Title, Text } from "@mantine/core";
import RestaurantCreateForm from "@/components/restaurants/RestaurantCreateForm";
import { RestaurantsProvider } from "@/contexts/restaurants/RestaurantContext";

export default function CreateRestaurantPage() {
    return (
        <Container size="sm" py="xl">
            <Title order={2}>Create a Restaurant</Title>
            <Text c="dimmed" mt="sm">Fill out the form to add your restaurant.</Text>
            <RestaurantsProvider>
                <RestaurantCreateForm />
            </RestaurantsProvider>
        </Container>
    );
}
