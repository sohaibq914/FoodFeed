"use client";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { 
  Container, 
  Paper, 
  Title, 
  Button, 
  Group, 
  Text, 
  Center, 
  Loader,
  AppShell
} from '@mantine/core';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
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

  if (user) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <AppShell
        header={{ height: 70 }}
        padding="md"
      >
        <AppShell.Header>
          <Container size="xl" h="100%">
            <Group justify="space-between" h="100%" align="center">
              <Title order={1} c="blue">FoodFeed</Title>
              <Group>
                <Button 
                  component={Link} 
                  href="/login" 
                  variant="subtle"
                >
                  Sign In
                </Button>
                <Button 
                  component={Link} 
                  href="/register"
                >
                  Sign Up
                </Button>
              </Group>
            </Group>
          </Container>
        </AppShell.Header>

        <AppShell.Main>
          <Container size="lg" py="xl">
            <Paper shadow="sm" p="xl" radius="md">
              <Center>
                <Title order={2}>Welcome to FoodFeed</Title>
              </Center>
            </Paper>
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}