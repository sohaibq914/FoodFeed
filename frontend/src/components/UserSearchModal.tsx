"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  TextInput,
  Stack,
  ScrollArea,
  Group,
  Avatar,
  Text,
  Loader,
  Card,
} from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

type UserResult = {
  id: string;
  username: string;
  profile_picture_url?: string | null;
};

export default function UserSearchModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search logic (search after typing)
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch("http://localhost:5001/search_users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });

        const data = await res.json();
        setResults(data.users ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250); // typing delay

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <Modal opened={opened} onClose={onClose} title="Search for a user" centered size="sm">
      <Stack>
        <TextInput
          placeholder="Search username..."
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
        />

        <ScrollArea h={260}>
          {loading ? (
            <Group justify="center" mt="md">
              <Loader size="sm" />
            </Group>
          ) : results.length === 0 ? (
            <Text c="dimmed" ta="center" mt="md">
              {query.length === 0 ? "Start typing to search..." : "No users found"}
            </Text>
          ) : (
            results.map((user) => (
              <Card
                key={user.id}
                withBorder
                radius="md"
                p="sm"
                mb="xs"
                component="a"
                href={`/${user.username}`}
              >
                <Group>
                  <Avatar
                    src={user.profile_picture_url || undefined}
                    radius="xl"
                  />
                  <Text fw={500}>@{user.username}</Text>
                </Group>
              </Card>
            ))
          )}
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
