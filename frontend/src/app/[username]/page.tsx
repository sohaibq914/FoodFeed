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
  Group,
} from "@mantine/core";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import CommonHeader from "@/components/Header";
import { IconPencil, IconTrash, IconArchive } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type RecipeSummary = {
  recipe_id: string;
  title: string;
  description?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();

  const profileUsername = params.username;
  const isOwner = !!user?.username && user.username === profileUsername;

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetch posted recipes for this profile
  useEffect(() => {
    if (!profileUsername) return;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${API_BASE}/users/${encodeURIComponent(profileUsername)}/recipes?posted=true`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load recipes");
  
        setRecipes(
          (data.recipes || []).filter((r: any) => r.posted !== false)
        );
      } catch (e: any) {
        setError(e.message || "Failed to load recipes");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [profileUsername]);
  

  // delete handler (no modal)
  const handleDelete = async (recipeId: string) => {
    try {
      // include user id for @require_auth (header, query, or body).
      const res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user?.id || "", // your decorator checks this header
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete recipe");

      // remove from local state
      setRecipes((prev) => prev.filter((r) => r.recipe_id !== recipeId));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to delete recipe");
    }
  };

  const handleDraft = async (recipeId: string) => {
    try {
      const res = await fetch(`${API_BASE}/recipes/${recipeId}/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user?.id || "",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to draft recipe");

      setRecipes((prev) => prev.filter((r) => r.recipe_id !== recipeId));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to draft recipe");
    }
  };

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <CommonHeader />
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Title order={1} style={{ marginBottom: 4 }}>
            @{profileUsername}
          </Title>
          <Text c="dimmed" mb="md">
            {isOwner
              ? "This is your profile — show edit controls here."
              : "Public view."}
          </Text>

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
                        style={{ textDecoration: "none" }}
                      >
                        <Group
                          justify="space-between"
                          align="flex-start"
                          mb="xs"
                        >
                          <Title order={4} style={{ margin: 0 }}>
                            <Link
                              href={`/recipe/${r.recipe_id}`}
                              style={{
                                textDecoration: "none",
                                color: "inherit",
                              }}
                            >
                              {r.title || "(untitled)"}
                            </Link>
                          </Title>
                          <Group
                            justify="space-between"
                            align="flex-start"
                            mb="xs"
                          >
                            {/* Delete button only for owner */}
                            {isOwner && (
                              <Button
                                size="xs"
                                color="blue"
                                variant="light"
                                p={6}
                                onClick={() => handleDraft(r.recipe_id)}
                              >
                                <IconArchive size={14} />
                              </Button>
                            )}
                            {isOwner && (
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                p={6}
                                onClick={() => handleDelete(r.recipe_id)}
                              >
                                <IconTrash size={14} />
                              </Button>
                            )}
                          </Group>
                        </Group>

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
