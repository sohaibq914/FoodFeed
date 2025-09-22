"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Container, Title, Center, Loader, Text, AppShell, Paper, Stack } from "@mantine/core";
import Header from "@/components/Header"; // Use the same Header component

export default function Community() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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
      <AppShell header={{ height: 70 }} padding="md">
        <Header />
        <AppShell.Main>
          <Container size="lg" py="xl">
            <Paper shadow="sm" p="xl" radius="md">
              <Title order={2} mb="lg">
                Community
              </Title>
              <Stack gap="lg">
                <Text>Welcome to the FoodFeed community!</Text>
                {/* Your community content here */}
              </Stack>
            </Paper>
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}
