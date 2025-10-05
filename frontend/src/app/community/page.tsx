"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Container, Title, Center, Loader, Text, AppShell, Paper, Stack, Group, Avatar, TextInput, ActionIcon, ScrollArea, Box, Flex, UnstyledButton, Button } from "@mantine/core";
import { IconSend, IconUser } from "@tabler/icons-react";
import Header from "@/components/Header";

interface Message {
  message_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
}

interface Conversation {
  user_id: string;
  last_message: string;
  timestamp: string;
}

export default function Community() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State management
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [sending, setSending] = useState(false);

  // Refs for auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // API helper function
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const session = await user?.getSession();
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "API call failed");
    }

    return response.json();
  };

  // Load conversations
  const loadConversations = async () => {
    try {
      const response = await apiCall("/messages/conversations");
      setConversations(response.conversations || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (userId: string) => {
    setLoadingMessages(true);
    try {
      const response = await apiCall(`/messages/${userId}`);
      setMessages(response.messages || []);

      // Scroll to bottom after loading messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      await apiCall("/messages/send", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: selectedConversation,
          content: newMessage.trim(),
        }),
      });

      setNewMessage("");
      // Reload messages and conversations
      await loadMessages(selectedConversation);
      await loadConversations();
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  // Handle enter key press
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Simple function to start a conversation (you can enhance this later)
  const startNewConversation = () => {
    const otherUserId = prompt("Enter user ID to message:");
    if (otherUserId) {
      setSelectedConversation(otherUserId);
      loadMessages(otherUserId);
    }
  };

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
    <div style={{ minHeight: "100vh" }}>
      <AppShell header={{ height: 70 }} padding={0}>
        <Header />
        <AppShell.Main>
          <Container size="xl" p={0}>
            <Flex h="calc(100vh - 70px)">
              {/* Conversations Sidebar */}
              <Paper w={350} h="100%" radius={0} withBorder>
                <Stack gap={0} h="100%">
                  {/* Header */}
                  <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
                    <Group justify="space-between">
                      <Title order={4}>Messages</Title>
                      <Button size="xs" onClick={startNewConversation}>
                        New Chat
                      </Button>
                    </Group>
                  </Box>

                  {/* Conversations List */}
                  <ScrollArea flex={1}>
                    {loadingConversations ? (
                      <Center p="xl">
                        <Loader size="sm" />
                      </Center>
                    ) : conversations.length === 0 ? (
                      <Center p="xl">
                        <Stack align="center" gap="sm">
                          <IconUser size={48} color="gray" />
                          <Text c="dimmed" size="sm" ta="center">
                            No messages yet
                          </Text>
                          <Button size="sm" variant="light" onClick={startNewConversation}>
                            Start a conversation
                          </Button>
                        </Stack>
                      </Center>
                    ) : (
                      conversations.map((conversation) => (
                        <UnstyledButton
                          key={conversation.user_id}
                          w="100%"
                          p="md"
                          style={{
                            backgroundColor: selectedConversation === conversation.user_id ? "var(--mantine-color-blue-0)" : undefined,
                            borderBottom: "1px solid var(--mantine-color-gray-1)",
                          }}
                          onClick={() => {
                            setSelectedConversation(conversation.user_id);
                            loadMessages(conversation.user_id);
                          }}
                        >
                          <Group gap="sm" wrap="nowrap">
                            <Avatar size="md" radius="xl">
                              {conversation.user_id.slice(0, 2).toUpperCase()}
                            </Avatar>
                            <Box flex={1} style={{ minWidth: 0 }}>
                              <Text fw={500} size="sm" truncate>
                                User {conversation.user_id.slice(0, 8)}
                              </Text>
                              <Text size="xs" c="dimmed" truncate>
                                {conversation.last_message}
                              </Text>
                            </Box>
                            <Text size="xs" c="dimmed">
                              {formatTimestamp(conversation.timestamp)}
                            </Text>
                          </Group>
                        </UnstyledButton>
                      ))
                    )}
                  </ScrollArea>
                </Stack>
              </Paper>

              {/* Chat Area */}
              <Box flex={1} h="100%">
                {selectedConversation ? (
                  <Stack gap={0} h="100%">
                    {/* Chat Header */}
                    <Box p="md" style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}>
                      <Group gap="sm">
                        <Avatar size="sm" radius="xl">
                          {selectedConversation.slice(0, 2).toUpperCase()}
                        </Avatar>
                        <Text fw={500} size="sm">
                          User {selectedConversation.slice(0, 8)}
                        </Text>
                      </Group>
                    </Box>

                    {/* Messages Area */}
                    <ScrollArea flex={1} p="md">
                      {loadingMessages ? (
                        <Center h="100%">
                          <Loader size="sm" />
                        </Center>
                      ) : messages.length === 0 ? (
                        <Center h="100%">
                          <Text c="dimmed" size="sm">
                            No messages yet. Start the conversation!
                          </Text>
                        </Center>
                      ) : (
                        <Stack gap="sm">
                          {messages.map((message) => {
                            const isMe = message.sender_id === user.id;
                            return (
                              <Flex key={message.message_id} justify={isMe ? "flex-end" : "flex-start"} gap="xs">
                                <Box
                                  maw="70%"
                                  p="xs"
                                  style={{
                                    backgroundColor: isMe ? "var(--mantine-color-blue-6)" : "var(--mantine-color-gray-1)",
                                    color: isMe ? "white" : "inherit",
                                    borderRadius: "18px",
                                    borderTopLeftRadius: !isMe ? "4px" : "18px",
                                    borderTopRightRadius: isMe ? "4px" : "18px",
                                  }}
                                >
                                  <Text size="sm">{message.content}</Text>
                                  <Text size="xs" c={isMe ? "white" : "dimmed"} ta="right" opacity={0.7} mt={4}>
                                    {formatTimestamp(message.timestamp)}
                                  </Text>
                                </Box>
                              </Flex>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </Stack>
                      )}
                    </ScrollArea>

                    {/* Message Input */}
                    <Box p="md" style={{ borderTop: "1px solid var(--mantine-color-gray-3)" }}>
                      <Group gap="xs">
                        <TextInput flex={1} placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} disabled={sending} />
                        <ActionIcon size="lg" variant="filled" onClick={sendMessage} disabled={!newMessage.trim() || sending} loading={sending}>
                          <IconSend size={16} />
                        </ActionIcon>
                      </Group>
                    </Box>
                  </Stack>
                ) : (
                  <Center h="100%">
                    <Stack align="center" gap="sm">
                      <IconUser size={64} color="gray" />
                      <Text c="dimmed" size="lg">
                        Select a conversation to start messaging
                      </Text>
                    </Stack>
                  </Center>
                )}
              </Box>
            </Flex>
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}
