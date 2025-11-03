"use client";
import React, { useEffect, useState } from "react";
import {
    Card,
    Group,
    Text,
    Stack,
    Button,
    Divider,
    Badge,
    Rating,
    ActionIcon,
    Tooltip,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { IconMapPin, IconUser, IconArrowLeft, IconTags, IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { useRestaurants } from "@/contexts/restaurants/RestaurantContext";
import { useAuth } from "@/contexts/AuthContext";

type Restaurant = { id: string; name: string; address: string; owner: string };

const Endpoint = "http://localhost:5001";

export default function RestaurantInformationCard(): React.ReactElement {
    const router = useRouter();
    const { fetchTags, fetchRestaurantAverageRating } = useRestaurants();
    const { user } = useAuth();

    const [r, setR] = useState<Restaurant | null>(null);

    // tags
    const [tags, setTags] = useState<string[]>([]);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagsError, setTagsError] = useState<string | null>(null);

    // rating
    const [avg, setAvg] = useState<number | null>(null);
    const [count, setCount] = useState<number>(0);

    // favorite
    const [fav, setFav] = useState(false);
    const [favLoading, setFavLoading] = useState(false);

    // Load selected restaurant from session
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem("selected_restaurant");
            if (raw) setR(JSON.parse(raw));
        } catch {
            setR(null);
        }
    }, []);

    // Load tags
    useEffect(() => {
        const loadTags = async () => {
            if (!r?.id) return;
            setTagsLoading(true);
            setTagsError(null);
            const { data, error } = await fetchTags(r.id);
            if (error) {
                setTags([]);
                setTagsError("Failed to load tags");
            } else {
                setTags(data || []);
            }
            setTagsLoading(false);
        };
        loadTags();
    }, [r?.id, fetchTags]);

    useEffect(() => {
        if (!r?.id) return;
        (async () => {
            const res = await fetchRestaurantAverageRating(r.id);
            if (res && typeof res.avg_rating === "number") {
                setAvg(res.avg_rating);
                setCount(res.count ?? 0);
            } else {
                setAvg(null);
                setCount(0);
            }
        })();
    }, [r?.id, fetchRestaurantAverageRating]);

    useEffect(() => {
        let alive = true;
        (async () => {
            if (!user?.id || !r?.id) return;
            try {
                const res = await fetch(
                    `${Endpoint}/restaurant_favorites?user=${encodeURIComponent(user.id)}`
                );
                const json = await res.json();
                if (!alive) return;

                // Normalize response to a string[] of restaurant IDs
                const list: string[] = Array.isArray(json?.restaurants)
                    ? json.restaurants
                        .map((item: any) =>
                            typeof item === "string"
                                ? item
                                : item?.restaurant_id ?? item?.r_id ?? item?.id ?? null
                        )
                        .filter(Boolean)
                    : [];
                setFav(list.includes(r.id));
            } catch {
                if (alive) setFav(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, [user?.id, r?.id]);

    const toggleFavorite = async () => {
        if (!user?.id || !r?.id || favLoading) return;
        const next = !fav;
        setFav(next);
        setFavLoading(true);
        try {
            if (next) {
                const res = await fetch(`${Endpoint}/restaurant_favorites`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ restaurant_id: r.id, user: user.id }),
                });
                if (!res.ok) throw new Error("favorite POST failed");
            } else {
                const res = await fetch(`${Endpoint}/restaurant_favorites`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ restaurant_id: r.id, user: user.id }),
                });
                if (!res.ok) throw new Error("favorite DELETE failed");
            }
        } catch {
            setFav(!next);
        } finally {
            setFavLoading(false);
        }
    };

    if (!r) {
        return (
            <Card withBorder radius="lg" p="xl" shadow="sm">
                <Text c="dimmed" ta="center" mb="md">
                    No restaurant selected.
                </Text>
                <Button
                    fullWidth
                    leftSection={<IconArrowLeft size={16} />}
                    variant="light"
                    onClick={() => router.push("/restaurants")}
                >
                    Back to list
                </Button>
            </Card>
        );
    }

    return (
        <Card withBorder radius="lg" p="xl" shadow="sm">
            <Stack gap="md">
                <Group justify="space-between" align="center">
                    <Text fw={700} fz="xl">
                        {r.name}
                    </Text>

                    <Group gap="sm" align="center">
                        {avg !== null && (
                            <Group gap={6} align="center">
                                <Text fw={600}>{avg.toFixed(1)}</Text>
                                <Rating value={avg} readOnly fractions={2} />
                                <Text size="xs" c="dimmed">
                                    ({count})
                                </Text>
                            </Group>
                        )}

                        <Tooltip
                            withArrow
                            label={fav ? "Remove from favorites" : "Add to favorites"}
                        >
                            <ActionIcon
                                variant={fav ? "filled" : "light"}
                                color="red"
                                aria-label="favorite"
                                onClick={toggleFavorite}
                                loading={favLoading}
                            >
                                {fav ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>

                <Divider my="xs" />

                <Group gap="xs">
                    <IconMapPin size={18} stroke={1.8} />
                    <Text size="sm" c="dimmed">
                        {r.address}
                    </Text>
                </Group>

                <Group gap="xs">
                    <IconUser size={18} stroke={1.8} />
                    <Text size="sm">
                        Owner: <Text span fw={600}>{r.owner}</Text>
                    </Text>
                </Group>

                <Group gap="xs" mt="xs">
                    <IconTags size={18} stroke={1.8} />
                    <Text size="sm" fw={600}>
                        Tags:
                    </Text>
                    {tagsLoading && <Text size="sm" c="dimmed">Loading…</Text>}
                    {!tagsLoading && tagsError && <Text size="sm" c="red">{tagsError}</Text>}
                    {!tagsLoading && !tagsError && tags.length === 0 && (
                        <Text size="sm" c="dimmed">No tags yet</Text>
                    )}
                </Group>

                {!tagsLoading && !tagsError && tags.length > 0 && (
                    <Group gap="xs" wrap="wrap">
                        {tags.map((t) => (
                            <Badge key={t} variant="light" radius="sm">
                                {t}
                            </Badge>
                        ))}
                    </Group>
                )}

                <Divider my="xs" />

                <Button
                    mt="md"
                    fullWidth
                    variant="light"
                    color="blue"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={() => router.push("/restaurants")}
                >
                    Back to Restaurants
                </Button>
            </Stack>
        </Card>
    );
}
