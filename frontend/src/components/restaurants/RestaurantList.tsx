"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRestaurants } from "@/contexts/restaurants/RestaurantContext";
import { Card, Group, Text, Stack, SimpleGrid, Button, Badge } from "@mantine/core";

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
                setTags(Array.isArray(data) ? data : []);
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
            const tq = (tagQuery || "").toLowerCase().trim();
            if (!tq) {
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
                    const has = (data || []).some((t) => String(t).toLowerCase().includes(tq));
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
        const tq = (tagQuery || "").trim();
        if (!tq) return textFiltered;
        return textFiltered.filter((r) => tagMatches.has(r.id));
    }, [textFiltered, tagQuery, tagMatches]);

    if (loading && items.length === 0) return <Text c="dimmed">Loading…</Text>;
    if (!loading && filtered.length === 0) {
        if ((tagQuery || "").trim() && tagLoading) return <Text c="dimmed">Searching tags…</Text>;
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
                        onClick={() => {
                            sessionStorage.setItem(
                                "selected_restaurant",
                                JSON.stringify({ id: r.id, name: r.name, address: r.address, owner: r.owner })
                            );
                            router.push("/restaurants/information");
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        <Group justify="space-between">
                            <Text fw={600}>{r.name}</Text>
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
