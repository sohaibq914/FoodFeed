import Link from "next/link";
import { Container, Title, Button, Group, AppShell, Text, Indicator, ActionIcon } from "@mantine/core";
import { IconSettings, IconMessage, IconPlus, IconFolderCheck, IconFilesFilled, IconBell } from "@tabler/icons-react";
import { useAuth } from "@/contexts/AuthContext";
import { is_admin } from "@/services/AdminService"
import { useEffect, useState } from "react";

interface CommonHeaderProps {
  showBackButton?: boolean;
  showSettingsButton?: boolean;
}

export default function CommonHeader({ showBackButton = false, showSettingsButton = true }: CommonHeaderProps) {
  const { user, signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (user?.id) {
      fetchUnreadCount();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const runner = async () => {
      const {success, message, is_admin: isAnAdmin} = await is_admin(user?.id!)
      if (success) {
        setIsAdmin(isAnAdmin)
      }
    }
    runner()
  }, ["isAdmin"])

  const fetchUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch("http://localhost:5001/notifications/unread-count", {
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

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
            <Button component={Link} href="/edit-recipe/new" leftSection={<IconPlus size={16} />} color="green" variant="filled">
              Add Recipe
            </Button>

            <Button component="a" variant="light" href="/restaurants">
              Restaurants
            </Button>

            <Button component={Link} href="/messages" variant="light" leftSection={<IconMessage size={16} />}>
              Messages
            </Button>
              
            <ActionIcon component={Link} href="/submission-history" variant="light" size="lg" color="blue">
                <IconFolderCheck size={20} />
              </ActionIcon>
            {isAdmin ?
            <ActionIcon component={Link} href="/submissions" variant="light" size="lg" color="blue">
                <IconFilesFilled size={20} />
              </ActionIcon> : <></>}

            {/* Notifications Bell */}
            <Indicator label={unreadCount} disabled={unreadCount === 0} color="red" size={16} inline>
              <ActionIcon component={Link} href="/notifications" variant="light" size="lg" color="blue">
                <IconBell size={20} />
              </ActionIcon>
            </Indicator>

            <Button component={Link} href="/diet-page" variant="light">
              Diet Page
            </Button>

            {showSettingsButton && (
              <Button component={Link} href="/account-settings" variant="light" leftSection={<IconSettings size={16} />}>
                Settings
              </Button>
            )}
            {user?.username && (
              <Button component={Link} href={`/${user.username}`} variant="subtle" color="gray">
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
