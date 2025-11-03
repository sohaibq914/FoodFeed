"use client";
import React, { useEffect, useState } from "react";
import { Card, Group, Text, Stack, Badge } from "@mantine/core";
import { useRouter } from "next/navigation";

const Endpoint = "http://localhost:5001";

type Row = { r_id: string; r_name: string; count: number };

export default function TrendingRestaurants(): React.ReactElement {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`${Endpoint}/rest_trending?limit=20`);
                const json = await res.json();
                if (!alive) return;
                const list = Array.isArray(json?.trending) ? (json.trending as Row[]) : [];
                setRows(list);
            } catch {
                if (alive) setRows([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const medal = (rank: number) =>
        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;

    if (loading && rows.length === 0) return <Text c="dimmed">Loading…</Text>;
    if (!loading && rows.length === 0) return <Text c="dimmed">No trending restaurants yet.</Text>;

    return (
        <Card withBorder radius="lg" p="lg" shadow="xs">
            <Stack gap="sm">
                {rows.map((r, i) => (
                    <Group
                        key={r.r_id}
                        justify="space-between"
                        wrap="nowrap"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                            sessionStorage.setItem(
                                "selected_restaurant",
                                JSON.stringify({ id: r.r_id, name: r.r_name, address: "", owner: "" })
                            );
                            router.push("/restaurants/information");
                        }}
                    >
                        <Group gap="md">
                            <Text fw={700} w={36} ta="right">
                                {medal(i + 1)}
                            </Text>
                            <Text fw={600}>{r.r_name || "(unknown)"}</Text>
                        </Group>
                        <Badge variant="light">{r.count} views</Badge>
                    </Group>
                ))}
            </Stack>
        </Card>
    );
}
