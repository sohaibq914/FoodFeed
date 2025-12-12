"use client";
import React, { useEffect, useState } from "react";
import { TextInput, Group, Button, Badge } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";
import { useRestaurants } from "@/contexts/restaurants/RestaurantContext";

const Endpoint = "http://localhost:5001";

export default function RestaurantSearchBar(): React.ReactElement {
    const { filter, setFilter, items, tagQuery, setTagQuery } = useRestaurants();

    const toggleTag = (t: string) => {
        const tag = t.toLowerCase();
        const curr = (tagQuery ?? []).map((x: string) => x.toLowerCase());
        const next = curr.includes(tag)
            ? curr.filter((x: string) => x !== tag)
            : [...curr, tag];
        setTagQuery(next);
    };

    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <Group align="end" mb="xs" wrap="wrap">
                <TextInput
                    label="Search"
                    placeholder="Name, address, or owner…"
                    value={filter}
                    onChange={(e) => setFilter(e.currentTarget.value)}
                    style={{ flex: 1, minWidth: 260 }}
                />
                <Button
                    type="button"
                    variant="light"
                    onClick={() => {
                        setFilter("");
                        setTagQuery([]);
                    }}
                    leftSection={<IconX size={16} /> as React.ReactNode}
                >
                    Clear
                </Button>
                <Button type="button" disabled leftSection={<IconSearch size={16} /> as React.ReactNode}>
                    {items.length}
                </Button>
            </Group>

            <AllTagsRow
                // label="Sort"
                selectedTags={(tagQuery ?? []) as string[]}
                onToggle={toggleTag}>
            </AllTagsRow>
        </form>
    );
}

function AllTagsRow({
                        selectedTags,
                        onToggle,
                    }: {
    selectedTags: string[];
    onToggle: (tag: string) => void;
}) {
    const [tags, setTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`${Endpoint}/restaurant_tags_all`);
                const json = await res.json();
                if (!res.ok) {
                    if (alive) setTags([]);
                    return;
                }
                const list: string[] = Array.isArray(json?.tags) ? json.tags : [];
                if (alive) setTags(list);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    if (loading || tags.length === 0) return null;

    return (
        <Group gap="xs" wrap="wrap">
            {tags.map((t) => {
                const lower = t.toLowerCase();
                const active = selectedTags.some((x) => x.toLowerCase() === lower);
                return (
                    <Badge
                        key={t}
                        radius="sm"
                        variant={active ? "filled" : "outline"}
                        color={(active ? "green" : "blue") as any}
                        onClick={() => onToggle(t)}
                        style={{ cursor: "pointer", userSelect: "none" }}
                    >
                        {t}
                    </Badge>
                );
            })}
        </Group>
    );
}
