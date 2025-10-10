"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container, Title, Text, Center, Loader, AppShell, Card, Stack, Group, ActionIcon } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import Header from "@/components/Header";

type RecipeSummary = {
  recipe_id: string;
  title: string;
  like_count?: number;
  user_has_liked?: boolean;
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [animatingRecipe, setAnimatingRecipe] = useState<string | null>(null);

  // auth redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // fetch all recipe titles with like data
  useEffect(() => {
    if (!user) return;
  
    const fetchRecipes = async () => {
      try {
        setRecipesLoading(true);
        setRecipesError(null);
  
        const res = await fetch(`http://localhost:5001/recipes`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch recipes");
  
        // show only posted
        const postedOnly: RecipeSummary[] = (data.recipes || []).filter((r: any) => r.posted === true);
  
        // fetch likes ONLY for posted ones
        const withLikes = await Promise.all(
          postedOnly.map(async (recipe) => {
            try {
              const likeRes = await fetch(`http://localhost:5001/get_recipe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipe_id: recipe.recipe_id, user_id: user.id }),
              });
              const likeData = await likeRes.json();
              if (!likeRes.ok) throw new Error(likeData?.error || "like fetch failed");
              return {
                ...recipe,
                like_count: likeData.like_count || 0,
                user_has_liked: likeData.user_has_liked || false,
              };
            } catch {
              return { ...recipe, like_count: 0, user_has_liked: false };
            }
          })
        );
  
        setRecipes(withLikes);
      } catch (err: any) {
        setRecipesError(err.message || "Failed to fetch recipes");
      } finally {
        setRecipesLoading(false);
      }
    };
  
    fetchRecipes();
  }, [user]);
  

  const handleLikeToggle = async (e: React.MouseEvent, recipeId: string, isCurrentlyLiked: boolean) => {
    e.preventDefault(); // Prevent navigation to recipe page
    e.stopPropagation();

    if (!user) return;

    setAnimatingRecipe(recipeId);

    try {
      const endpoint = isCurrentlyLiked ? `http://localhost:5001/recipes/${recipeId}/unlike` : `http://localhost:5001/recipes/${recipeId}/like`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to update like");

      // Update the recipe in the list
      setRecipes((prev) => prev.map((r) => (r.recipe_id === recipeId ? { ...r, like_count: data.like_count, user_has_liked: data.liked } : r)));
    } catch (err: any) {
      console.error("Error updating like:", err);
    } finally {
      setTimeout(() => setAnimatingRecipe(null), 300);
    }
  };

  if (loading) {
    return (
      <Container size="lg" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <Center style={{ width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <Loader size="lg" />
            <Text mt="md" c="dimmed">
              Loading...
            </Text>
          </div>
        </Center>
      </Container>
    );
  }

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppShell header={{ height: 70 }} padding="md">
        <Header showSettingsButton={true} showBackButton={false} />
        <AppShell.Main>
          <Container size="lg" py="xl">
            <Title order={2}>Welcome to your Dashboard!</Title>
            <Text c="dimmed" mt="md">
              You are logged in as {user.username}
            </Text>

            {/* === All Recipes (titles only) === */}
            <Title order={3} mt="xl">
              All Recipes
            </Title>
            {recipesLoading && (
              <Center mt="md">
                <Loader />
              </Center>
            )}
            {recipesError && (
              <Text c="red" mt="md">
                {recipesError}
              </Text>
            )}
            {!recipesLoading && !recipesError && (
              <Stack mt="md">
                {recipes.length === 0 ? (
                  <Text c="dimmed">No recipes found.</Text>
                ) : (
                  recipes.map((r) => (
                    <Card key={r.recipe_id} withBorder component={Link} href={`/recipe/${r.recipe_id}`} style={{ textDecoration: "none", cursor: "pointer" }}>
                      <Group justify="space-between" align="center">
                        <Text fw={500} style={{ flex: 1 }}>
                          {r.title || "(untitled)"}
                        </Text>
                        <Group gap="xs" align="center" onClick={(e) => e.preventDefault()}>
                          <ActionIcon
                            variant={r.user_has_liked ? "filled" : "light"}
                            color={r.user_has_liked ? "red" : "gray"}
                            size="md"
                            radius="xl"
                            onClick={(e) => handleLikeToggle(e, r.recipe_id, r.user_has_liked || false)}
                            style={{
                              transition: "all 0.2s ease",
                              transform: animatingRecipe === r.recipe_id ? "scale(1.2)" : "scale(1)",
                            }}
                          >
                            {r.user_has_liked ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
                          </ActionIcon>
                          <Text size="sm" fw={500} c="dimmed" style={{ minWidth: "20px", textAlign: "center" }}>
                            {r.like_count || 0}
                          </Text>
                        </Group>
                      </Group>
                    </Card>
                  ))
                )}
              </Stack>
            )}
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}
