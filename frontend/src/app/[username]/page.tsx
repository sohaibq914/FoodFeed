"use client";

import { AppShell, Container, Title, Card, Text, SimpleGrid, Button} from "@mantine/core";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import CommonHeader from "@/components/Header";
import { IconPencil } from "@tabler/icons-react";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();

  const profileUsername = params.username;
  const isOwner = !!user?.username && user.username === profileUsername;

  return (
    <AppShell
      header={{ height: 64 }}
      padding="md"
    >
      <AppShell.Header>
        <CommonHeader />
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          {/* Profile Header */}
          <Title order={1} style={{ marginBottom: 4 }}>
            @{profileUsername}
          </Title>
          <Text c="dimmed" mb="md">
            {isOwner
              ? "This is your profile — show edit controls here."
              : "Public view."}
          </Text>

          {/* Edit Controls (Only for Owner) */}
          {isOwner && (
            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              <Button
                leftSection={<IconPencil size={16} />}
                variant="light"
                color="blue"
                radius="md"
                style={{ width: "fit-content" }}
                onClick={() => alert("Edit profile coming soon")}
              >
                Edit Profile
              </Button>
            </div>
          )}

          {/* My Recipes Section */}
          <section style={{ marginTop: 48 }}>
            <Title order={2} mb="md">
              {isOwner ? "My Recipes" : `${profileUsername}'s Recipes`}
            </Title>

            {/* Example layout of recipe cards */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4}>Spaghetti Carbonara</Title>
                <Text c="dimmed" size="sm">
                  A creamy Italian pasta made with eggs, cheese, and pancetta.
                </Text>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4}>Spaghetti Carbonara</Title>
                <Text c="dimmed" size="sm">
                  A creamy Italian pasta made with eggs, cheese, and pancetta.
                </Text>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4}>Spaghetti Carbonara</Title>
                <Text c="dimmed" size="sm">
                  A creamy Italian pasta made with eggs, cheese, and pancetta.
                </Text>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4}>Spaghetti Carbonara</Title>
                <Text c="dimmed" size="sm">
                  A creamy Italian pasta made with eggs, cheese, and pancetta.
                </Text>
              </Card>

              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Title order={4}>Spaghetti Carbonara</Title>
                <Text c="dimmed" size="sm">
                  A creamy Italian pasta made with eggs, cheese, and pancetta.
                </Text>
              </Card>

              
            </SimpleGrid>
          </section>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
