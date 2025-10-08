"use client";
import React from "react";
import { AppShell, Button, Group, Stack, Text, Title } from "@mantine/core";
import Header from "@/components/Header";
import { RestaurantsProvider } from "@/contexts/restaurants/RestaurantContext";
import RestaurantSearchBar from "@/components/restaurants/Search";
import RestaurantList from "@/components/restaurants/RestaurantList";

export default function RestaurantsPage() {
    return (
        <AppShell
            header={{ height: 60 }}
            padding="xl"
        >
            <AppShell.Header>
                <Header showSettingsButton={true} showBackButton={true} />
            </AppShell.Header>

            <AppShell.Main>
                <div>
                    <Title order={2}>Restaurants</Title>
                    <Text c="dimmed" mt="sm">
                        Own a restaurant? Add one here!
                    </Text>
                </div>

                <Group justify="space-between" mb="lg" mt="lg">
                    <Button
                        component="a"
                        href="/restaurants/create"
                        variant="light"
                        color="orange"
                    >
                        Add your establishment
                    </Button>
                </Group>

                <RestaurantsProvider>
                    <Stack gap="xl" mt="xl">
                        <RestaurantSearchBar />
                        <RestaurantList />
                    </Stack>
                </RestaurantsProvider>
            </AppShell.Main>
        </AppShell>
    );
}
