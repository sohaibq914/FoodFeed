import Link from "next/link";
import { Container, Title, Button, Group, AppShell, Text } from "@mantine/core";
import { IconSettings, IconMessage, IconPlus } from "@tabler/icons-react";
import { useAuth } from "@/contexts/AuthContext";

interface CommonHeaderProps {
  showBackButton?: boolean;
  showSettingsButton?: boolean;
}

export default function CommonHeader({
  showBackButton = false,
  showSettingsButton = true,
}: CommonHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <AppShell.Header>
      <Container size="xl" h="100%">
        <Group justify="space-between" h="100%" align="center">
          {/* Left: Logo */}
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

          {/* Right: Navigation + Actions */}
          <Group>
            {/* Add Recipe Button */}
            <Button
              component={Link}
              href="/edit-recipe/new"
              leftSection={<IconPlus size={16} />}
              color="green"
              variant="filled"
            >
              Add Recipe
            </Button>

            <Button
                component="a"
                variant="light"
                href="/restaurants"
            >
              Restaurants
            </Button>

            

            <Button
              component={Link}
              href="/messages"
              variant="light"
              leftSection={<IconMessage size={16} />}
            >
              Messages
            </Button>

            <Button
                component={Link}
                href="/diet-page"
                variant="light"
                leftSection={<IconSettings size={16} />}
              >
                Diet Page
              </Button>

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

            

            {user?.username && (
              <Button
                component={Link}
                href={`/${user.username}`}
                variant="subtle"
                color="gray"
              >
                @{user.username}
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
