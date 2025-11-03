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
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";

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

export default function RestaurantList(): React.ReactElement {
    const router = useRouter();
    const { items, loading, refresh, filter, tagQuery, fetchTags } = useRestaurants();
    const { user } = useAuth();
    const userId = user?.id;

    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [syncingId, setSyncingId] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        if (!userId) return;
        (async () => {
            try {
                const res = await fetch(`${Endpoint}/restaurant_favorites?user=${encodeURIComponent(userId)}`);
                const json = await res.json();
                if (!alive) return;
                if (res.ok && Array.isArray(json.restaurants)) {
                    setFavorites(new Set(json.restaurants));
                } else {
                    setFavorites(new Set());
                }
            } catch {
                if (alive) setFavorites(new Set());
            }
        })();
        return () => {
            alive = false;
        };
    }, [userId]);

    const isFav = useCallback((id: string) => favorites.has(id), [favorites]);

    const toggleFav = useCallback(
        async (id: string) => {
            if (!userId) return;
            const willFav = !favorites.has(id);

            const next = new Set(favorites);
            if (willFav) next.add(id);
            else next.delete(id);
            setFavorites(new Set(next));
            setSyncingId(id);

            try {
                if (willFav) {
                    const res = await fetch(`${Endpoint}/restaurant_favorites`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ restaurant_id: id, user: userId }),
                    });
                    if (!res.ok) throw new Error("POST failed");
                } else {
                    const res = await fetch(`${Endpoint}/restaurant_favorites`, {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ restaurant_id: id, user: userId }),
                    });
                    if (!res.ok) throw new Error("DELETE failed");
                }
            } catch {
                setFavorites(new Set(favorites));
            } finally {
                setSyncingId(null);
            }
        },
        [favorites, userId]
    );

    const bumpTrending = useCallback(async (id: string, name: string) => {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 300); // don’t block navigation
        try {
            await fetch(`${Endpoint}/rest_trending/view`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ restaurant_id: id, name }),
                signal: controller.signal,
            });
        } catch {
        } finally {
            clearTimeout(t);
        }
    }, []);

    const textFiltered = useMemo(() => {
        const q = (filter || "").toLowerCase().trim();
        if (!q) return items;
        return items.filter((r) =>
            [r.name, r.address, r.owner].some((v) => v.toLowerCase().includes(q))
        );
    }, [items, filter]);

    const [tagMatches, setTagMatches] = useState<Set<string>>(new Set());
    const [tagLoading, setTagLoading] = useState(false);

    useEffect(() => {
        let alive = true;
        const run = async () => {
            const selected = (tagQuery ?? []).map((t) => (t as string).toLowerCase().trim());
            if (selected.length === 0) {
                if (alive) {
                    setTagMatches(new Set());
                    setTagLoading(false);
                }
                return;
            }
            setTagLoading(true);
            const results = await Promise.all(
                textFiltered.map(async (r) => {
                    const { data } = await fetchTags(r.id);
                    const lower = (data || []).map((t: string) => String(t).toLowerCase());
                    const has = lower.some((t) => selected.includes(t));
                    return { id: r.id, has };
                })
            );
            if (!alive) return;
            setTagMatches(new Set(results.filter((x) => x.has).map((x) => x.id)));
            setTagLoading(false);
        };
        run();
        return () => {
            alive = false;
        };
    }, [tagQuery, textFiltered, fetchTags]);

    const filtered = useMemo(() => {
        const hasTags = (tagQuery ?? []).length > 0;
        if (!hasTags) return textFiltered;
        return textFiltered.filter((r) => tagMatches.has(r.id));
    }, [textFiltered, tagQuery, tagMatches]);

    if (!userId) return <Text c="red">You must be signed in.</Text>;
    if (loading && items.length === 0) return <Text c="dimmed">Loading…</Text>;
    if (!loading && filtered.length === 0) {
        if ((tagQuery ?? []).length > 0 && tagLoading) return <Text c="dimmed">Searching tags…</Text>;
        return <Text c="dimmed">No restaurants match your search.</Text>;
    }

    return (
        <>
            <Group justify="space-between" mb="sm">
                <Text fw={600}>Restaurants</Text>
                <Button variant="light" onClick={refresh}>Refresh</Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                {filtered.map((r) => (
                    <Card
                        key={r.id}
                        withBorder
                        radius="md"
                        p="md"
                        onClick={async () => {
                            await bumpTrending(r.id, r.name);

                            sessionStorage.setItem(
                                "selected_restaurant",
                                JSON.stringify({
                                    id: r.id,
                                    name: r.name,
                                    address: r.address,
                                    owner: r.owner,
                                })
                            );
                            router.push("/restaurants/information");
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        <Group justify="space-between" align="center">
                            <Text fw={600}>{r.name}</Text>

                            <Tooltip
                                label={isFav(r.id) ? "Remove from favorites" : "Add to favorites"}
                                withArrow
                            >
                                <ActionIcon
                                    variant={isFav(r.id) ? "filled" : "light"}
                                    color="red"
                                    aria-label="favorite"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (syncingId === r.id) return;
                                        void toggleFav(r.id);
                                    }}
                                >
                                    {isFav(r.id) ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
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
