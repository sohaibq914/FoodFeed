"use client";

import React from "react";
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

export default function RestaurantsPage() {
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
                    <Tabs
                        defaultValue="browse"
                        variant="pills"
                        radius="md"
                        keepMounted={false}
                    >
                        <Tabs.List grow>
                            <Tabs.Tab value="browse" fz="lg">
                                Browse
                            </Tabs.Tab>
                            <Tabs.Tab value="favorites" fz="lg">
                                Favorites
                            </Tabs.Tab>
                            <Tabs.Tab value="trending" fz="lg">
                                Trending
                            </Tabs.Tab>
                            <Tabs.Tab value="drafts" fz="lg">
                                Drafts
                            </Tabs.Tab>
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

                        {/* NEW Drafts tab – no need for RestaurantsProvider since backend already joins restaurant info */}
                        <Tabs.Panel value="drafts" pt="xl">
                            <RestaurantDrafts />
                        </Tabs.Panel>
                    </Tabs>
                </Paper>
            </AppShell.Main>
        </AppShell>
    );
}
