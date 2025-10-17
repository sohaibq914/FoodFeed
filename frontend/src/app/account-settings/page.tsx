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
  Divider,
  Modal,
  PasswordInput,
  Alert
} from '@mantine/core';
import { IconArrowLeft, IconUser, IconMail, IconKey, IconTrash, IconAlertTriangle } from '@tabler/icons-react';
import Header from '@/components/Header';

export default function AccountSettings() {
  const { user, loading, deactivateAccount } = useAuth();
  const router = useRouter();
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateError, setDeactivateError] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleDeactivateAccount = async () => {
    if (!deactivatePassword) {
      setDeactivateError('Password is required');
      return;
    }

    setIsDeactivating(true);
    setDeactivateError('');

    const { error } = await deactivateAccount(deactivatePassword);
    
    if (error) {
      setDeactivateError(error.error || error.message || 'Failed to deactivate account');
      setIsDeactivating(false);
    }
    // If successful, the deactivateAccount function will redirect to home
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

                <Divider />

                <Button
                  onClick={() => setDeactivateModalOpen(true)}
                  variant="outline"
                  leftSection={<IconTrash size={16} />}
                  fullWidth
                  size="md"
                  color="red"
                >
                  Deactivate Account
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

      <Modal
        opened={deactivateModalOpen}
        onClose={() => {
          setDeactivateModalOpen(false);
          setDeactivatePassword('');
          setDeactivateError('');
        }}
        title="Deactivate Account"
        size="md"
        centered
      >
        <Stack gap="md">
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="red"
            variant="light"
          >
            <Text size="sm" fw={500}>Warning: This action cannot be undone</Text>
            <Text size="sm">
              Deactivating your account will permanently delete all your data and you will no longer be able to log in.
            </Text>
          </Alert>

          <PasswordInput
            label="Enter your password to confirm"
            placeholder="Password"
            value={deactivatePassword}
            onChange={(e) => setDeactivatePassword(e.currentTarget.value)}
            required
            size="md"
          />

          {deactivateError && (
            <Alert color="red" variant="filled">
              {deactivateError}
            </Alert>
          )}

          <Group justify="space-between" mt="lg">
            <Button
              variant="light"
              onClick={() => {
                setDeactivateModalOpen(false);
                setDeactivatePassword('');
                setDeactivateError('');
              }}
              disabled={isDeactivating}
            >
              Cancel
            </Button>
            
            <Button
              color="red"
              onClick={handleDeactivateAccount}
              loading={isDeactivating}
              leftSection={<IconTrash size={16} />}
            >
              {isDeactivating ? 'Deactivating...' : 'Deactivate Account'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}