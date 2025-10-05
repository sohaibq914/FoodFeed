"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  PasswordInput,
  Alert
} from '@mantine/core';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react';
import Header from '@/components/Header';

export default function ChangePassword() {
  const { user, loading, changePassword } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    const { error } = await changePassword(currentPassword, newPassword);
    
    if (error) {
      setError('Failed to change password');
    }
    
    setIsLoading(false);
  };

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
          <Container size="xs" py="xl">
            <Paper shadow="sm" p="xl" radius="md">
              <Title order={2} mb="lg">Change Password</Title>
              
              <form onSubmit={handlePasswordChange}>
                <Stack gap="md">
                  <PasswordInput
                    label="Current Password"
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.currentTarget.value)}
                    required
                    size="md"
                  />

                  <PasswordInput
                    label="New Password"
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.currentTarget.value)}
                    required
                    minLength={6}
                    size="md"
                  />

                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                    required
                    size="md"
                  />

                  {error && (
                    <Alert color="red" variant="filled">
                      {error}
                    </Alert>
                  )}

                  <Group justify="space-between" mt="lg">
                    <Button
                      component={Link}
                      href="/account-settings"
                      variant="light"
                      leftSection={<IconArrowLeft size={16} />}
                    >
                      Back
                    </Button>
                    
                    <Button
                      type="submit"
                      loading={isLoading}
                      leftSection={<IconCheck size={16} />}
                    >
                      {isLoading ? 'Changing...' : 'Change Password'}
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Paper>
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}