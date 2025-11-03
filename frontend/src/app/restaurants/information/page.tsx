"use client";
import React, { useState, useEffect } from "react";
import { Tabs, Paper, Container } from "@mantine/core";
import RestaurantInformationCard from "@/components/restaurants/Details";
import { RestaurantsProvider, useRestaurants } from "@/contexts/restaurants/RestaurantContext";
import Reviews from "@/components/restaurants/Reviews";
import RestaurantReviews from "@/components/restaurants/RestrauntReviews";

function ReviewsTabs() {
    const { refreshRestaurantReviews } = useRestaurants() as any;
    const [tab, setTab] = useState<string | null>("food");

    useEffect(() => {
        if (tab === "restaurant") {
            const raw = sessionStorage.getItem("selected_restaurant");
            const rid = raw ? JSON.parse(raw)?.id : null;
            if (rid) refreshRestaurantReviews(rid);
        }
    }, [tab]);

    return (
        <Paper withBorder radius="lg" p="md" mt="lg" shadow="xs">
            <Tabs
                value={tab}
                onChange={setTab}
                variant="pills"
                radius="md"
                keepMounted={false}
            >
                <Tabs.List grow>
                    <Tabs.Tab value="food">Food Reviews</Tabs.Tab>
                    <Tabs.Tab value="restaurant">Restaurant Reviews</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="food" pt="md">
                    <Paper radius="md" p="md" withBorder>
                        <Reviews />
                    </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="restaurant" pt="md">
                    <RestaurantReviews />
                </Tabs.Panel>
            </Tabs>
        </Paper>
    );
}

export default function RestaurantInformationPage() {
    return (
        <RestaurantsProvider>
            <Container size="lg" my="lg">
                <RestaurantInformationCard />
                <ReviewsTabs />
            </Container>
        </RestaurantsProvider>
    );
}
