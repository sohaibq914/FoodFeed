"use client";

import { useRouter } from "next/navigation";
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
  Modal,
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
  description?: string;
  posted: boolean | null;
};

type ViewMode = "posted" | "drafts" | "liked";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();

  const profileUsername = params.username;
  const isOwner = !!user?.username && user.username === profileUsername;

  const [view, setView] = useState<ViewMode>("posted");
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Router
  const router = useRouter()
  // Delete modal
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RecipeSummary | null>(
    null
  );

  // -- API helpers --
  const fetchRecipes = async (mode: ViewMode) => {
    try {
      setLoading(true);
      setError(null);

      if (mode === "liked") {
        const res = await fetch(`http://localhost:5001/likes`, {
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user?.id || "",
          },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load likes");

        // data.likes: [{ recipe_id, title, author_id, posted }]
        const liked: RecipeSummary[] = (data.likes || []).map((r: RecipeSummary) => ({
          recipe_id: r.recipe_id,
          title: r.title,
          posted: r.posted ?? true,
        }));
        setRecipes(liked);
        return;
      }

      // posted/drafts
      const postedQuery = mode === "posted" ? "true" : "false";
      const res = await fetch(
        `http://localhost:5001/users/${encodeURIComponent(
          profileUsername
        )}/recipes?posted=${postedQuery}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load recipes");

      const filtered: RecipeSummary[] = (data.recipes || []).filter(
        (r: RecipeSummary) =>
          mode === "posted" ? r.posted !== false : r.posted === false
      );
      setRecipes(filtered);
    } catch (e: any) {
      // if (typeof e === "Error") {
        setError(e.message || "Failed to load recipes");
      // }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profileUsername) return;
    if (view === "liked") {
      if (!isOwner) return;         
      if (!user?.id) return;        
    }
    fetchRecipes(view);
  }, [profileUsername, view]);

  const handleDelete = async (recipeId: string) => {
    try {
      const res = await fetch(`http://localhost:5001/recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user?.id || "",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete recipe");

      setRecipes((prev) => prev.filter((r: RecipeSummary) => r.recipe_id !== recipeId));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to delete recipe");
    }
  };

  const handleDraft = async (recipeId: string) => {
    try {
      const res = await fetch(
        `http://localhost:5001/recipes/${recipeId}/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": user?.id || "",
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to draft recipe");

      // Remove from current list to reflect state change
      setRecipes((prev) => prev.filter((r: RecipeSummary) => r.recipe_id !== recipeId));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to draft recipe");
    }
  };

  // Delete modal handlers
  const openDeleteModal = (recipe: RecipeSummary) => {
    setPendingDelete(recipe);
    setModalOpen(true);
  };
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await handleDelete(pendingDelete.recipe_id);
    setPendingDelete(null);
    setModalOpen(false);
  };

  const headerTitle =
    view === "posted"
      ? isOwner
        ? "My Recipes"
        : `${profileUsername}'s Recipes`
      : view === "drafts"
      ? "Drafts"
      : "Likes";

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
            {isOwner ? "This is your profile" : "Public view."}
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
            <Group justify="space-between" mb="md">
              <Title order={2}>{headerTitle}</Title>
              {isOwner && (
                <Group>
                  <Button
                    variant={view === "posted" ? "filled" : "light"}
                    onClick={() => setView("posted")}
                  >
                    My Recipes
                  </Button>
                  <Button
                    variant={view === "drafts" ? "filled" : "light"}
                    onClick={() => setView("drafts")}
                  >
                    Drafts
                  </Button>
                  <Button
                    variant={view === "liked" ? "filled" : "light"}
                    onClick={() => setView("liked")}
                  >
                    Likes
                  </Button>
                </Group>
              )}
            </Group>

            {loading && (
              <Center py="lg">
                <Loader />
              </Center>
            )}

            {error && <Text c="red">{error}</Text>}

            {!loading && !error && (
              <>
                {recipes.length === 0 ? (
                  <Text c="dimmed">
                    {view === "posted" ? "No recipes yet." : "No drafts yet."}
                  </Text>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {recipes.map((r) => (
                      <Card
                        key={r.recipe_id}
                        withBorder
                        style={{ textDecoration: "none" }}
                      >
                        <Group justify="space-between" align="start" mb="xs">
                          <Title order={4} style={{ margin: 0 }}>
                            {r.title || "(untitled)"}
                          </Title>

                          {isOwner && view !== "liked" && (
                            <Group gap="xs">
                              {/* Archive / Move to drafts (only show on posted view) */}
                              {view === "posted" && (
                                <Button
                                  variant="light"
                                  size="compact-sm"
                                  leftSection={<IconArchive size={16} />}
                                  onClick={() => handleDraft(r.recipe_id)}
                                >
                                  Draft
                                </Button>
                              )}

                              {/* Delete */}
                              <Button
                                variant="light"
                                color="red"
                                size="compact-sm"
                                leftSection={<IconTrash size={16} />}
                                onClick={() => openDeleteModal(r)}
                              >
                                Delete
                              </Button>
                            </Group>
                          )}
                        </Group>

                        {r.description && (
                          <Text c="dimmed" size="sm" lineClamp={3}>
                            {r.description}
                          </Text>
                        )}
                        {isOwner &&
                          <Text c="blue" size="sm">
                            { r.posted ? ('Posted') : ('Draft') }
                          </Text>  
                        }            
                        {isOwner ? (                       
                          <Button
                            onClick={() => {
                              router.push(`/edit-recipe/${r.recipe_id}`)
                            }}
                            size="compact-md"
                            variant="light"
                          >
                          Edit Recipe
                          </Button>) : (                          
                          <Button
                            component={Link}
                            href={`/recipe/${r.recipe_id}`}
                            size="compact-md"
                            variant="light"
                          >
                          View Recipe
                          </Button>)
                        }
                      </Card>
                    ))}
                  </SimpleGrid>
                )}
              </>
            )}
          </section>
        </Container>
      </AppShell.Main>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Delete Recipe"
        centered
        radius="md"
        shadow="lg"
        overlayProps={{ backgroundOpacity: 0.6, blur: 3 }}
        transitionProps={{
          transition: "pop",
          duration: 180,
          timingFunction: "ease",
        }}
      >
        <Text size="sm" mb="md">
          Are you sure you want to delete{" "}
          <b>{pendingDelete?.title || "this recipe"}</b>?<br />
          This action <b>cannot be undone</b>.
        </Text>

        <Group justify="flex-end">
          <Button variant="default" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={confirmDelete}>
            Delete
          </Button>
        </Group>
      </Modal>
    </AppShell>
  );
}
