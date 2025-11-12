"use client";

import { useRouter } from "next/navigation";
import { AppShell, Container, Title, Card, Text, SimpleGrid, Button, Center, Loader, Group, Modal, Avatar, FileInput, Alert, Stack, Badge, Textarea } from "@mantine/core";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import CommonHeader from "@/components/Header";
import FollowersModal from "@/components/FollowersModal";
import { IconPencil, IconTrash, IconArchive, IconCamera, IconUpload, IconUser, IconUserPlus, IconUserMinus, IconUsers, IconUserX, IconUserCheck, IconLock, IconCheck, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

type RecipeSummary = {
  recipe_id: string;
  title: string;
  description?: string;
  posted: boolean | null;
  visibility?: string;
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
  const router = useRouter();
  // Delete modal
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<RecipeSummary | null>(null);

  // Profile picture upload states
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [profilePictureLoading, setProfilePictureLoading] = useState(true);

  // Follow/Unfollow states
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);

  // Block/Unblock states
  const [isBlocked, setIsBlocked] = useState(false);
  const [youBlockedThem, setYouBlockedThem] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  // Description states
  const [description, setDescription] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [tempDescription, setTempDescription] = useState<string>('');
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

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
      const res = await fetch(`http://localhost:5001/users/${encodeURIComponent(profileUsername)}/recipes?posted=${postedQuery}`, {
        headers: {
          "X-User-ID": user?.id || "",
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load recipes");

      const filtered: RecipeSummary[] = (data.recipes || []).filter((r: RecipeSummary) => (mode === "posted" ? r.posted !== false : r.posted === false));
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
        setDescription(data.user?.description || '');

        // Fetch follower/following counts and follow status
        if (data.user?.id) {
          fetchFollowData(data.user.id);
        }
      } else {
        setProfileUser({ username: profileUsername, profile_picture_url: null });
      }
    } catch (error) {
      console.error("Failed to fetch profile user:", error);
      setProfileUser({ username: profileUsername, profile_picture_url: null });
    }
  };

  const fetchFollowData = async (userId: string) => {
    try {
      // Fetch profile to get follower/following counts
      const profileRes = await fetch(`http://localhost:5001/user/${userId}/profile`);
      const profileData = await profileRes.json();

      if (profileRes.ok && profileData.user) {
        setFollowerCount(profileData.user.follower_count || 0);
        setFollowingCount(profileData.user.following_count || 0);
      }

      // Check if current user is following this profile (only if logged in and not viewing own profile)
      if (user?.id && !isOwner) {
        const followRes = await fetch(`http://localhost:5001/users/${userId}/is-following?follower_id=${user.id}`);
        const followData = await followRes.json();

        if (followRes.ok) {
          setIsFollowing(followData.is_following || false);
        }

        // Check if there's a block relationship
        const blockRes = await fetch(`http://localhost:5001/users/${userId}/is-blocked?current_user_id=${user.id}`);
        const blockData = await blockRes.json();

        if (blockRes.ok) {
          setIsBlocked(blockData.is_blocked || false);
          setYouBlockedThem(blockData.you_blocked_them || false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch follow data:", error);
    }
  };

  const handleFollowToggle = async () => {
    if (!user?.id || !profileUser?.id) return;

    setFollowLoading(true);
    try {
      const endpoint = isFollowing ? "unfollow" : "follow";
      const response = await fetch(`http://localhost:5001/users/${profileUser.id}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update follow state immediately
        setIsFollowing(!isFollowing);

        // Update follower count from response (if provided)
        if (data.follower_count !== undefined) {
          setFollowerCount(data.follower_count);
        } else {
          // If not provided, manually adjust the count
          setFollowerCount((prev) => (isFollowing ? prev - 1 : prev + 1));
        }

        // Refresh follow data to ensure everything is in sync
        await fetchFollowData(profileUser.id);
      } else {
        console.error("Follow/unfollow failed:", data.error);
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!user?.id || !profileUser?.id) return;

    setBlockLoading(true);
    try {
      const endpoint = youBlockedThem ? "unblock" : "block";
      const response = await fetch(`http://localhost:5001/users/${profileUser.id}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user.id,
        },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        if (youBlockedThem) {
          // Unblocking
          setIsBlocked(false);
          setYouBlockedThem(false);
        } else {
          // Blocking
          setIsBlocked(true);
          setYouBlockedThem(true);
          // If following, unfollow automatically (handled by backend trigger)
          setIsFollowing(false);
        }
      } else {
        console.error("Block/unblock failed:", data.error);
      }
    } catch (error) {
      console.error("Failed to toggle block:", error);
    } finally {
      setBlockLoading(false);
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
      const res = await fetch(`http://localhost:5001/recipes/${recipeId}/draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": user?.id || "",
        },
      });
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
      setUploadError(error.error || error.message || "Failed to upload profile picture");
    } else {
      setProfilePictureFile(null);
    }

    setUploadingPicture(false);
  };

  const handleEditDescription = () => {
    setTempDescription(description);
    setEditingDescription(true);
    setDescriptionError(null);
  };

  const handleCancelEditDescription = () => {
    setEditingDescription(false);
    setTempDescription('');
    setDescriptionError(null);
  };

  const handleSaveDescription = async () => {
    if (!user?.id) return;

    setSavingDescription(true);
    setDescriptionError(null);

    try {
      const response = await fetch(`http://localhost:5001/user/${user.id}/description`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
        },
        body: JSON.stringify({ description: tempDescription }),
      });

      const data = await response.json();

      if (response.ok) {
        setDescription(tempDescription);
        setEditingDescription(false);
        setTempDescription('');
      } else {
        setDescriptionError(data.error || 'Failed to update description');
      }
    } catch (error) {
      console.error('Failed to update description:', error);
      setDescriptionError('Failed to update description');
    } finally {
      setSavingDescription(false);
    }
  };

  const headerTitle = view === "posted" ? (isOwner ? "My Recipes" : `${profileUsername}'s Recipes`) : view === "drafts" ? "Drafts" : "Likes";

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
              <Avatar src={profilePictureLoading ? undefined : profilePictureUrl || undefined} size={120} radius="xl" color="blue">
                {profilePictureLoading ? <Loader size={30} /> : <IconUser size={60} />}
              </Avatar>

              {isOwner && (
                <Stack gap="xs" mt="md" style={{ maxWidth: 200 }}>
                  <FileInput placeholder="Choose profile picture" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" value={profilePictureFile} onChange={setProfilePictureFile} leftSection={<IconCamera size={16} />} size="xs" />

                  {profilePictureFile && (
                    <Button size="xs" leftSection={<IconUpload size={14} />} onClick={handleProfilePictureUpload} loading={uploadingPicture} disabled={uploadingPicture}>
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
              <Title order={1} mb="sm">
                @{profileUsername}
              </Title>
              
              {/* Description Display Section */}
              {editingDescription ? (
                <Card withBorder p="md" mb="md" style={{ backgroundColor: '#f8f9fa' }}>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Edit Description</Text>
                    <Textarea
                      placeholder="Add a description to your profile..."
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.currentTarget.value)}
                      minRows={3}
                      maxRows={6}
                      maxLength={500}
                      error={descriptionError}
                    />
                    <Text size="xs" c="dimmed" ta="right">
                      {tempDescription.length}/500
                    </Text>
                    <Group gap="xs">
                      <Button
                        size="sm"
                        leftSection={<IconCheck size={16} />}
                        onClick={handleSaveDescription}
                        loading={savingDescription}
                        disabled={savingDescription}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        color="gray"
                        leftSection={<IconX size={16} />}
                        onClick={handleCancelEditDescription}
                        disabled={savingDescription}
                      >
                        Cancel
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              ) : (
                description && (
                  <Card withBorder p="md" mb="md">
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                      {description}
                    </Text>
                  </Card>
                )
              )}

              <Text c="dimmed" mb="md" size="sm">
                {isOwner ? "This is your profile" : "Public view."}
              </Text>

              {/* Follower/Following Stats */}
              <Group gap="md" mb="md">
                <Button variant="subtle" size="compact-sm" onClick={() => setFollowersModalOpen(true)} leftSection={<IconUsers size={16} />}>
                  <Text fw={600}>{followerCount}</Text>
                  <Text ml={4}>Followers</Text>
                </Button>
                <Button variant="subtle" size="compact-sm" onClick={() => setFollowingModalOpen(true)} leftSection={<IconUsers size={16} />}>
                  <Text fw={600}>{followingCount}</Text>
                  <Text ml={4}>Following</Text>
                </Button>
              </Group>

              {/* Action Buttons */}
              <Group gap="sm">
                {isOwner ? (
                  <>
                    <Button leftSection={<IconPencil size={16} />} variant="light" color="blue" radius="md" onClick={handleEditDescription}>
                      {description ? 'Edit Description' : 'Add Description'}
                    </Button>
                    <Button leftSection={<IconPencil size={16} />} variant="light" color="blue" radius="md" onClick={() => alert("Edit profile coming soon")}>
                      Edit Profile
                    </Button>
                  </>
                ) : user ? (
                  <>
                    {/* Show different UI if blocked */}
                    {isBlocked && !youBlockedThem ? (
                      <Text c="red" size="sm" fw={500}>
                        This user has blocked you
                      </Text>
                    ) : (
                      <>
                        {!youBlockedThem && (
                          <Button leftSection={isFollowing ? <IconUserMinus size={16} /> : <IconUserPlus size={16} />} variant={isFollowing ? "light" : "filled"} color={isFollowing ? "gray" : "blue"} radius="md" onClick={handleFollowToggle} loading={followLoading} disabled={followLoading || youBlockedThem}>
                            {isFollowing ? "Following" : "Follow"}
                          </Button>
                        )}
                        <Button leftSection={youBlockedThem ? <IconUserCheck size={16} /> : <IconUserX size={16} />} variant="light" color={youBlockedThem ? "gray" : "red"} radius="md" onClick={handleBlockToggle} loading={blockLoading} disabled={blockLoading}>
                          {youBlockedThem ? "Unblock" : "Block"}
                        </Button>
                      </>
                    )}
                  </>
                ) : null}
              </Group>
            </div>
          </Group>

          {/* Show blocked message or recipes */}
          {isBlocked && !youBlockedThem ? (
            <Card withBorder p="xl" mt="xl">
              <Center>
                <Stack align="center" gap="sm">
                  <IconUserX size={48} color="gray" />
                  <Text size="lg" fw={500} c="dimmed">
                    You cannot view this profile
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    This user has restricted access to their profile.
                  </Text>
                </Stack>
              </Center>
            </Card>
          ) : youBlockedThem ? (
            <Card withBorder p="xl" mt="xl">
              <Center>
                <Stack align="center" gap="sm">
                  <IconUserX size={48} color="gray" />
                  <Text size="lg" fw={500} c="dimmed">
                    You have blocked this user
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    Unblock them to see their content.
                  </Text>
                  <Button variant="light" color="blue" onClick={handleBlockToggle} loading={blockLoading} mt="sm">
                    Unblock User
                  </Button>
                </Stack>
              </Center>
            </Card>
          ) : (
            <section style={{ marginTop: 48 }}>
              <Group justify="space-between" mb="md">
                <Title order={2}>{headerTitle}</Title>
                {isOwner && (
                  <Group>
                    <Button variant={view === "posted" ? "filled" : "light"} onClick={() => setView("posted")}>
                      My Recipes
                    </Button>
                    <Button variant={view === "drafts" ? "filled" : "light"} onClick={() => setView("drafts")}>
                      Drafts
                    </Button>
                    <Button variant={view === "liked" ? "filled" : "light"} onClick={() => setView("liked")}>
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
                    <Text c="dimmed">{view === "posted" ? "No recipes yet." : "No drafts yet."}</Text>
                  ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                      {recipes.map((r) => (
                        <Card key={r.recipe_id} withBorder style={{ textDecoration: "none" }}>
                          <Group justify="space-between" align="start" mb="xs">
                            <Title order={4} style={{ margin: 0 }}>
                              {r.title || "(untitled)"}
                            </Title>

                            {isOwner && view !== "liked" && (
                              <Group gap="xs">
                                {/* Archive / Move to drafts (only show on posted view) */}
                                {view === "posted" && (
                                  <Button variant="light" size="compact-sm" leftSection={<IconArchive size={16} />} onClick={() => handleDraft(r.recipe_id)}>
                                    Draft
                                  </Button>
                                )}

                                {/* Delete */}
                                <Button variant="light" color="red" size="compact-sm" leftSection={<IconTrash size={16} />} onClick={() => openDeleteModal(r)}>
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
                          <Group gap="xs">
                            {isOwner && (
                              <Badge color={r.posted ? "blue" : "gray"} size="sm" variant="light">
                                {r.posted ? "Posted" : "Draft"}
                              </Badge>
                            )}
                            {r.visibility === "private" && (
                              <Badge color="orange" size="sm" variant="light" leftSection={<IconLock size={12} />}>
                                Private
                              </Badge>
                            )}
                          </Group>
                          {isOwner ? (
                            <Button
                              onClick={() => {
                                router.push(`/edit-recipe/${r.recipe_id}`);
                              }}
                              size="compact-md"
                              variant="light"
                            >
                              Edit Recipe
                            </Button>
                          ) : (
                            <Button component={Link} href={`/recipe/${r.recipe_id}`} size="compact-md" variant="light">
                              View Recipe
                            </Button>
                          )}
                        </Card>
                      ))}
                    </SimpleGrid>
                  )}
                </>
              )}
            </section>
          )}
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
          Are you sure you want to delete <b>{pendingDelete?.title || "this recipe"}</b>?<br />
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

      {/* Followers Modal */}
      {profileUser?.id && <FollowersModal opened={followersModalOpen} onClose={() => setFollowersModalOpen(false)} userId={profileUser.id} type="followers" />}

      {/* Following Modal */}
      {profileUser?.id && <FollowersModal opened={followingModalOpen} onClose={() => setFollowingModalOpen(false)} userId={profileUser.id} type="following" />}
    </AppShell>
  );
}
