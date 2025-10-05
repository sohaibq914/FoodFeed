import Link from "next/link";
import { Container, Title, Button, Group, Text, AppShell } from "@mantine/core";
import { IconSettings, IconUsers, IconMessage } from "@tabler/icons-react";
import { useAuth } from "@/contexts/AuthContext";

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
            <Link
              href="/dashboard"
              style={{
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Title order={1} c="blue">
                FoodFeed
              </Title>
            </Link>
          </Group>
          <Group>
            {/* <Text c="dimmed">@{user?.username}</Text> */}
            <Button component={Link} href="/messages" variant="light" leftSection={<IconMessage size={16} />}>
              Messages
            </Button>
            {showSettingsButton && (
              <Button component={Link} href="/account-settings" variant="light" leftSection={<IconSettings size={16} />}>
                Account Settings
              </Button>
            )}
            <Button onClick={signOut} color="red" variant="filled">
              Logout
            </Button>
          </Group>
        </Group>
      </Container>
    </AppShell.Header>
  );
}
