"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Container, Title, Text, Center, Loader, AppShell, Paper, Group, Avatar, Stack, Button, Alert, Badge, ActionIcon, Menu } from "@mantine/core";
import { IconUser, IconHeart, IconMessage, IconUserPlus, IconTrash, IconDots, IconCheck, IconRefresh, IconBell } from "@tabler/icons-react";
import Header from "@/components/Header";
import Link from "next/link";

type Notification = {
  id: string;
  type: "like" | "comment" | "reply" | "follow" | "recipe_update";
  message: string;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    profile_picture_url?: string;
  };
  recipe?: {
    id: string;
    title: string;
  };
  comment_id?: string;
};

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    setLoadingNotifications(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5001/notifications?limit=100`, {
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      } else {
        setError(data.error || "Failed to load notifications");
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications");
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`http://localhost:5001/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`http://localhost:5001/notifications/mark-all-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`http://localhost:5001/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      }
    } catch (error) {
      console.error("Failed to delete notification:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <IconHeart size={20} color="red" />;
      case "comment":
      case "reply":
        return <IconMessage size={20} color="blue" />;
      case "follow":
        return <IconUserPlus size={20} color="green" />;
      case "recipe_update":
        return <IconRefresh size={20} color="orange" />;
      default:
        return <IconUser size={20} />;
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.recipe?.id) {
      return `/recipe/${notification.recipe.id}`;
    }
    if (notification.type === "follow") {
      return `/${notification.actor.username}`;
    }
    return "#";
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading || loadingNotifications) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <AppShell header={{ height: 70 }} padding="md">
          <Header showSettingsButton={true} showBackButton={false} />
          <AppShell.Main>
            <Container size="lg" py="xl">
              <Center>
                <div style={{ textAlign: "center" }}>
                  <Loader size="lg" />
                  <Text mt="md" c="dimmed">
                    Loading notifications...
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
        <Header showSettingsButton={true} showBackButton={false} />
        <AppShell.Main>
          <Container size="lg" py="xl">
            <Group justify="space-between" mb="xl">
              <div>
                <Title order={2}>Notifications</Title>
                {unreadCount > 0 && (
                  <Text c="dimmed" size="sm" mt={4}>
                    {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
                  </Text>
                )}
              </div>
              {unreadCount > 0 && (
                <Button variant="light" size="sm" onClick={handleMarkAllAsRead} leftSection={<IconCheck size={16} />}>
                  Mark All as Read
                </Button>
              )}
            </Group>

            {error && (
              <Alert color="red" variant="filled" mb="md">
                {error}
              </Alert>
            )}

            {notifications.length === 0 ? (
              <Paper withBorder p="xl">
                <Center>
                  <Stack align="center" gap="sm">
                    <IconBell size={48} color="gray" />
                    <Text size="lg" fw={500} c="dimmed">
                      No notifications yet
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      You'll receive notifications when someone likes or comments on your recipes
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <Stack gap="xs">
                {notifications.map((notification) => (
                  <Paper
                    key={notification.id}
                    p="md"
                    withBorder
                    style={{
                      backgroundColor: notification.is_read ? "transparent" : "#f0f7ff",
                      borderLeft: notification.is_read ? undefined : "4px solid #228be6",
                    }}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        {/* Notification Icon */}
                        <div style={{ flexShrink: 0 }}>{getNotificationIcon(notification.type)}</div>

                        {/* Actor Avatar */}
                        <Avatar src={notification.actor.profile_picture_url || undefined} radius="xl" size="md" color="blue">
                          <IconUser size={20} />
                        </Avatar>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" wrap="nowrap">
                            <Text fw={500} size="sm" component={Link} href={`/${notification.actor.username}`} style={{ textDecoration: "none", color: "inherit" }}>
                              @{notification.actor.username}
                            </Text>
                            <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                              {notification.message}
                            </Text>
                          </Group>

                          {notification.recipe && (
                            <Text size="sm" c="blue" component={Link} href={getNotificationLink(notification)} style={{ textDecoration: "none" }} mt={2}>
                              "{notification.recipe.title}"
                            </Text>
                          )}

                          <Text size="xs" c="dimmed" mt={4}>
                            {formatTimestamp(notification.created_at)}
                          </Text>
                        </div>

                        {/* Unread Badge */}
                        {!notification.is_read && (
                          <Badge size="xs" variant="filled" color="blue">
                            New
                          </Badge>
                        )}
                      </Group>

                      {/* Actions Menu */}
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                          {!notification.is_read && (
                            <Menu.Item leftSection={<IconCheck size={14} />} onClick={() => handleMarkAsRead(notification.id)}>
                              Mark as read
                            </Menu.Item>
                          )}
                          <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDelete(notification.id)}>
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
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
