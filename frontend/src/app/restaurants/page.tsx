"use client";

import React, { useEffect, useState } from "react";
import {
    AppShell,
    Button,
    Group,
    Stack,
    Text,
    Title,
    Paper,
    Tabs,
} from "@mantine/core";
import Header from "@/components/Header";
import { RestaurantsProvider } from "@/contexts/restaurants/RestaurantContext";
import RestaurantSearchBar from "@/components/restaurants/Search";
import RestaurantList from "@/components/restaurants/RestaurantList";
import FavoritesList from "@/components/restaurants/Favorites";
import TrendingRestaurants from "@/components/restaurants/Trending";
import RestaurantDrafts from "@/components/restaurants/Drafts";
import RestaurantApprovals from "@/components/restaurants/Approvals";
import { useAuth } from "@/contexts/AuthContext";

export default function RestaurantsPage() {
    const { user } = useAuth();
    const [isAdmin, setIsAdmin] = useState(false);

    // Call POST /is_admin with user.id
    useEffect(() => {
        if (!user?.id) return;

        fetch("http://localhost:5001/is_admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ user_id: user.id }),
        })
            .then((res) => res.json())
            .then((data) => {
                // backend returns boolean directly
                setIsAdmin(Boolean(data));
            })
            .catch(() => setIsAdmin(false));
    }, [user?.id]);

    return (
        <AppShell header={{ height: 60 }} padding="xl">
            <AppShell.Header>
                <Header showSettingsButton={true} showBackButton={true} />
            </AppShell.Header>

            <AppShell.Main>
                <Title order={1} fw={800}>
                    Restaurants
                </Title>
                <Text c="dimmed" mt="xs" fz="lg">
                    Own a restaurant? Add one here!
                </Text>

                <Group justify="space-between" mt="lg" mb="lg">
                    <Button
                        component="a"
                        href="/restaurants/create"
                        variant="light"
                        color="orange"
                        size="md"
                    >
                        Add your establishment
                    </Button>
                </Group>

                <Paper withBorder radius="xl" p="xl" mt="xl" shadow="md">
                    <Tabs defaultValue="browse" variant="pills" radius="md" keepMounted={false}>
                        <Tabs.List grow>
                            <Tabs.Tab value="browse" fz="lg">Browse</Tabs.Tab>
                            <Tabs.Tab value="favorites" fz="lg">Favorites</Tabs.Tab>
                            <Tabs.Tab value="trending" fz="lg">Trending</Tabs.Tab>
                            <Tabs.Tab value="drafts" fz="lg">Drafts</Tabs.Tab>

                            {isAdmin && (
                                <Tabs.Tab value="approvals" fz="lg">
                                    Approvals
                                </Tabs.Tab>
                            )}
                        </Tabs.List>

                        <Tabs.Panel value="browse" pt="xl">
                            <RestaurantsProvider>
                                <Stack gap="xl" mt="lg">
                                    <RestaurantSearchBar />
                                    <RestaurantList />
                                </Stack>
                            </RestaurantsProvider>
                        </Tabs.Panel>

                        <Tabs.Panel value="favorites" pt="xl">
                            <RestaurantsProvider>
                                <Stack gap="xl" mt="lg">
                                    <FavoritesList />
                                </Stack>
                            </RestaurantsProvider>
                        </Tabs.Panel>

                        <Tabs.Panel value="trending" pt="xl">
                            <RestaurantsProvider>
                                <TrendingRestaurants />
                            </RestaurantsProvider>
                        </Tabs.Panel>

                        <Tabs.Panel value="drafts" pt="xl">
                            <RestaurantDrafts />
                        </Tabs.Panel>

                        {isAdmin && (
                            <Tabs.Panel value="approvals" pt="xl">
                                <RestaurantApprovals />
                            </Tabs.Panel>
                        )}
                    </Tabs>
                </Paper>
            </AppShell.Main>
        </AppShell>
    );
}
