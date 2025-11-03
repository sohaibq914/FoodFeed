"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
    Card,
    Stack,
    Group,
    Text,
    Textarea,
    Button,
    Rating,
    Alert,
    Divider,
    TextInput,
    SimpleGrid,
    Paper,
} from "@mantine/core";
import { IconStar } from "@tabler/icons-react";
import { useRestaurants } from "@/contexts/restaurants/RestaurantContext";

export default function RestaurantReviews(): React.ReactElement {
    const {
        createRestaurantReview,
        refreshRestaurantReviews,
        restaurantReviews,
        restaurantReviewsLoading,
        restaurantReviewsError,
    } = useRestaurants() as any;

    const [rid, setRid] = useState<string>("");
    const [author, setAuthor] = useState("");
    const [text, setText] = useState("");
    const [rating, setRating] = useState<number>(0);

    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem("selected_restaurant");
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.id === "string") setRid(parsed.id);
        } catch {}
    }, []);

    const canSubmit = useMemo(
        () => Boolean(rid) && rating >= 1 && rating <= 5,
        [rid, rating]
    );

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setOk(null);

        if (!canSubmit) {
            setErr("A star rating is required.");
            return;
        }

        const finalAuthor = author.trim() || "Anonymous";
        const finalText = text.trim() || "";

        setSubmitting(true);
        const { error } = await createRestaurantReview({
            restaurant_id: rid,
            author: finalAuthor,
            text: finalText,
            rating,
        });


        if (error) {
            setErr(error?.message ?? error?.error ?? String(error));
        } else {
            setOk("Restaurant review submitted");
            setAuthor("");
            setText("");
            setRating(0);
            await refreshRestaurantReviews(rid);
        }
        setSubmitting(false);
    };

    if (!rid) return <Text c="dimmed">No restaurant selected.</Text>;

    return (
        <Stack gap="md">
            <Card withBorder radius="lg" p="lg" shadow="xs">
                <form onSubmit={onSubmit}>
                    <Stack gap="md">
                        <Group justify="space-between" align="center">
                            <Group gap="xs" align="center">
                                <IconStar size={18} />
                                <Text fw={700} fz="lg">Write a Restaurant Review</Text>
                            </Group>
                            <Group gap="sm">
                                <Text size="sm" c="dimmed">Your rating</Text>
                                <Rating value={rating} onChange={setRating} size="lg" />
                            </Group>
                        </Group>

                        {(restaurantReviewsError || err) && (
                            <Alert color="red">{restaurantReviewsError || err}</Alert>
                        )}
                        {ok && <Alert color="green">{ok}</Alert>}

                        <Divider />

                        <TextInput
                            label="Author (optional)"
                            placeholder="Your name"
                            value={author}
                            onChange={(e) => setAuthor(e.currentTarget.value)}
                        />

                        <Textarea
                            label="Review (optional)"
                            placeholder="Share your experience…"
                            autosize
                            minRows={4}
                            maxRows={10}
                            value={text}
                            onChange={(e) => setText(e.currentTarget.value)}
                        />

                        <Group justify="flex-end">
                            <Button
                                type="submit"
                                radius="md"
                                loading={submitting}
                                disabled={!canSubmit || restaurantReviewsLoading}
                            >
                                Submit Restaurant Review
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Card>

            <Paper withBorder radius="lg" p="lg" shadow="xs">
                <Group justify="space-between" align="center" mb="sm">
                    <Text fw={700} fz="lg">Recent Restaurant Reviews</Text>
                    <Button
                        variant="light"
                        onClick={() => void refreshRestaurantReviews(rid)}
                        loading={restaurantReviewsLoading}
                    >
                        Refresh
                    </Button>
                </Group>

                {restaurantReviewsLoading && restaurantReviews.length === 0 ? (
                    <Text c="dimmed">Loading…</Text>
                ) : restaurantReviews.length === 0 ? (
                    <Text c="dimmed">No restaurant reviews yet.</Text>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        {restaurantReviews.map((r: any) => (
                            <Card key={r.id} withBorder radius="md" p="md">
                                <Group justify="space-between" align="center">
                                    <Text fw={600}>{r.author || "Anonymous"}</Text>
                                    <Rating value={r.rating} readOnly />
                                </Group>
                                <Text size="xs" c="dimmed" mt={4}>
                                    {r.timestamp ? new Date(r.timestamp).toLocaleString() : ""}
                                </Text>
                                {r.text && <Text mt="sm">{r.text}</Text>}
                            </Card>
                        ))}
                    </SimpleGrid>
                )}
            </Paper>
        </Stack>
    );
}
