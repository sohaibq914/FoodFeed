"use client";

import React, { useEffect, useState } from "react";
import {
    Stack,
    Text,
    Alert,
    SimpleGrid,
    Card,
    Group,
    Button,
    Badge,
} from "@mantine/core";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

type RestaurantRow = {
    id: string;
    name: string;
    address?: string | null;
    owner?: string | null;        // what the user typed
    owner_email?: string | null;  // NEW: from users table via u_id
    approved?: boolean | null;
};

export default function RestaurantApprovals(): React.ReactElement {
    const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchUnapproved = async () => {
        setLoading(true);
        setErr(null);
        setSuccess(null);

        try {
            const res = await fetch(`${API_BASE_URL}/restaurants/unapproved`);
            const json = await res.json();

            if (!res.ok) {
                setErr(json.error ?? "Failed to load unapproved restaurants");
                setRestaurants([]);
                return;
            }

            setRestaurants((json.restaurants ?? []) as RestaurantRow[]);
        } catch {
            setErr("Network error while fetching unapproved restaurants");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchUnapproved();
    }, []);

    const handleApprove = async (r: RestaurantRow) => {
        setErr(null);
        setSuccess(null);

        try {
            const res = await fetch(
                `${API_BASE_URL}/restaurants/${encodeURIComponent(r.id)}/approve`,
                {
                    method: "POST",
                }
            );
            const json = await res.json();

            if (!res.ok) {
                setErr(json.error ?? "Failed to approve restaurant");
                return;
            }

            setSuccess(`Approved "${r.name}"`);
            setRestaurants((prev) => prev.filter((x) => x.id !== r.id));
        } catch {
            setErr("Network error while approving restaurant");
        }
    };

    const handleDisapprove = async (r: RestaurantRow) => {
        setErr(null);
        setSuccess(null);

        try {
            const res = await fetch(
                `${API_BASE_URL}/restaurants/${encodeURIComponent(r.id)}`,
                {
                    method: "DELETE",
                }
            );
            const json = await res.json();

            if (!res.ok) {
                setErr(json.error ?? "Failed to delete restaurant");
                return;
            }

            setSuccess(`Deleted "${r.name}"`);
            setRestaurants((prev) => prev.filter((x) => x.id !== r.id));
        } catch {
            setErr("Network error while deleting restaurant");
        }
    };

    if (loading && restaurants.length === 0) {
        return <Text c="dimmed">Loading unapproved restaurants…</Text>;
    }

    return (
        <Stack gap="md" mt="lg">
            {err && <Alert color="red">{err}</Alert>}
            {success && <Alert color="green">{success}</Alert>}

            {restaurants.length === 0 ? (
                <Text c="dimmed">No unapproved restaurants at the moment.</Text>
            ) : (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                    {restaurants.map((r) => (
                        <Card key={r.id} withBorder radius="lg" p="lg" shadow="sm">
                            <Stack gap="xs">
                                <Group justify="space-between" align="center">
                                    <Text fw={700} fz="lg">
                                        {r.name}
                                    </Text>
                                    <Badge color="yellow" variant="light">
                                        Pending Approval
                                    </Badge>
                                </Group>

                                {r.address && (
                                    <Text size="sm" c="dimmed">
                                        {r.address}
                                    </Text>
                                )}

                                {r.owner && (
                                    <Text size="sm" c="dimmed">
                                        Owner: {r.owner}
                                    </Text>
                                )}

                                {r.owner_email && (
                                    <Text size="sm" c="dimmed">
                                        Submitted by: {r.owner_email}
                                    </Text>
                                )}

                                <Group justify="flex-end" mt="sm">
                                    <Button
                                        variant="outline"
                                        color="red"
                                        onClick={() => handleDisapprove(r)}
                                    >
                                        Disapprove & Delete
                                    </Button>
                                    <Button
                                        variant="filled"
                                        color="green"
                                        onClick={() => handleApprove(r)}
                                    >
                                        Approve
                                    </Button>
                                </Group>
                            </Stack>
                        </Card>
                    ))}
                </SimpleGrid>
            )}
        </Stack>
    );
}
