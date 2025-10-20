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
  Avatar,
  FileInput,
  Alert,
  Stack,
} from "@mantine/core";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import CommonHeader from "@/components/Header";
import { IconPencil, IconTrash, IconArchive, IconCamera, IconUpload, IconUser } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

type RecipeSummary = {
  recipe_id: string;
  title: string;
  description?: string;
  posted: boolean | null;
};

type ViewMode = "posted" | "drafts" | "liked";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user, uploadProfilePicture, loading: authLoading } = useAuth();

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

  // Profile picture upload states
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [profilePictureLoading, setProfilePictureLoading] = useState(true);

  const profilePictureUrl = useMemo(() => {
    if (profilePictureLoading) {
      return null;
    }

    if (isOwner) {
      return user?.profile_picture_url || profileUser?.profile_picture_url || null;
    }
    
    return profileUser?.profile_picture_url || null;
  }, [isOwner, user?.profile_picture_url, profileUser?.profile_picture_url, profilePictureLoading]);

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

  useEffect(() => {
    if (profileUsername) {
      fetchProfileUser();
    }
  }, [profileUsername]);

  useEffect(() => {
    setProfilePictureLoading(true);
  }, [profileUsername]);

  useEffect(() => {
    if (isOwner) {
      if (!authLoading && user && user.username === profileUsername) {
        setProfilePictureLoading(false);
      }
    } else {
      if (profileUser !== null) {
        setProfilePictureLoading(false);
      }
    }
  }, [authLoading, user, profileUser, isOwner, profileUsername]);

  const fetchProfileUser = async () => {
    try {
      const response = await fetch(`http://localhost:5001/user/by-username/${encodeURIComponent(profileUsername)}`);
      const data = await response.json();
      
      if (response.ok) {
        setProfileUser(data.user);
      } else {
        setProfileUser({ username: profileUsername, profile_picture_url: null });
      }
    } catch (error) {
      console.error('Failed to fetch profile user:', error);
      setProfileUser({ username: profileUsername, profile_picture_url: null });
    }
  };

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

  const handleProfilePictureUpload = async () => {
    if (!profilePictureFile) return;

    setUploadingPicture(true);
    setUploadError(null);

    const { error, data } = await uploadProfilePicture(profilePictureFile);

    if (error) {
      setUploadError(error.error || error.message || 'Failed to upload profile picture');
    } else {
      setProfilePictureFile(null);
    }

    setUploadingPicture(false);
  };

  const headerTitle =
    view === "posted"
      ? isOwner
        ? "My Recipes"
        : `${profileUsername}'s Recipes`
      : view === "drafts"
      ? "Drafts"
      : "Likes";

  if (authLoading) {
    return (
      <AppShell header={{ height: 64 }} padding="md">
        <AppShell.Header>
          <CommonHeader />
        </AppShell.Header>
        <AppShell.Main>
          <Container size="xl">
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <CommonHeader />
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          {/* Profile Header */}
          <Group align="start" gap="xl" mb="xl">
            <div>
              <Avatar
                src={profilePictureLoading ? undefined : (profilePictureUrl || undefined)}
                size={120}
                radius="xl"
                color="blue"
              >
                {profilePictureLoading ? <Loader size={30} /> : <IconUser size={60} />}
              </Avatar>
              
              {isOwner && (
                <Stack gap="xs" mt="md" style={{ maxWidth: 200 }}>
                  <FileInput
                    placeholder="Choose profile picture"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    value={profilePictureFile}
                    onChange={setProfilePictureFile}
                    leftSection={<IconCamera size={16} />}
                    size="xs"
                  />
                  
                  {profilePictureFile && (
                    <Button
                      size="xs"
                      leftSection={<IconUpload size={14} />}
                      onClick={handleProfilePictureUpload}
                      loading={uploadingPicture}
                      disabled={uploadingPicture}
                    >
                      Upload
                    </Button>
                  )}
                  
                  {uploadError && (
                    <Alert color="red" variant="filled">
                      <Text size="xs">{uploadError}</Text>
                    </Alert>
                  )}
                </Stack>
              )}
            </div>
            
            <div style={{ flex: 1 }}>
              <Title order={1} style={{ marginBottom: 4 }}>
                @{profileUsername}
              </Title>
              <Text c="dimmed" mb="md">
                {isOwner ? "This is your profile" : "Public view."}
              </Text>

              {isOwner && (
                <Button
                  leftSection={<IconPencil size={16} />}
                  variant="light"
                  color="blue"
                  radius="md"
                  onClick={() => alert("Edit profile coming soon")}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </Group>

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
