"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Container, Title, Text, Center, Loader, AppShell, Paper, Group, Avatar, Stack, Button, Alert } from "@mantine/core";
import { IconUser, IconUserCheck } from "@tabler/icons-react";
import Header from "@/components/Header";
import Link from "next/link";

type BlockedUser = {
  user_id: string;
  username: string;
  profile_picture_url?: string;
  blocked_at: string;
};

export default function BlockedUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchBlockedUsers();
    }
  }, [user]);

  const fetchBlockedUsers = async () => {
    if (!user?.id) return;

    setLoadingBlocked(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5001/blocked-users?limit=100`, {
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setBlockedUsers(data.blocked_users || []);
      } else {
        setError(data.error || "Failed to load blocked users");
      }
    } catch (err) {
      console.error("Error fetching blocked users:", err);
      setError("Failed to load blocked users");
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    if (!user?.id) return;

    setUnblockingId(userId);

    try {
      const response = await fetch(`http://localhost:5001/users/${userId}/unblock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        // Remove from list
        setBlockedUsers((prev) => prev.filter((u) => u.user_id !== userId));
      } else {
        alert(data.error || "Failed to unblock user");
      }
    } catch (error) {
      console.error("Failed to unblock user:", error);
      alert("Failed to unblock user");
    } finally {
      setUnblockingId(null);
    }
  };

  if (loading || loadingBlocked) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <AppShell header={{ height: 70 }} padding="md">
          <Header showSettingsButton={true} showBackButton={true} />
          <AppShell.Main>
            <Container size="lg" py="xl">
              <Center>
                <div style={{ textAlign: "center" }}>
                  <Loader size="lg" />
                  <Text mt="md" c="dimmed">
                    Loading...
                  </Text>
                </div>
              </Center>
            </Container>
          </AppShell.Main>
        </AppShell>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppShell header={{ height: 70 }} padding="md">
        <Header showSettingsButton={true} showBackButton={true} />
        <AppShell.Main>
          <Container size="lg" py="xl">
            <Title order={2} mb="md">
              Blocked Users
            </Title>
            <Text c="dimmed" mb="xl">
              Manage users you have blocked
            </Text>

            {error && (
              <Alert color="red" variant="filled" mb="md">
                {error}
              </Alert>
            )}

            {blockedUsers.length === 0 ? (
              <Paper withBorder p="xl">
                <Center>
                  <Stack align="center" gap="sm">
                    <Text size="lg" fw={500} c="dimmed">
                      No blocked users
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Users you block will appear here
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <Stack gap="sm">
                {blockedUsers.map((blockedUser) => (
                  <Paper key={blockedUser.user_id} p="md" withBorder>
                    <Group justify="space-between">
                      <Group gap="sm">
                        <Avatar src={blockedUser.profile_picture_url || undefined} radius="xl" size="md" color="blue">
                          <IconUser size={20} />
                        </Avatar>
                        <div>
                          <Text fw={500}>{blockedUser.username}</Text>
                          <Text size="xs" c="dimmed">
                            Blocked {new Date(blockedUser.blocked_at).toLocaleDateString()}
                          </Text>
                        </div>
                      </Group>
                      <Group gap="xs">
                        <Button component={Link} href={`/${blockedUser.username}`} variant="subtle" size="compact-sm">
                          View Profile
                        </Button>
                        <Button variant="light" color="blue" size="compact-sm" leftSection={<IconUserCheck size={16} />} onClick={() => handleUnblock(blockedUser.user_id)} loading={unblockingId === blockedUser.user_id} disabled={unblockingId === blockedUser.user_id}>
                          Unblock
                        </Button>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}
