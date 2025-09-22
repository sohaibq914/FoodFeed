import Link from "next/link";
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Text,
  AppShell
} from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

interface CommonHeaderProps {
  showBackButton?: boolean;
  showSettingsButton?: boolean;
}

export default function CommonHeader({ showBackButton = false, showSettingsButton = true }: CommonHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <AppShell.Header>
      <Container size="xl" h="100%">
        <Group justify="space-between" h="100%" align="center">
          <Group>
            <Title order={1} c="blue">FoodFeed</Title>
          </Group>
          <Group>
            <Text c="dimmed">@{user?.username}</Text>
            {showSettingsButton && (
              <Button
                component={Link}
                href="/account-settings"
                variant="light"
                leftSection={<IconSettings size={16} />}
              >
                Account Settings
              </Button>
            )}
            <Button
              onClick={signOut}
              color="red"
              variant="filled"
            >
              Logout
            </Button>
          </Group>
        </Group>
      </Container>
    </AppShell.Header>
  );
}