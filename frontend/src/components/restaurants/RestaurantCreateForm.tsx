"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useRestaurants } from "@/contexts/restaurants/RestaurantContext";
import {
    Paper,
    Title,
    Text,
    Stack,
    TextInput,
    Group,
    Button,
    Alert,
    Badge,
    ActionIcon,
} from "@mantine/core";
import { IconPlus, IconX } from "@tabler/icons-react";

const toMsg = (e: unknown): string => {
    if (!e) return "";
    if (typeof e === "string") return e;
    const anyE = e as any;
    if (typeof anyE.message === "string") return anyE.message;
    if (typeof anyE.error === "string") return anyE.error;
    if (typeof anyE.error?.message === "string") return anyE.error.message;
    try {
        return JSON.stringify(e);
    } catch {
        return "Unknown error";
    }
};

export default function RestaurantCreateForm() {
    const router = useRouter();
    const { addRestaurant, addRestaurantTags } = useRestaurants();

    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [owner, setOwner] = useState("");

    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState<string[]>([]);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [ok, setOk] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    function addTag() {
        const t = tagInput.trim();
        if (!t) return;
        if (!tags.includes(t)) setTags((prev) => [...prev, t]);
        setTagInput("");
    }

    function removeTag(t: string) {
        setTags((prev) => prev.filter((x) => x !== t));
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErrorMsg(null);
        setOk(null);
        setSubmitting(true);

        try {
            console.log("[Create] calling addRestaurant", { name, address, owner });
            const { data, error: addErr } = await addRestaurant(name, address, owner);
            console.log("[Create] addRestaurant response", { data, addErr });

            if (addErr) {
                setErrorMsg(toMsg(addErr) || "Failed to add restaurant");
                setSubmitting(false);
                return;
            }

            const rid: string | undefined = data?.restaurant?.id || data?.id;

            if (rid && tags.length > 0) {
                console.log("[Create] calling addRestaurantTags", { rid, tags });
                const { error: tagsErr } = await addRestaurantTags(rid, tags);
                console.log("[Create] addRestaurantTags response", { tagsErr });
                if (tagsErr) {
                    setErrorMsg(toMsg(tagsErr) || "Restaurant created, but adding tags failed");
                }
            }

            setOk("Restaurant added successfully!");
            setName("");
            setAddress("");
            setOwner("");
            setTags([]);
            setTagInput("");

            setTimeout(() => router.push("/restaurants"), 800);
        } catch (e) {
            console.error("[Create] submit error", e);
            setErrorMsg("Unexpected error while adding restaurant");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Paper withBorder p="lg" radius="md">
            <Title order={3} mb="xs">
                Add Restaurant
            </Title>
            <Text c="dimmed" size="sm" mb="md">
                All fields are required
            </Text>

            {errorMsg && <Alert mb="md" color="red">{errorMsg}</Alert>}
            {ok && <Alert mb="md" color="green">{ok}</Alert>}

            <form onSubmit={submit}>
                <Stack>
                    <TextInput
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        required
                    />
                    <TextInput
                        label="Address"
                        value={address}
                        onChange={(e) => setAddress(e.currentTarget.value)}
                        required
                    />
                    <TextInput
                        label="Owner"
                        value={owner}
                        onChange={(e) => setOwner(e.currentTarget.value)}
                        required
                    />

                    {/* TAGS */}
                    <Stack gap="xs">
                        <Group align="end" wrap="nowrap">
                            <TextInput
                                label="Tags (dietary, etc.)"
                                placeholder="e.g., vegan, gluten-free, halal"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.currentTarget.value)}
                                style={{ flex: 1 }}
                            />
                            <Button
                                type="button"
                                variant="light"
                                onClick={addTag}
                                leftSection={<IconPlus size={16} />}
                                disabled={!tagInput.trim()}
                            >
                                Add
                            </Button>
                        </Group>

                        <Group>
                            {tags.length === 0 ? (
                                <Text c="dimmed" size="sm">No tags yet.</Text>
                            ) : (
                                tags.map((t) => (
                                    <Badge
                                        key={t}
                                        radius="sm"
                                        rightSection={
                                            <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                onClick={() => removeTag(t)}
                                                aria-label="Remove tag"
                                            >
                                                <IconX size={12} />
                                            </ActionIcon>
                                        }
                                    >
                                        {t}
                                    </Badge>
                                ))
                            )}
                        </Group>
                    </Stack>

                    <Group>
                        <Button type="submit" loading={submitting}>
                            Submit
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Paper>
    );
}
