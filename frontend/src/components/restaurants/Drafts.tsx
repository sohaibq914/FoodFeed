"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
    Stack,
    Text,
    Alert,
    SimpleGrid,
    Card,
    Group,
    Badge,
    Textarea,
    Button,
    Rating,
    Divider,
} from "@mantine/core";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5001";

type DraftRow = {
    id: number;
    r_id: string;
    u_id: string;
    name?: string;          // may be "name"
    author?: string;        // or "author"
    text: string;
    rating: number | null;
};

type RestaurantRow = {
    id: string;
    name: string;
    address?: string | null;
    owner?: string | null;
};

export default function RestaurantDrafts(): React.ReactElement {
    const { user } = useAuth();

    const [drafts, setDrafts] = useState<DraftRow[]>([]);
    const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [editingTexts, setEditingTexts] = useState<Record<number, string>>({});
    const [editingRatings, setEditingRatings] = useState<
        Record<number, number | null>
    >({});

    const restaurantMap = useMemo(() => {
        const m = new Map<string, RestaurantRow>();
        restaurants.forEach((r) => m.set(r.id, r));
        return m;
    }, [restaurants]);

    const fetchDrafts = async () => {
        if (!user?.id) return;

        setLoading(true);
        setErr(null);
        setSuccess(null);

        try {
            const res = await fetch(
                `${API_BASE_URL}/restaurant_review_drafts?u_id=${encodeURIComponent(
                    user.id
                )}`
            );
            const json = await res.json();

            if (!res.ok) {
                setErr(json.error ?? "Failed to load drafts");
                setDrafts([]);
                setRestaurants([]);
                return;
            }

            const draftsList = (json.drafts ?? []) as DraftRow[];
            const restaurantsList = (json.restaurants ?? []) as RestaurantRow[];

            setDrafts(draftsList);
            setRestaurants(restaurantsList);

            const texts: Record<number, string> = {};
            const ratings: Record<number, number | null> = {};
            draftsList.forEach((d) => {
                texts[d.id] = d.text ?? "";
                ratings[d.id] = d.rating ?? null;
            });
            setEditingTexts(texts);
            setEditingRatings(ratings);
        } catch {
            setErr("Network error while fetching drafts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.id) {
            void fetchDrafts();
        }
    }, [user?.id]);

    const handleSaveDraft = async (draft: DraftRow) => {
        setErr(null);
        setSuccess(null);

        const newText = editingTexts[draft.id] ?? "";
        const newRating = editingRatings[draft.id];

        try {
            const res = await fetch(
                `${API_BASE_URL}/restaurant_review_drafts/${draft.id}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: newText,
                        rating:
                            newRating !== null && newRating !== undefined
                                ? newRating
                                : null,
                    }),
                }
            );

            const json = await res.json();
            if (!res.ok) {
                setErr(json.error ?? "Failed to update draft");
                return;
            }

            setSuccess("Draft updated");
            setDrafts((prev) =>
                prev.map((d) =>
                    d.id === draft.id
                        ? { ...d, text: newText, rating: newRating ?? null }
                        : d
                )
            );
        } catch {
            setErr("Network error while updating draft");
        }
    };

    const handlePostDraft = async (draft: DraftRow) => {
        setErr(null);
        setSuccess(null);

        const newText = editingTexts[draft.id] ?? "";
        const newRating = editingRatings[draft.id];

        if (
            newRating === null ||
            newRating === undefined ||
            newRating < 1 ||
            newRating > 5
        ) {
            setErr("A rating between 1 and 5 is required to post a review.");
            return;
        }

        const author = draft.name || draft.author || user?.email || "Anonymous";

        try {
            // 1) create the real review
            const reviewRes = await fetch(`${API_BASE_URL}/restaurant_reviews`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    restaurant_id: draft.r_id,
                    author,
                    text: newText,
                    rating: newRating,
                }),
            });

            const reviewJson = await reviewRes.json();
            if (!reviewRes.ok) {
                setErr(reviewJson.error ?? "Failed to post review");
                return;
            }

            // 2) delete the draft from backend
            const deleteRes = await fetch(
                `${API_BASE_URL}/restaurant_review_drafts/${draft.id}`,
                { method: "DELETE" }
            );
            const deleteJson = await deleteRes.json();
            if (!deleteRes.ok) {
                setErr(deleteJson.error ?? "Failed to delete draft after posting");
                return;
            }

            setSuccess("Review posted and draft removed");

            // 3) remove the draft from local state
            setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
            setEditingTexts((prev) => {
                const copy = { ...prev };
                delete copy[draft.id];
                return copy;
            });
            setEditingRatings((prev) => {
                const copy = { ...prev };
                delete copy[draft.id];
                return copy;
            });
        } catch {
            setErr("Network error while posting review");
        }
    };


    if (!user?.id) {
        return <Text c="dimmed">You must be logged in to view your drafts.</Text>;
    }

    if (loading && drafts.length === 0) {
        return <Text c="dimmed">Loading drafts…</Text>;
    }

    return (
        <Stack gap="md" mt="lg">
            {err && <Alert color="red">{err}</Alert>}
            {success && <Alert color="green">{success}</Alert>}

            {drafts.length === 0 ? (
                <Text c="dimmed">You have no restaurant review drafts yet.</Text>
            ) : (
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                    {drafts.map((draft) => {
                        const r = restaurantMap.get(draft.r_id);
                        const author = draft.name || draft.author || "Anonymous";

                        return (
                            <Card key={draft.id} withBorder radius="lg" p="lg" shadow="sm">
                                <Stack gap="sm">
                                    <Group justify="space-between" align="flex-start">
                                        <Stack gap={2} style={{ flex: 1 }}>
                                            <Group justify="space-between" align="center">
                                                <Text fw={700} fz="lg">
                                                    {r?.name ?? "Unknown restaurant"}
                                                </Text>
                                                <Badge color="orange" variant="light">
                                                    Draft
                                                </Badge>
                                            </Group>

                                            {r?.address && (
                                                <Text size="sm" c="dimmed">
                                                    {r.address}
                                                </Text>
                                            )}

                                            {r?.owner && (
                                                <Text size="sm" c="dimmed">
                                                    Owner: {r.owner}
                                                </Text>
                                            )}

                                            <Text size="sm" c="dimmed">
                                                Author: {author}
                                            </Text>
                                        </Stack>
                                    </Group>

                                    <Divider my="sm" />

                                    <Stack gap="xs">
                                        <Group justify="space-between" align="center">
                                            <Text size="sm" c="dimmed">
                                                Your draft review
                                            </Text>
                                            <Rating
                                                value={editingRatings[draft.id] ?? 0}
                                                onChange={(value) =>
                                                    setEditingRatings((prev) => ({
                                                        ...prev,
                                                        [draft.id]:
                                                            value >= 1 && value <= 5 ? value : null,
                                                    }))
                                                }
                                                size="md"
                                            />
                                        </Group>

                                        <Textarea
                                            autosize
                                            minRows={3}
                                            maxRows={8}
                                            value={editingTexts[draft.id] ?? ""}
                                            onChange={(event: any) => {
                                                if (!event) return;
                                                const value =
                                                    typeof event === "string"
                                                        ? event
                                                        : event.currentTarget?.value ?? "";
                                                setEditingTexts((prev) => ({
                                                    ...prev,
                                                    [draft.id]: value,
                                                }));
                                            }}
                                        />

                                        <Group justify="flex-end" mt="xs">
                                            <Button
                                                variant="light"
                                                onClick={() => handleSaveDraft(draft)}
                                            >
                                                Save Draft
                                            </Button>
                                            <Button
                                                variant="filled"
                                                onClick={() => handlePostDraft(draft)}
                                            >
                                                Post Review
                                            </Button>
                                        </Group>
                                    </Stack>
                                </Stack>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            )}
        </Stack>
    );
}
