"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
    Card,
    Group,
    Text,
    Stack,
    Button,
    Textarea,
    TextInput,
    Rating,
    FileInput,
    Image,
    SimpleGrid,
    Alert,
    Divider,
} from "@mantine/core";
import { useRestaurants } from "@/contexts/restaurants/RestaurantContext";

export default function ReviewsPage(): React.ReactElement {
    const { reviews, reviewsLoading, reviewsError, refreshReviews, createReview } = useRestaurants();

    const [rid, setRid] = useState<string>("");
    const [author, setAuthor] = useState("");
    const [text, setText] = useState("");
    const [rating, setRating] = useState<number>(0);
    const [files, setFiles] = useState<File[] | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);
    const [err, setErr] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem("selected_restaurant");
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.id === "string") setRid(parsed.id);
            refreshReviews(parsed.id);
        } catch {}
    }, []);

    useEffect(() => {
        if (!files || files.length === 0) {
            setPreviews([]);
            return;
        }
        const urls = files.map((f) => URL.createObjectURL(f));
        setPreviews(urls);
        return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }, [files]);

    const canSubmit = useMemo(() => {
        return Boolean(rid) && author.length > 0 && text.length > 0 && rating >= 1 && rating <= 5;
    }, [rid, author, text, rating]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setOk(null);
        if (!canSubmit) {
            setErr("Author, rating, text, and a selected restaurant are required");
            return;
        }
        setSubmitting(true);
        const { error } = await createReview({
            restaurant_id: rid,
            author: author.trim(),
            text: text.trim(),
            rating,
            image: files ?? undefined,
        });
        if (error) {
            setErr(error.error);
        } else {
            setOk("Review(s) submitted");
            setAuthor("");
            setText("");
            setRating(0);
            setFiles(null);
            setPreviews([]);
        }
        setSubmitting(false);
    };

    if (!rid) {
        return <Text c="dimmed">No restaurant selected.</Text>;
    }

    return (
        <Stack mt="lg" gap="md">
            <Group justify="space-between">
                <Text fw={700} fz="lg">
                    Reviews
                </Text>
                <Button
                    variant="light"
                    onClick={() => void refreshReviews(rid)}
                    loading={reviewsLoading}
                >
                    Refresh
                </Button>
            </Group>

            {(reviewsError || err) && <Alert color="red">{reviewsError || err}</Alert>}
            {ok && <Alert color="green">{ok}</Alert>}

            <Card withBorder radius="md" p="md">
                <form onSubmit={submit}>
                    <Stack gap="sm">
                        <Group grow>
                            <TextInput
                                label="Author"
                                placeholder="Your name"
                                value={author}
                                onChange={(e) => setAuthor(e.currentTarget.value)}
                            />
                            <div>
                                <Text size="sm" fw={500} mb={4}>
                                    Rating
                                </Text>
                                <Rating value={rating} onChange={setRating} size="lg" />
                            </div>
                        </Group>
                        <Textarea
                            label="Review"
                            minRows={3}
                            value={text}
                            onChange={(e) => setText(e.currentTarget.value)}
                        />
                        <Group align="end" gap="md">
                            <div style={{ flex: 1 }}>
                                <FileInput
                                    label="Images (optional)"
                                    placeholder="Choose one or more images"
                                    accept="image/*"
                                    multiple
                                    value={files}
                                    onChange={setFiles}
                                    clearable
                                />
                            </div>
                            <Button type="submit" loading={submitting} disabled={!canSubmit}>
                                Submit
                            </Button>
                        </Group>
                        {previews.length > 0 && (
                            <Group>
                                {previews.map((src, i) => (
                                    <Image
                                        key={i}
                                        src={src}
                                        alt="preview"
                                        radius="sm"
                                        w={140}
                                        h={140}
                                        fit="cover"
                                    />
                                ))}
                            </Group>
                        )}
                    </Stack>
                </form>
            </Card>

            <Divider />

            {reviewsLoading && reviews.length === 0 ? (
                <Text c="dimmed">Loading…</Text>
            ) : reviews.length === 0 ? (
                <Text c="dimmed">No reviews yet.</Text>
            ) : (
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {reviews.map((r) => (
                        <Card key={r.id} withBorder radius="md" p="md">
                            <Group justify="space-between">
                                <Text fw={600}>{r.author}</Text>
                                <Rating value={r.rating} readOnly />
                            </Group>
                            <Text size="xs" c="dimmed" mt={4}>
                                {new Date(r.timestamp).toLocaleString()}
                            </Text>
                            <Text mt="sm">{r.text}</Text>
                            {r.image_url ? (
                                <Image
                                    src={r.image_url}
                                    alt="review image"
                                    mt="sm"
                                    radius="sm"
                                    w="100%"
                                    h={220}
                                    fit="cover"
                                />
                            ) : null}
                        </Card>
                    ))}
                </SimpleGrid>
            )}
        </Stack>
    );
}
