"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Container, Title, Text, Center, Loader, AppShell, Paper, Group, Avatar, Stack, Badge, TextInput, rem, Button } from "@mantine/core";
import { IconSearch, IconMessage, IconUser } from "@tabler/icons-react";
import Header from "@/components/Header";
import Link from "next/link";

interface Conversation {
  user_id: string;
  username: string;
  email: string;
  last_message: string;
  timestamp: string;
}

export default function Messages() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      setLoadingConversations(true);
      setError(null);

      const response = await fetch(`http://localhost:5001/messages/conversations?user_id=${user.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Failed to load conversations" }));
        setError(errorData.error || "Failed to load conversations");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  const handleConversationClick = (userId: string) => {
    router.push(`/messages/${userId}`);
  };

  const filteredConversations = conversations.filter((conv) => conv.username.toLowerCase().includes(searchQuery.toLowerCase()) || conv.email.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) {
    return (
      <Container size="lg" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <Center style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Loader size="lg" />
            <Text mt="md" c="dimmed">
              Loading...
            </Text>
          </div>
        </Center>
      </Container>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <AppShell header={{ height: 70 }} padding="md">
        <Header showSettingsButton={true} showBackButton={false} />
        <AppShell.Main>
          <Container size="lg" py="xl">
            <Stack gap="lg">
              <Group justify="space-between" align="center">
                <div>
                  <Title order={2}>Messages</Title>
                  <Text c="dimmed" size="sm" mt={4}>
                    Start a conversation with anyone in the community
                  </Text>
                </div>
              </Group>

              <TextInput placeholder="Search users by name or email..." leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} />} value={searchQuery} onChange={(e) => setSearchQuery(e.currentTarget.value)} size="md" />

              {loadingConversations ? (
                <Center py="xl">
                  <div style={{ textAlign: "center" }}>
                    <Loader size="md" />
                    <Text mt="md" c="dimmed" size="sm">
                      Loading conversations...
                    </Text>
                  </div>
                </Center>
              ) : error ? (
                <Center py="xl">
                  <Text c="red" size="sm">
                    {error}
                  </Text>
                </Center>
              ) : filteredConversations.length === 0 ? (
                <Center py="xl">
                  <Stack align="center" gap="md">
                    <IconMessage size={48} color="#adb5bd" stroke={1.5} />
                    <div style={{ textAlign: "center" }}>
                      <Text size="lg" fw={500}>
                        No users found
                      </Text>
                      <Text c="dimmed" size="sm" mt={4}>
                        {searchQuery ? "Try a different search term" : "No users available to message"}
                      </Text>
                    </div>
                  </Stack>
                </Center>
              ) : (
                <Stack gap="xs">
                  {filteredConversations.map((conversation) => (
                    <Paper
                      key={conversation.user_id}
                      p="md"
                      shadow="xs"
                      style={{
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        border: "1px solid #e9ecef",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                      }}
                      onClick={() => handleConversationClick(conversation.user_id)}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                          <Avatar
                            size="lg"
                            radius="xl"
                            color="blue"
                            style={{
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            }}
                          >
                            {conversation.username.charAt(0).toUpperCase()}
                          </Avatar>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Group gap="xs">
                              <Text fw={500} size="sm" lineClamp={1}>
                                {conversation.username}
                              </Text>
                              {conversation.last_message !== "No messages yet" && (
                                <Badge size="xs" variant="light" color="blue">
                                  Active
                                </Badge>
                              )}
                            </Group>
                            <Text c="dimmed" size="xs" lineClamp={1} mt={2}>
                              {conversation.email}
                            </Text>
                            <Text c="dimmed" size="sm" lineClamp={1} mt={4}>
                              {conversation.last_message}
                            </Text>
                          </div>
                        </Group>
                        <Group gap="xs" style={{ flexShrink: 0 }}>
                          {conversation.timestamp && conversation.last_message !== "No messages yet" && (
                            <Text c="dimmed" size="xs" style={{ whiteSpace: "nowrap" }}>
                              {new Date(conversation.timestamp).toLocaleDateString()}
                            </Text>
                          )}
                          <Button component={Link} href={`/${conversation.username}`} variant="light" size="compact-xs" leftSection={<IconUser size={14} />} onClick={(e) => e.stopPropagation()}>
                            Profile
                          </Button>
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}
