"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container, Title, Text, Center, Loader, AppShell, Card, Stack, Group, ActionIcon, Avatar, Badge, Divider } from "@mantine/core";
import { IconHeart, IconHeartFilled, IconHeartBroken, IconHeartBrokenFilled, IconUser, IconLock } from "@tabler/icons-react";
import Header from "@/components/Header";

type RecipeSummary = {
  recipe_id: string;
  title: string;
  like_count?: number;
  dislike_count?: number;
  user_has_liked?: boolean;
  user_has_disliked?: boolean
};

type FeedRecipe = {
  recipe_id: string;
  title: string;
  description?: string;
  image?: string;
  timestamp: string;
  like_count: number;
  dislike_count: number;
  visibility?: string;
  author: {
    id: string;
    username: string;
    profile_picture_url?: string;
  };
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipesError, setRecipesError] = useState<string | null>(null);
  const [animatingRecipe, setAnimatingRecipe] = useState<string | null>(null);

  // Feed state
  const [feedRecipes, setFeedRecipes] = useState<FeedRecipe[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  // auth redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch feed from followed users
  useEffect(() => {
    if (!user) return;

    const fetchFeed = async () => {
      try {
        setFeedLoading(true);
        setFeedError(null);

        const res = await fetch(`http://localhost:5001/feed?limit=20`, {
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user.id,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to fetch feed");
        }

        setFeedRecipes(data.recipes || []);
      } catch (err: any) {
        setFeedError(err.message || "Failed to fetch feed");
      } finally {
        setFeedLoading(false);
      }
    };

    fetchFeed();
  }, [user]);

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
              console.log(likeData)
              if (!likeRes.ok) throw new Error(likeData?.error || "like fetch failed");
              return {
                ...recipe,
                like_count: likeData.like_count || 0,
                user_has_liked: likeData.user_has_liked || false,
                dislike_count: likeData.dislike_count || 0,
                user_has_disliked: likeData.user_has_disliked || false,
              };
            } catch {
              return { ...recipe, like_count: 0, user_has_liked: false, dislike_count: 0, user_has_disliked: false, };
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

  const handleLikeToggle = async (e: React.MouseEvent, recipeId: string, isCurrentlyLiked: boolean, is_dislike: boolean) => {
    e.preventDefault(); // Prevent navigation to recipe page
    e.stopPropagation();

    if (!user) return;

    setAnimatingRecipe(recipeId);

    try {
      
      const endpoint = isCurrentlyLiked ? `http://localhost:5001/recipes/${recipeId}/unlike` : `http://localhost:5001/recipes/${recipeId}/like`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, is_dislike: is_dislike }),
      });

      const data = await res.json();
      console.log(data)
      

      if (!res.ok) throw new Error(data?.error || "Failed to update like");

      // Update the recipe in the list
      setRecipes((prev) => prev.map((r) => (r.recipe_id === recipeId ? { ...r, like_count: data.like_count, user_has_liked: data.liked, dislike_count: data.dislike_count, user_has_disliked: data.disliked } : r)));
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppShell header={{ height: 70 }} padding="md">
        <Header showSettingsButton={true} showBackButton={false} />
        <AppShell.Main>
          <Container size="lg" py="xl">
            <Title order={2}>Your Feed</Title>
            <Text c="dimmed" mt="md">
              Recipes from people you follow
            </Text>

            {/* === Feed from Followed Users === */}
            <Stack mt="xl" gap="md">
              {feedLoading && (
                <Center py="xl">
                  <div style={{ textAlign: "center" }}>
                    <Loader size="md" />
                    <Text mt="md" c="dimmed" size="sm">
                      Loading your feed...
                    </Text>
                  </div>
                </Center>
              )}

              {feedError && (
                <Text c="red" size="sm">
                  {feedError}
                </Text>
              )}

              {!feedLoading && !feedError && feedRecipes.length === 0 && (
                <Card withBorder p="xl">
                  <Center>
                    <Stack align="center" gap="sm">
                      <Text size="lg" fw={500} c="dimmed">
                        No recipes in your feed yet
                      </Text>
                      <Text size="sm" c="dimmed" ta="center">
                        Follow other users to see their recipes here!
                      </Text>
                    </Stack>
                  </Center>
                </Card>
              )}

              {!feedLoading &&
                !feedError &&
                feedRecipes.map((recipe) => (
                  <Card key={recipe.recipe_id} withBorder p="md" component={Link} href={`/recipe/${recipe.recipe_id}`} style={{ textDecoration: "none", cursor: "pointer" }}>
                    <Stack gap="xs">
                      {/* Author Info */}
                      <Group gap="sm">
                        <Avatar src={recipe.author.profile_picture_url || undefined} radius="xl" size="sm" color="blue">
                          <IconUser size={16} />
                        </Avatar>
                        <div style={{ flex: 1 }}>
                          <Group gap="xs">
                            <Text size="sm" fw={500} component={Link} href={`/${recipe.author.username}`} onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none", color: "inherit" }}>
                              @{recipe.author.username}
                            </Text>
                            <Text size="xs" c="dimmed">
                              • {formatTimestamp(recipe.timestamp)}
                            </Text>
                          </Group>
                        </div>
                        <Group gap="xs">
                          <Badge size="sm" variant="light" color="blue">
                            Following
                          </Badge>
                          {recipe.visibility === "private" && (
                            <Badge size="sm" variant="light" color="orange" leftSection={<IconLock size={12} />}>
                              Private
                            </Badge>
                          )}
                        </Group>
                      </Group>

                      {/* Recipe Content */}
                      <div>
                        <Text fw={600} size="lg">
                          {recipe.title}
                        </Text>
                        {recipe.description && (
                          <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                            {recipe.description}
                          </Text>
                        )}
                      </div>

                      {/* Recipe Image */}
                      {recipe.image && (
                        <div style={{ width: "100%", height: "200px", overflow: "hidden", borderRadius: "8px" }}>
                          <img src={recipe.image} alt={recipe.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}

                      {/* Engagement */}
                      <Group gap="md" mt="xs">
                        <Group gap={4}>
                          <IconHeart size={16} />
                          <Text size="sm" c="dimmed">
                            {recipe.like_count} {recipe.like_count === 1 ? "like" : "likes"}
                          </Text>
                        </Group>
                      </Group>
                    </Stack>
                  </Card>
                ))}
            </Stack>

            <Divider my="xl" />

            {/* === All Recipes (titles only) === */}
            <Title order={3} mt="xl">
              Discover More Recipes
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
                            onClick={(e) => handleLikeToggle(e, r.recipe_id, r.user_has_liked || false, false)}
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
                          <ActionIcon
                            variant={r.user_has_disliked ? "filled" : "light"}
                            color={r.user_has_disliked ? "red" : "gray"}
                            size="md"
                            radius="xl"
                            onClick={(e) => handleLikeToggle(e, r.recipe_id, r.user_has_disliked || false, true)}
                            style={{
                              transition: "all 0.2s ease",
                              transform: animatingRecipe === r.recipe_id ? "scale(1.2)" : "scale(1)",
                            }}
                          >
                            {r.user_has_disliked ? <IconHeartBrokenFilled size={16} /> : <IconHeartBroken size={16} />}
                          </ActionIcon>
                          <Text size="sm" fw={500} c="dimmed" style={{ minWidth: "20px", textAlign: "center" }}>
                            {r.dislike_count || 0}
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
