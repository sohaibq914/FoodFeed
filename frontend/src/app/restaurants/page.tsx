"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {useEffect, useState} from "react";
import { Container, Title, Text, Center, Loader, Stack, Button, Group } from "@mantine/core";
import Link from "next/link";
import { RestaurantsProvider } from "@/contexts/restaurants/RestaurantContext";
import RestaurantSearchBar from "@/components/restaurants/Search";
import RestaurantList from "@/components/restaurants/RestaurantList";

export default function RestaurantsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push("/");
    }, [loading, user, router]);

    if (loading) {
        return (
            <Container size="lg" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
                <Center style={{ width: "100%" }}>
                    <div style={{ textAlign: "center" }}>
                        <Loader size="lg" />
                        <Text mt="md" c="dimmed">Loading…</Text>
                    </div>
                </Center>
            </Container>
        );
    }

    if (!user) return null;

    return (
        <Container size="lg" py="xl">
            <Group justify="space-between" mb="lg">
                <div>
                    <Title order={2}>Restaurants</Title>
                    <Text c="dimmed" mt="sm">Own a restaurant? Add one here!</Text>
                </div>

                <Button component="a" href="/restaurants/create" variant="filled" color="orange">
                    Add your establishment
                </Button>

            </Group>

            <RestaurantsProvider>
                <Stack gap="xl" mt="xl">
                    <RestaurantSearchBar />
                    <RestaurantList />
                </Stack>
            </RestaurantsProvider>
        </Container>
    );
}
