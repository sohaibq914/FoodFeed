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

type RecipeSummary = {
  recipe_id: string;
  title: string;
  description?: string | null;
  posted?: boolean;
};

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
                      <Card key={r.recipe_id} withBorder>
                        <Group justify="space-between" align="flex-start" mb="xs">
                          <Title order={4} style={{ margin: 0 }}>
                            <Link
                              href={`/recipe/${encodeURIComponent(r.recipe_id)}`}
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              {r.title || "(untitled)"}
                            </Link>
                          </Title>

                          {isOwner && (
                            <Group>
                              {/* (Optional) Edit button placeholder */}
                              <Button size="xs" color="blue" variant="light" p={6}>
                                <IconPencil size={14} />
                              </Button>

                              {/* Move to drafts only visible in posted view */}
                              {view === "posted" && (
                                <Button
                                  size="xs"
                                  color="blue"
                                  variant="light"
                                  p={6}
                                  onClick={() => handleDraft(r.recipe_id)}
                                  title="Move to drafts"
                                  aria-label="Move to drafts"
                                >
                                  <IconArchive size={14} />
                                </Button>
                              )}

                              {/* Delete always available to owner */}
                              <Button
                                size="xs"
                                color="red"
                                variant="light"
                                p={6}
                                onClick={() => openDeleteModal(r)}
                                title="Delete recipe"
                                aria-label="Delete recipe"
                              >
                                <IconTrash size={14} />
                              </Button>
                            </Group>
                          )}
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
