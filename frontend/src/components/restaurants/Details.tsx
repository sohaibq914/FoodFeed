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
    Rating
} from "@mantine/core";
import { useRouter } from "next/navigation";
import {
    IconMapPin,
    IconUser,
    IconArrowLeft,
    IconTags
} from "@tabler/icons-react";
import { useRestaurants } from "@/contexts/restaurants/RestaurantContext";

type Restaurant = { id: string; name: string; address: string; owner: string };

export default function RestaurantInformationCard(): React.ReactElement {
    const router = useRouter();
    const { fetchTags, fetchRestaurantAverageRating } = useRestaurants();

    const [r, setR] = useState<Restaurant | null>(null);
    const [tags, setTags] = useState<string[]>([]);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagsError, setTagsError] = useState<string | null>(null);

    const [avg, setAvg] = useState<number | null>(null);
    const [count, setCount] = useState<number>(0);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem("selected_restaurant");
            if (raw) setR(JSON.parse(raw));
        } catch {
            setR(null);
        }
    }, []);

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

        const loadAvg = async () => {
            const res = await fetchRestaurantAverageRating(r.id);
            if (res && typeof res.avg_rating === "number") {
                setAvg(res.avg_rating);
                setCount(res.count ?? 0);
            } else {
                setAvg(null);
                setCount(0);
            }
        };

        loadAvg();
    }, [r?.id]);

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

                    {avg !== null && (
                        <Group gap={6} align="center">
                            <Text fw={600}>{avg.toFixed(1)}</Text>
                            <Rating value={avg} readOnly fractions={2} />
                            <Text size="xs" c="dimmed">({count})</Text>
                        </Group>
                    )}
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
                    <Text size="sm" fw={600}>Tags:</Text>
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
