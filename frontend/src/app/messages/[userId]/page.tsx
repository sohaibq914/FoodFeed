"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import { Container, Text, Center, Loader, AppShell, Paper, Group, Avatar, Stack, Button, TextInput, ScrollArea, ActionIcon } from "@mantine/core";
import { IconArrowLeft, IconSend } from "@tabler/icons-react";
import Header from "@/components/Header";
import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  timestamp: string;
}

interface OtherUser {
  id: string;
  username: string;
  email: string;
}

export default function ConversationView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const fetchMessages = useCallback(async () => {
    if (!user?.id || !userId) return;

    try {
      setLoadingMessages(true);
      const response = await fetch(`http://localhost:5001/messages/${userId}?user_id=${user.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Failed to load messages" }));
        setError(errorData.error || "Failed to load messages");
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoadingMessages(false);
    }
  }, [user, userId]);

  const fetchOtherUser = useCallback(async () => {
    if (!user?.id || !userId) return;

    try {
      const response = await fetch(`http://localhost:5001/messages/conversations?user_id=${user.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const foundUser = data.conversations.find((conv: { user_id: string; username: string; email: string }) => conv.user_id === userId);
        if (foundUser) {
          setOtherUser({
            id: foundUser.user_id,
            username: foundUser.username,
            email: foundUser.email,
          });
        }
      }
    } catch {
      // Silent fail - we'll just show user ID if we can't fetch username
    }
  }, [user, userId]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user?.id || !userId) return;

    // Load initial messages and user info
    fetchMessages();
    fetchOtherUser();

    // Try to establish WebSocket connection (optional)
    try {
      const socket = io("http://localhost:5001", {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 5000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("✓ WebSocket connected - Real-time messaging enabled!");
        setConnected(true);

        // Join the conversation room
        socket.emit("join_conversation", {
          user_id: user.id,
          other_user_id: userId,
        });
      });

      socket.on("connect_error", () => {
        console.log("⚠ WebSocket not available - Using HTTP fallback");
        setConnected(false);
      });

      socket.on("disconnect", () => {
        console.log("WebSocket disconnected");
        setConnected(false);
      });

      socket.on("joined_conversation", (data: { room: string; status: string }) => {
        console.log("Joined conversation room:", data.room);
      });

      socket.on("new_message", (message: { message_id?: string; id?: string; sender_id: string; receiver_id: string; content: string; timestamp: string }) => {
        console.log("New message received:", message);

        // Transform message to match our Message interface
        const transformedMessage: Message = {
          id: message.message_id || message.id || "",
          sender_id: message.sender_id,
          receiver_id: message.receiver_id,
          content: message.content,
          timestamp: message.timestamp,
        };

        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === transformedMessage.id)) {
            return prev;
          }
          console.log("Adding message to UI:", transformedMessage);
          return [...prev, transformedMessage];
        });
      });

      socket.on("error", (error: { message?: string }) => {
        console.error("WebSocket error:", error);
      });

      // Cleanup on unmount
      return () => {
        socket.disconnect();
      };
    } catch {
      console.log("WebSocket initialization failed - using HTTP fallback");
      setConnected(false);
    }
  }, [user, userId, fetchMessages, fetchOtherUser]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (viewport.current) {
      viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !user?.id || !userId || sending) return;

    const messageContent = messageInput.trim();
    setMessageInput("");
    setSending(true);

    try {
      // Try WebSocket first if connected
      if (socketRef.current && connected) {
        console.log("Sending message via WebSocket:", messageContent);
        socketRef.current.emit("send_message", {
          user_id: user.id,
          receiver_id: userId,
          content: messageContent,
        });
        // Note: Don't set sending to false immediately - wait for the message to come back via the socket
        setTimeout(() => setSending(false), 500);
      } else {
        // Fallback to HTTP if WebSocket not available
        const response = await fetch("http://localhost:5001/messages/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user.id,
          },
          body: JSON.stringify({
            user_id: user.id,
            receiver_id: userId,
            content: messageContent,
          }),
        });

        if (response.ok) {
          await fetchMessages();
          setSending(false);
        } else {
          throw new Error("Failed to send");
        }
      }
    } catch {
      setError("Failed to send message");
      setMessageInput(messageContent);
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading || loadingMessages) {
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
            <Stack gap="md">
              <Group justify="space-between">
                <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.push("/messages")}>
                  Back to Messages
                </Button>
                {connected ? (
                  <Text size="xs" c="green" fw={500}>
                    ● Real-time
                  </Text>
                ) : (
                  <Text size="xs" c="gray" fw={400}>
                    ○ Standard
                  </Text>
                )}
              </Group>

              <Paper shadow="sm" style={{ height: "calc(100vh - 250px)", display: "flex", flexDirection: "column" }}>
                {/* Chat Header */}
                <Paper p="md" shadow="xs" style={{ borderBottom: "1px solid #e9ecef" }}>
                  <Group>
                    <Avatar size="md" radius="xl" color="blue" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                      {otherUser?.username ? otherUser.username.charAt(0).toUpperCase() : "U"}
                    </Avatar>
                    <div>
                      <Text fw={500}>{otherUser?.username || "User"}</Text>
                      <Text size="xs" c="dimmed">
                        {otherUser?.email || userId}
                      </Text>
                    </div>
                  </Group>
                </Paper>

                {/* Messages Area */}
                <ScrollArea flex={1} p="md" viewportRef={viewport} style={{ backgroundColor: "#f8f9fa" }}>
                  {error && (
                    <Center mb="md">
                      <Text c="red" size="sm">
                        {error}
                      </Text>
                    </Center>
                  )}

                  {messages.length === 0 ? (
                    <Center style={{ height: "100%" }}>
                      <div style={{ textAlign: "center" }}>
                        <Text c="dimmed" size="sm">
                          No messages yet
                        </Text>
                        <Text c="dimmed" size="xs" mt={4}>
                          Send a message to start the conversation
                        </Text>
                      </div>
                    </Center>
                  ) : (
                    <Stack gap="xs">
                      {messages.map((message) => {
                        const isSent = message.sender_id === user.id;
                        return (
                          <Group key={message.id} justify={isSent ? "flex-end" : "flex-start"} wrap="nowrap" align="flex-start">
                            {!isSent && (
                              <Avatar size="sm" radius="xl" color="blue" style={{ flexShrink: 0 }}>
                                {otherUser?.username ? otherUser.username.charAt(0).toUpperCase() : "U"}
                              </Avatar>
                            )}
                            <Paper
                              p="sm"
                              shadow="xs"
                              style={{
                                maxWidth: "70%",
                                backgroundColor: isSent ? "#228be6" : "white",
                                color: isSent ? "white" : "inherit",
                                borderRadius: isSent ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                              }}
                            >
                              <Text size="sm" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                {message.content}
                              </Text>
                              <Text size="xs" mt={4} style={{ opacity: 0.7, textAlign: "right" }}>
                                {formatTimestamp(message.timestamp)}
                              </Text>
                            </Paper>
                            {isSent && (
                              <Avatar size="sm" radius="xl" color="blue" style={{ flexShrink: 0, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                                {user.username.charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                          </Group>
                        );
                      })}
                    </Stack>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <Paper p="md" shadow="xs" style={{ borderTop: "1px solid #e9ecef" }}>
                  <Group gap="xs" wrap="nowrap">
                    <TextInput flex={1} placeholder="Type a message..." value={messageInput} onChange={(e) => setMessageInput(e.currentTarget.value)} onKeyPress={handleKeyPress} disabled={sending} size="md" />
                    <ActionIcon size="lg" color="blue" variant="filled" onClick={handleSendMessage} disabled={!messageInput.trim() || sending} loading={sending}>
                      <IconSend size={18} />
                    </ActionIcon>
                  </Group>
                </Paper>
              </Paper>
            </Stack>
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}
