"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { 
  Container, 
  Title, 
  Button, 
  Group,
  Text, 
  Center, 
  Loader,
  AppShell,
  Paper,
  Stack,
  Divider
} from '@mantine/core';
import { IconArrowLeft, IconUser, IconMail, IconKey } from '@tabler/icons-react';
import Header from '@/components/Header';

export default function AccountSettings() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Container size="lg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Center style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader size="lg" />
            <Text mt="md" c="dimmed">Loading...</Text>
          </div>
        </Center>
      </Container>
    );
  }
  
  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <AppShell
        header={{ height: 70 }}
        padding="md"
      >
        <Header showSettingsButton={false} showBackButton={true} />
        <AppShell.Main>
          <Container size="sm" py="xl">
            <Paper shadow="sm" p="xl" radius="md">
              <Title order={2} mb="lg">Account Settings</Title>
              
              <Stack gap="lg">
                <div>
                  <Group gap="sm" mb="xs">
                    <IconMail size={20} color="gray" />
                    <Text fw={500} size="sm" c="dimmed">Email</Text>
                  </Group>
                  <Text size="lg">{user.email}</Text>
                </div>

                <Divider />

                <div>
                  <Group gap="sm" mb="xs">
                    <IconUser size={20} color="gray" />
                    <Text fw={500} size="sm" c="dimmed">Username</Text>
                  </Group>
                  <Text size="lg">{user.username}</Text>
                </div>

                <Divider />

                <Button
                  component={Link}
                  href="/change-password"
                  variant="outline"
                  leftSection={<IconKey size={16} />}
                  fullWidth
                  size="md"
                  color="orange"
                >
                  Change Password
                </Button>

                <Button
                  component={Link}
                  href="/restrictions"
                  fullWidth
                  size="md"
                  color="blue"
                >
                  Dietary Restrictions
                </Button>

                <Button
                  component={Link}
                  href="/dashboard"
                  variant="light"
                  leftSection={<IconArrowLeft size={16} />}
                  fullWidth
                  size="md"
                  mt="lg"
                >
                  Back to Dashboard
                </Button>
              </Stack>
            </Paper>
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}