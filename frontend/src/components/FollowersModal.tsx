"use client";

import { Modal, Text, Avatar, Group, Stack, Button, Loader, Center } from "@mantine/core";
import { IconUser } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import Link from "next/link";

type FollowerUser = {
  user_id: string;
  username: string;
  profile_picture_url?: string | null;
  followed_at?: string;
};

type FollowersModalProps = {
  opened: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
};

export default function FollowersModal({ opened, onClose, userId, type }: FollowersModalProps) {
  const [users, setUsers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened && userId) {
      fetchUsers();
    }
  }, [opened, userId, type]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = type === "followers" ? "followers" : "following";
      const response = await fetch(`http://localhost:5001/users/${userId}/${endpoint}?limit=100`);
      const data = await response.json();

      if (response.ok) {
        setUsers(data[type] || []);
      } else {
        setError(data.error || `Failed to load ${type}`);
      }
    } catch (err) {
      console.error(`Error fetching ${type}:`, err);
      setError(`Failed to load ${type}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={type === "followers" ? "Followers" : "Following"} size="md" centered>
      {loading && (
        <Center py="xl">
          <Loader />
        </Center>
      )}

      {error && (
        <Text c="red" size="sm">
          {error}
        </Text>
      )}

      {!loading && !error && (
        <Stack gap="sm">
          {users.length === 0 ? (
            <Text c="dimmed" ta="center" py="md">
              No {type} yet
            </Text>
          ) : (
            users.map((u) => (
              <Group key={u.user_id} justify="space-between" p="xs" style={{ borderRadius: 8 }}>
                <Group gap="sm">
                  <Avatar src={u.profile_picture_url || undefined} radius="xl" size="md" color="blue">
                    <IconUser size={20} />
                  </Avatar>
                  <Text fw={500}>{u.username}</Text>
                </Group>
                <Button component={Link} href={`/${u.username}`} variant="light" size="compact-sm" onClick={onClose}>
                  View Profile
                </Button>
              </Group>
            ))
          )}
        </Stack>
      )}
    </Modal>
  );
}
