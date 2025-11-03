"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRestaurants } from "@/contexts/restaurants/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";
import {
    Card,
    Group,
    Text,
    Stack,
    SimpleGrid,
    Button,
    Badge,
    ActionIcon,
    Tooltip,
} from "@mantine/core";
import { IconHeartFilled } from "@tabler/icons-react";

const Endpoint = "http://localhost:5001";

function RestaurantTags({ restaurantId }: { restaurantId: string }) {
    const { fetchTags } = useRestaurants();
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            setErr(null);
            const { data, error } = await fetchTags(restaurantId);
            if (!alive) return;
            if (error) {
                setErr("Failed to load tags");
                setTags([]);
            } else {
                setTags(data || []);
            }
            setLoading(false);
        })();
        return () => {
            alive = false;
        };
    }, [restaurantId, fetchTags]);

    if (loading) return <Text size="sm" c="dimmed">Loading tags…</Text>;
    if (err) return <Text size="sm" c="red">{err}</Text>;
    if (tags.length === 0) return null;

    return (
        <Group gap="xs" mt={6} wrap="wrap">
            {tags.map((t) => (
                <Badge key={`${restaurantId}-${t}`} size="sm" variant="light" radius="sm">
                    {t}
                </Badge>
            ))}
        </Group>
    );
}

export default function FavoritesList(): React.ReactElement {
    const router = useRouter();
    const { user } = useAuth();
    const { items, loading, refresh, fetchTags } = useRestaurants();

    const [favIds, setFavIds] = useState<Set<string>>(new Set());
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const userId = user?.id;

    // Load favorites for this user
    useEffect(() => {
        let alive = true;
        if (!userId) return;
        (async () => {
            try {
                const res = await fetch(`${Endpoint}/restaurant_favorites?user=${encodeURIComponent(userId)}`);
                const json = await res.json();
                if (!alive) return;
                if (res.ok && Array.isArray(json.restaurants)) {
                    setFavIds(new Set(json.restaurants));
                } else {
                    setFavIds(new Set());
                }
            } catch {
                if (alive) setFavIds(new Set());
            }
        })();
        return () => { alive = false; };
    }, [userId]);

    // Ensure we have restaurants loaded so we can map IDs → cards
    useEffect(() => {
        if (!loading && items.length === 0) {
            void refresh();
        }
    }, [loading, items.length, refresh]);

    const favorites = useMemo(
        () => items.filter((r) => favIds.has(r.id)),
        [items, favIds]
    );

    const unFavorite = useCallback(
        async (restaurantId: string) => {
            if (!userId) return;
            // optimistic update
            const next = new Set(favIds);
            next.delete(restaurantId);
            setFavIds(new Set(next));
            setSyncingId(restaurantId);
            try {
                const res = await fetch(`${Endpoint}/restaurant_favorites`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ restaurant_id: restaurantId, user: userId }),
                });
                if (!res.ok) throw new Error("DELETE failed");
            } catch {
                // rollback
                const rollback = new Set(favIds);
                setFavIds(rollback);
            } finally {
                setSyncingId(null);
            }
        },
        [favIds, userId]
    );

    if (!userId) return <Text c="red">You must be signed in.</Text>;

    if (loading && items.length === 0) return <Text c="dimmed">Loading…</Text>;
    if (favorites.length === 0)
        return (
            <Stack gap="md" align="center">
                <Text fz="lg" c="dimmed">No favorites yet.</Text>
                <Button variant="light" onClick={refresh}>Refresh</Button>
            </Stack>
        );

    return (
        <>
            <Group justify="space-between" mb="sm">
                <Text fw={600}>Your Favorites</Text>
                <Button variant="light" onClick={refresh}>Refresh</Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {favorites.map((r) => (
                    <Card
                        key={r.id}
                        withBorder
                        radius="md"
                        p="md"
                        onClick={() => {
                            sessionStorage.setItem(
                                "selected_restaurant",
                                JSON.stringify({ id: r.id, name: r.name, address: r.address, owner: r.owner })
                            );
                            router.push("/restaurants/information");
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        <Group justify="space-between" align="center">
                            <Text fw={600}>{r.name}</Text>

                            <Tooltip label="Remove from favorites" withArrow>
                                <ActionIcon
                                    variant="filled"
                                    color="red"
                                    aria-label="unfavorite"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (syncingId === r.id) return;
                                        void unFavorite(r.id);
                                    }}
                                >
                                    <IconHeartFilled size={18} />
                                </ActionIcon>
                            </Tooltip>
                        </Group>

                        <Stack gap={4} mt="xs">
                            <Text size="sm" c="dimmed">{r.address}</Text>
                            <Text size="sm">
                                Owner: <Text span fw={600}>{r.owner}</Text>
                            </Text>
                            <RestaurantTags restaurantId={r.id} />
                        </Stack>
                    </Card>
                ))}
            </SimpleGrid>
        </>
    );
}
