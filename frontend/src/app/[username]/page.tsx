"use client";

import {
  AppShell,
  Container,
  Title,
  Card,
  Text,
  SimpleGrid,
  Button,
  Center,
  Loader,
} from "@mantine/core";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import CommonHeader from "@/components/Header";
import { IconPencil } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type RecipeSummary = {
  recipe_id: string;
  title: string;
  description?: string | null;
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();

  const profileUsername = params.username;
  const isOwner = !!user?.username && user.username === profileUsername;

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileUsername) return;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `http://localhost:5001/users/${encodeURIComponent(
            profileUsername
          )}/recipes`
        );
        
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load recipes");
        const postedOnly = (data.recipes || []).filter(
          (r: any) => r.posted === true
        );
        setRecipes(postedOnly);
      } catch (e: any) {
        setError(e.message || "Failed to load recipes");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [profileUsername]);

  return (
    <AppShell header={{ height: 64 }} padding="md">
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

          {/* User's Recipes */}
          <section style={{ marginTop: 48 }}>
            <Title order={2} mb="md">
              {isOwner ? "My Recipes" : `${profileUsername}'s Recipes`}
            </Title>

            {loading && (
              <Center py="lg">
                <Loader />
              </Center>
            )}

            {error && <Text c="red">{error}</Text>}

            {!loading && !error && (
              <>
                {recipes.length === 0 ? (
                  <Text c="dimmed">No recipes yet.</Text>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {recipes.map((r) => (
                      <Card
                        key={r.recipe_id}
                        withBorder
                        component={Link}
                        href={`/recipe/${r.recipe_id}`}
                        style={{ textDecoration: "none" }}
                      >
                        <Title order={4} mb={4}>
                          {r.title || "(untitled)"}
                        </Title>
                        {r.description && (
                          <Text c="dimmed" size="sm" lineClamp={3}>
                            {r.description}
                          </Text>
                        )}
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </>
            )}
          </section>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
