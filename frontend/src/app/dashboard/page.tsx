"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UserSearchModal from "@/components/UserSearchModal";

import {
  Container,
  Title,
  Text,
  Center,
  Loader,
  AppShell,
  Card,
  Stack,
  Group,
  Menu,
  Button,
  ActionIcon,
  Avatar,
  Badge,
  Divider,
  Modal,
  ScrollArea,
  Checkbox,
  Pagination,
  TextInput,
  Grid,
} from "@mantine/core";
import {
  IconHeart,
  IconHeartFilled,
  IconHeartBroken,
  IconHeartBrokenFilled,
  IconSortDescending,
  IconSortAscending,
  IconUser,
  IconLock,
  IconSearch,
  IconFilter,
} from "@tabler/icons-react";
import Header from "@/components/Header";

type RecipeSummary = {
  recipe_id: string;
  title: string;
  timestamp?: string;
  like_count?: number;
  dislike_count?: number;
  user_has_liked?: boolean;
  user_has_disliked?: boolean;
  tags?: string;
  views: number;
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
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [animatingRecipeLike, setAnimatingRecipeLike] = useState<string | null>(
    null
  );
  const [animatingRecipeDislike, setAnimatingRecipeDislike] = useState<
    string | null
  >(null);

  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]); // will fetch later

  const [searchString, setSearchString] = useState("");

  // Feed state
  const [feedRecipes, setFeedRecipes] = useState<FeedRecipe[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);

  const [sortOption, setSortOption] = useState<
    "newest" | "oldest" | "mostLiked" | "popular"
  >("newest");

  const getTime = (t?: string) => (t ? new Date(t).getTime() : 0);

  const filteredRecipes = useMemo(() => {
    if (selectedTags.length === 0) return recipes;

    return recipes.filter((r) =>
      selectedTags.every((tag) => r.tags?.includes(tag))
    );
  }, [recipes, selectedTags]);

  const sortedRecipes = useMemo(() => {
    const arr = [...filteredRecipes];
    if (sortOption === "mostLiked") {
      return arr.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    }
    if (sortOption === "oldest") {
      return arr.sort(
        (a, b) =>
          new Date(a.timestamp || 0).getTime() -
          new Date(b.timestamp || 0).getTime()
      );
    }
    if (sortOption === "popular") {
      return arr.sort((a, b) => (b.views || 0) - (a.views || 0));
    }
    return arr.sort(
      (a, b) =>
        new Date(b.timestamp || 0).getTime() -
        new Date(a.timestamp || 0).getTime()
    );
  }, [filteredRecipes, sortOption]);

  // auth redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  //Gets all recipe tags
  const fetchRecipeTags = async (search: any) => {
    try {
      let data;
      if (search !== null) data = search;
      else {
        const res = await fetch("http://localhost:5001/recipes");
        data = await res.json();
      }

      console.log("tags");
      console.log(data);
      setPages(data.count);

      const tagCounts: Record<string, number> = {};
      const displayNames: Record<string, string> = {};

      (data.recipes ?? []).forEach((r: any) => {
        const raw = r.tags;
        let arr: string[] = [];
        if (Array.isArray(raw)) {
          arr = raw;
        } else if (typeof raw === "string" && raw.trim()) {
          try {
            const parsed = JSON.parse(raw);
            arr = Array.isArray(parsed) ? parsed : raw.split(",");
          } catch {
            arr = raw.split(",");
          }
        }

        arr.forEach((t) => {
          const tag = String(t).trim();
          if (!tag) return;
          const key = tag.toLowerCase();
          tagCounts[key] = (tagCounts[key] || 0) + 1;
          if (!displayNames[key]) displayNames[key] = tag; // preserve casing
        });
      });

      // sort tags by descending frequency, then alphabetically
      const sorted = Object.keys(tagCounts)
        .sort((a, b) => {
          const diff = tagCounts[b] - tagCounts[a];
          return diff !== 0
            ? diff
            : a.localeCompare(b, undefined, { sensitivity: "base" });
        })
        .map((key) => displayNames[key]);

      setAllTags(sorted);
    } catch (e) {
      console.error("Failed to load tags from recipes", e);
      setAllTags([]);
    }
  };

  useEffect(() => {
    fetchRecipeTags(null);
  }, []);

  // Fetch feed from followed users
  useEffect(() => {
    if (!user) return;

    const fetchFeed = async () => {
      try {
        setFeedLoading(true);
        setFeedError(null);

        const res = await fetch(`http://localhost:5001/feed?limit=40`, {
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
  const fetchRecipe = async (search: any) => {
    if (!user) return;

    try {
      setRecipesLoading(true);
      setRecipesError(null);

      console.log("likes");

      let data;
      if (search !== null) data = search;
      else {
        const res = await fetch(`http://localhost:5001/recipes`);
        data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch recipes");
      }

      console.log(data.recipes);

      // show only posted
      const postedOnly: RecipeSummary[] = (data.recipes || [])
        .filter((r: any) => r.posted === true)
        .map((r: any) => ({
          ...r,
          timestamp: r.ts ?? r.created_at ?? r.updated_at ?? null,
          tags: Array.isArray(r.tags)
            ? r.tags
            : typeof r.tags === "string" && r.tags.trim()
            ? JSON.parse(r.tags)
            : [],
        }));

      console.log("postedOnly");
      console.log(postedOnly);

      // fetch likes ONLY for posted ones
      const withLikes = await Promise.all(
        postedOnly.map(async (recipe) => {
          try {
            const likeRes = await fetch(`http://localhost:5001/get_recipe`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                recipe_id: recipe.recipe_id,
                user_id: user.id,
              }),
            });
            const likeData = await likeRes.json();
            if (!likeRes.ok)
              throw new Error(likeData?.error || "like fetch failed");
            return {
              ...recipe,
              like_count: likeData.like_count || 0,
              user_has_liked: likeData.user_has_liked || false,
              dislike_count: likeData.dislike_count || 0,
              user_has_disliked: likeData.user_has_disliked || false,
            };
          } catch {
            return {
              ...recipe,
              like_count: 0,
              user_has_liked: false,
              dislike_count: 0,
              user_has_disliked: false,
            };
          }
        })
      );
      console.log("withLikes");
      console.log(withLikes);
      setRecipes(withLikes);
      fetchRecipeTags(data);
    } catch (err: any) {
      setRecipesError(err.message || "Failed to fetch recipes");
    } finally {
      setRecipesLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipe(null);
  }, [user]);

  const handleLikeToggle = async (
    e: React.MouseEvent,
    recipeId: string,
    isCurrentlyLiked: boolean,
    is_dislike: boolean
  ) => {
    e.preventDefault(); // Prevent navigation to recipe page
    e.stopPropagation();

    if (!user) return;

    is_dislike
      ? setAnimatingRecipeDislike(recipeId)
      : setAnimatingRecipeLike(recipeId);

    try {
      const endpoint = isCurrentlyLiked
        ? `http://localhost:5001/recipes/${recipeId}/unlike`
        : `http://localhost:5001/recipes/${recipeId}/like`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, is_dislike: is_dislike }),
      });

      const data = await res.json();
      console.log(data);

      if (!res.ok) throw new Error(data?.error || "Failed to update like");

      // Update the recipe in the list
      setRecipes((prev) =>
        prev.map((r) =>
          r.recipe_id === recipeId
            ? {
                ...r,
                like_count: data.like_count,
                user_has_liked: data.liked,
                dislike_count: data.dislike_count,
                user_has_disliked: data.disliked,
              }
            : r
        )
      );
    } catch (err: any) {
      console.error("Error updating like:", err);
    } finally {
      setTimeout(() => setAnimatingRecipeLike(null), 300);
      setTimeout(() => setAnimatingRecipeDislike(null), 300);
    }
  };

  if (loading) {
    return (
      <Container
        size="lg"
        style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}
      >
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

  const handleSearch = async (searchString: string) => {
    setRecipesLoading(true);
    setRecipesError(null);

    try {
      if (searchString.length === 0) {
        fetchRecipe(null);
      } else {
        const response = await fetch("http://localhost:5001/search_recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            search_string: searchString,
          }),
        });

        const data = await response.json();

        console.log(data);
        setPages(data.count);
        setPage(1);

        if (!response.ok) throw new Error(data?.error || "Failed to search");

        fetchRecipe(data);
      }
    } catch (err: any) {
      console.error(err);
      setRecipesError(err.message || "Failed to search");
      setRecipesLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppShell header={{ height: 70 }} padding="md">
        <Header showSettingsButton={true} showBackButton={false} />
        <AppShell.Main>
          <Container size="lg" py="xl">
            <Group justify="space-between" align="center" mt="md" mb="md">
              <Title order={2}>Your Feed</Title>

              <Button
                leftSection={<IconSearch size={16} />}
                onClick={() => setUserSearchOpen(true)}
              >
                Search for a user
              </Button>
            </Group>

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
                  <Card
                    key={recipe.recipe_id}
                    withBorder
                    p="md"
                    component={Link}
                    href={`/recipe/${recipe.recipe_id}`}
                    style={{ textDecoration: "none", cursor: "pointer" }}
                  >
                    <Stack gap="xs">
                      {/* Author Info */}
                      <Group gap="sm">
                        <Avatar
                          src={recipe.author.profile_picture_url || undefined}
                          radius="xl"
                          size="sm"
                          color="blue"
                        >
                          <IconUser size={16} />
                        </Avatar>
                        <div style={{ flex: 1 }}>
                          <Group gap="xs">
                            <Text
                              size="sm"
                              fw={500}
                              component="span"
                              style={{ color: "inherit" }}
                            >
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
                            <Badge
                              size="sm"
                              variant="light"
                              color="orange"
                              leftSection={<IconLock size={12} />}
                            >
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
                        <div
                          style={{
                            width: "100%",
                            height: "200px",
                            overflow: "hidden",
                            borderRadius: "8px",
                          }}
                        >
                          <img
                            src={recipe.image}
                            alt={recipe.title}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      )}

                      {/* Engagement */}
                      <Group gap="md" mt="xs">
                        <Group gap={4}>
                          <IconHeart size={16} />
                          <Text size="sm" c="dimmed">
                            {recipe.like_count}{" "}
                            {recipe.like_count === 1 ? "like" : "likes"}
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
            <Grid>
              <Grid.Col span="auto">
                <TextInput
                  aria-label="Search for recipes"
                  onChange={(e) => setSearchString(e.currentTarget.value)}
                />
              </Grid.Col>

              <Grid.Col span="content">
                <Button
                  type="submit"
                  onClick={() => handleSearch(searchString)}
                  loading={recipesLoading}
                  fullWidth
                >
                  Search
                </Button>
              </Grid.Col>
            </Grid>
            <Group align="center" justify="start" gap="xs" mt="sm" mb="md">
              <Text c="dimmed" size="sm">
                Sort by:
              </Text>
              <Menu shadow="md" width={180}>
                <Menu.Target>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={
                      sortOption === "mostLiked" ? (
                        <IconHeartFilled size={16} />
                      ) : sortOption === "oldest" ? (
                        <IconSortAscending size={16} />
                      ) : (
                        <IconSortDescending size={16} />
                      )
                    }
                  >
                    {sortOption === "mostLiked"
                      ? "Most Liked"
                      : sortOption === "oldest"
                      ? "Oldest"
                      : sortOption === "popular"
                      ? "Trending"
                      : "Newest"}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item onClick={() => setSortOption("newest")}>
                    <IconSortDescending size={14} style={{ marginRight: 6 }} />
                    Newest
                  </Menu.Item>
                  <Menu.Item onClick={() => setSortOption("oldest")}>
                    <IconSortAscending size={14} style={{ marginRight: 6 }} />
                    Oldest
                  </Menu.Item>
                  <Menu.Item onClick={() => setSortOption("mostLiked")}>
                    <IconHeartFilled size={14} style={{ marginRight: 6 }} />
                    Most Liked
                  </Menu.Item>
                  <Menu.Item onClick={() => setSortOption("popular")}>
                    <IconHeartFilled size={14} style={{ marginRight: 6 }} />
                    Trending
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconFilter size={16} />}
                onClick={() => setTagModalOpen(true)}
              >
                Filter tags
              </Button>
            </Group>
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
                  sortedRecipes.slice((page - 1) * 5, page * 5).map((r) => (
                    <Card
                      key={r.recipe_id}
                      withBorder
                      component={Link}
                      href={`/recipe/${r.recipe_id}`}
                      style={{ textDecoration: "none", cursor: "pointer" }}
                    >
                      <Group justify="space-between" align="center">
                        <Text fw={500} style={{ flex: 1 }}>
                          {r.title || "(untitled)"}
                        </Text>
                        <Group
                          gap="xs"
                          align="center"
                          onClick={(e) => e.preventDefault()}
                        >
                          <ActionIcon
                            variant={r.user_has_liked ? "filled" : "light"}
                            color={r.user_has_liked ? "red" : "gray"}
                            size="md"
                            radius="xl"
                            onClick={(e) =>
                              handleLikeToggle(
                                e,
                                r.recipe_id,
                                r.user_has_liked || false,
                                false
                              )
                            }
                            style={{
                              transition: "all 0.2s ease",
                              transform:
                                animatingRecipeLike === r.recipe_id
                                  ? "scale(1.2)"
                                  : "scale(1)",
                            }}
                          >
                            {r.user_has_liked ? (
                              <IconHeartFilled size={16} />
                            ) : (
                              <IconHeart size={16} />
                            )}
                          </ActionIcon>
                          <Text
                            size="sm"
                            fw={500}
                            c="dimmed"
                            style={{ minWidth: "20px", textAlign: "center" }}
                          >
                            {r.like_count || 0}
                          </Text>
                          <ActionIcon
                            variant={r.user_has_disliked ? "filled" : "light"}
                            color={r.user_has_disliked ? "red" : "gray"}
                            size="md"
                            radius="xl"
                            onClick={(e) =>
                              handleLikeToggle(
                                e,
                                r.recipe_id,
                                r.user_has_disliked || false,
                                true
                              )
                            }
                            style={{
                              transition: "all 0.2s ease",
                              transform:
                                animatingRecipeDislike === r.recipe_id
                                  ? "scale(1.2)"
                                  : "scale(1)",
                            }}
                          >
                            {r.user_has_disliked ? (
                              <IconHeartBrokenFilled size={16} />
                            ) : (
                              <IconHeartBroken size={16} />
                            )}
                          </ActionIcon>
                          <Text
                            size="sm"
                            fw={500}
                            c="dimmed"
                            style={{ minWidth: "20px", textAlign: "center" }}
                          >
                            {r.dislike_count || 0}
                          </Text>
                        </Group>
                      </Group>
                    </Card>
                  ))
                )}
                <Group justify="center">
                  <Pagination
                    total={pages}
                    value={page}
                    onChange={setPage}
                    withEdges
                  ></Pagination>
                </Group>
              </Stack>
            )}
          </Container>

          {/* modal for user search */}
          <UserSearchModal
            opened={userSearchOpen}
            onClose={() => setUserSearchOpen(false)}
          />

          {/* Modal for tag filtering */}
          <Modal
            opened={tagModalOpen}
            onClose={() => setTagModalOpen(false)}
            title="Filter by tags"
            size="lg"
            radius="md"
          >
            {/* Scrollable checklist area */}
            <ScrollArea h={300} type="always" offsetScrollbars>
              {allTags.length === 0 ? (
                <Text c="dimmed" size="sm">
                  No tags found.
                </Text>
              ) : (
                <Checkbox.Group
                  value={selectedTags}
                  onChange={setSelectedTags}
                  label="Tags"
                >
                  <Stack gap="xs" mt="xs">
                    {allTags.map((t, i) => (
                      <Checkbox key={i} value={t} label={t} />
                    ))}
                  </Stack>
                </Checkbox.Group>
              )}
            </ScrollArea>

            {/* Actions */}
            <Group justify="space-between" mt="md">
              <Button variant="subtle" onClick={() => setSelectedTags([])}>
                Clear
              </Button>
              <Group>
                <Button
                  variant="default"
                  onClick={() => setTagModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // TODO: apply filtering to your recipe lists using `selectedTags`
                    setTagModalOpen(false);
                  }}
                >
                  Apply
                </Button>
              </Group>
            </Group>
          </Modal>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}
