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
  Modal,
} from "@mantine/core";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import CommonHeader from "@/components/Header";
import { IconPencil, IconTrash, IconArchive } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type RecipeSummary = { recipe_id: string; title: string; description?: string; posted: boolean | null };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

type ViewMode = "posted" | "drafts";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();

  const profileUsername = params.username;
  const isOwner = !!user?.username && user.username === profileUsername;

  const [view, setView] = useState<ViewMode>("posted");
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // For the delete confirmation modal
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RecipeSummary | null>(null);

  // Reusable fetcher
  const fetchRecipes = async (mode: ViewMode) => {
    try {
      setLoading(true);
      setError(null);
      const postedQuery = mode === "posted" ? "true" : "false";
      const res = await fetch(
        `${API_BASE}/users/${encodeURIComponent(profileUsername)}/recipes?posted=${postedQuery}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load recipes");

      // Safety belt filter
      const list: RecipeSummary[] = (data.recipes || []).filter((r: RecipeSummary) =>
        mode === "posted" ? r.posted !== false : r.posted === false
      );
      setRecipes(list);
    } catch (e: any) {
      setError(e.message || "Failed to load recipes");
    } finally {
      setLoading(false);
    }
  };

  // fetch whenever username or view changes
  useEffect(() => {
    if (!profileUsername) return;
    fetchRecipes(view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUsername, view]);

  // delete handler
  const handleDelete = async (recipeId: string) => {
    try {
      const res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user?.id || "",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete recipe");
      setRecipes((prev) => prev.filter((r) => r.recipe_id !== recipeId));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to delete recipe");
    }
  };

  // archive handler (move to drafts)
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

      // If we're on the posted view, remove it from the list immediately.
      // If we're on drafts view (future publish flow), you'd refetch or adjust accordingly.
      setRecipes((prev) => prev.filter((r) => r.recipe_id !== recipeId));
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to draft recipe");
    }
  };

  // open confirmation modal
  const openDeleteModal = (recipe: RecipeSummary) => {
    setPendingDelete(recipe);
    setModalOpen(true);
  };

  // confirm delete
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
      : "Drafts";
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`http://localhost:5001/users/${encodeURIComponent(profileUsername)}/recipes`);
        const data = await res.json();
        console.log(data)
        if (!res.ok) throw new Error(data?.error || "Failed to load recipes");
        setRecipes(data.recipes || []);
        console.log(data.recipes)
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

              {/* View toggle: My Recipes / Drafts */}
              <Group>
                <Button
                  variant={view === "posted" ? "filled" : "light"}
                  onClick={() => setView("posted")}
                >
                  My Recipes
                </Button>

                {isOwner && (
                  <Button
                    variant={view === "drafts" ? "filled" : "light"}
                    onClick={() => setView("drafts")}
                  >
                    Drafts
                  </Button>
                )}
              </Group>
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
                    {view === "posted"
                      ? "No recipes yet."
                      : "No drafts yet."}
                  </Text>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                    {recipes.map((r) => (
                      <Card
                        key={r.recipe_id}
                        withBorder
                        //component={Link}
                        //href={`/recipe/${r.recipe_id}`}
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
                        {isOwner &&
                          <Text c="blue" size="sm">
                            { r.posted ? ('Posted') : ('Draft') }
                          </Text>  
                        }            
                        {isOwner ? (                       
                          <Button
                            component={Link}
                            href={`/edit-recipe/${r.recipe_id}`}
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

      {/* Mantine Delete Confirmation Modal with blur + animation */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Delete Recipe"
        centered
        radius="md"
        shadow="lg"
        overlayProps={{ backgroundOpacity: 0.6, blur: 3 }}
        transitionProps={{ transition: "pop", duration: 180, timingFunction: "ease" }}
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
