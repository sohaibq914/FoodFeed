"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Container,
  Title,
  Text,
  Loader,
  Center,
  Paper,
  Badge,
  Stack,
  Group,
  ActionIcon,
  Textarea,
  Button,
  Card,
  Divider,
  Modal,
  AppShell,
  Image,
  Select,
} from "@mantine/core";
import Header from "@/components/Header";
import {
  IconHeart,
  IconHeartFilled,
  IconHeartBroken,
  IconHeartBrokenFilled,
  IconTrash,
} from "@tabler/icons-react";
import { CopyButton, Tooltip, TextInput } from "@mantine/core";
import { IconShare3, IconCheck, IconCopy } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

type Recipe = {
  recipe_id: string;
  title: string;
  description?: string | null;
  ingredients?: [] | null;
  instructions?: string | null;
  nutrition_facts?: string | null;
  allergens?: string | null;
  author_id?: string;
  users?: { username?: string | null } | null;
  like_count?: number;
  user_has_liked?: boolean;
  dislike_count?: number;
  user_has_disliked?: boolean;
  image?: string;
  tags?: Array<string>;
  prep_time: number;
  cook_time: number;
};

type RecipeComment = {
  comment_id: string;
  author_id: string;
  users?: { username?: string | null } | null;
  content: string;
  created_at: string;
  like_count?: number;
  user_has_liked?: boolean;
  replies?: RecipeComment[];
};

const ingredientDefault = [{ name: "", quantity: 0, unit: "" }];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

export default function RecipePage() {
  const params = useParams<{ id: string }>();
  const recipeId = params?.id as string;
  const { user } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState(ingredientDefault);
  const [tags, setTags] = useState<string[]>([]);
  const [portion, setPortion] = useState<string | null>("1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [dislikeCount, setDislikeCount] = useState(0);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isAnimatingLike, setIsAnimatingLike] = useState(false);
  const [isAnimatingDislike, setIsAnimatingDislike] = useState(false);

  const [animatingRecipe, setAnimatingRecipe] = useState<string | null>(null);

  const [likeLoading, setLikeLoading] = useState(false);

  // Comments
  const [comments, setComments] = useState<RecipeComment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Replies
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  const [shareOpen, { open: openShare, close: closeShare }] =
    useDisclosure(false);

  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/recipe/${recipeId}`;

  // Fetch recipe
  useEffect(() => {
    if (!recipeId) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/get_recipe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe_id: recipeId,
            user_id: user?.id ?? null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch recipe");

        setRecipe(data as Recipe);
        setIngredients(JSON.parse(data.ingredients || "[]"));

        try {
          const parsedTags = data.tags ? JSON.parse(data.tags) : [];
          setTags(parsedTags);
        } catch {
          setTags([]);
        }

        console.log(recipe);
        setLikeCount(data.like_count ?? 0);
        setIsLiked(Boolean(data.user_has_liked));
        try {
          const res = await fetch(`${API_BASE}/view_recipe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipe_id: recipeId,
              user_id: user?.id ?? null,
            }),
          });
        } catch (e: any) {
          setError(e.message || "Failed to increment view");
        }
      } catch (e: any) {
        setError(e.message || "Failed to fetch recipe");
      } finally {
        setLoading(false);
      }
    })();
  }, [recipeId, user?.id]);

  // Fetch comments
  useEffect(() => {
    if (!recipeId) return;
    (async () => {
      try {
        setCommentsLoading(true);
        const url = user?.id
          ? `${API_BASE}/recipes/${recipeId}/comments?user_id=${encodeURIComponent(
              user.id
            )}`
          : `${API_BASE}/recipes/${recipeId}/comments`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch comments");
        setComments((data?.comments as RecipeComment[]) || []);
      } catch (e) {
        console.error("Error fetching comments:", e);
      } finally {
        setCommentsLoading(false);
      }
    })();
  }, [recipeId, user?.id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString()}`;
    // Consider using toLocaleString with a set timezone if you want consistency.
  };

  const handleLikeToggle = async (
    e: React.MouseEvent,
    isCurrentlyLiked: boolean,
    is_dislike: boolean
  ) => {
    if (!user) {
      alert("Please log in to like recipes");
      return;
    }
    if (likeLoading) return;

    if (!user) return;

    setLikeLoading(true);
    is_dislike ? setIsAnimatingDislike(true) : setIsAnimatingLike(true);

    try {
      const endpoint = isCurrentlyLiked
        ? `${API_BASE}/recipes/${recipeId}/unlike`
        : `${API_BASE}/recipes/${recipeId}/like`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, is_dislike: is_dislike }),
      });

      const data = await res.json();
      console.log(data);

      if (!res.ok) throw new Error(data?.error || "Failed to update like");

      // Update the UI
      if (recipe) {
        setRecipe({
          ...recipe,
          like_count: data.like_count,
          dislike_count: data.dislike_count,
          user_has_liked: data.liked,
          user_has_disliked: data.disliked,
        });
      }
    } catch (err: any) {
      console.error("Error updating like:", err);
      alert(err.message || "Failed to update like");
    } finally {
      setLikeLoading(false);
      setTimeout(() => setIsAnimatingLike(false), 300);
      setTimeout(() => setIsAnimatingDislike(false), 300);
    }
  };

  const handleAddComment = async () => {
    if (!user) return alert("Please log in to comment");
    if (!commentContent.trim()) return alert("Comment cannot be empty");

    try {
      setCommentLoading(true);
      const res = await fetch(`${API_BASE}/recipes/${recipeId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_id: user.id,
          content: commentContent.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add comment");

      setComments((prev) => [data.comment as RecipeComment, ...prev]);
      setCommentContent("");
    } catch (e: any) {
      console.error("Error adding comment:", e);
      alert(e.message || "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete || !user) return;
    try {
      const res = await fetch(`${API_BASE}/comments/${commentToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete comment");

      setComments(
        (prev) =>
          prev
            .map((c) =>
              c.comment_id === commentToDelete
                ? null
                : {
                    ...c,
                    replies: c.replies?.filter(
                      (r) => r.comment_id !== commentToDelete
                    ),
                  }
            )
            .filter(Boolean) as RecipeComment[]
      );
      setDeleteModalOpen(false);
      setCommentToDelete(null);
    } catch (e: any) {
      console.error("Error deleting comment:", e);
      alert(e.message || "Failed to delete comment");
    }
  };

  const handleCommentLikeToggle = async (
    commentId: string,
    isCurrentlyLiked: boolean
  ) => {
    if (!user) {
      alert("Please log in to like comments");
      return;
    }
    try {
      const endpoint = isCurrentlyLiked
        ? `${API_BASE}/comments/${commentId}/unlike`
        : `${API_BASE}/comments/${commentId}/like`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update like");

      setComments((prev) =>
        prev.map((c) => {
          if (c.comment_id === commentId) {
            return {
              ...c,
              like_count: data.like_count,
              user_has_liked: Boolean(data.liked),
            };
          }
          const newReplies = c.replies?.map((r) =>
            r.comment_id === commentId
              ? {
                  ...r,
                  like_count: data.like_count,
                  user_has_liked: Boolean(data.liked),
                }
              : r
          );
          return newReplies ? { ...c, replies: newReplies } : c;
        })
      );
    } catch (e) {
      console.error("Error updating comment like:", e);
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!user) return alert("Please log in to reply");
    if (!replyContent.trim()) return alert("Reply cannot be empty");

    try {
      setReplyLoading(true);
      const res = await fetch(`${API_BASE}/comments/${parentCommentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_id: user.id,
          content: replyContent.trim(),
          recipe_id: recipeId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add reply");

      setComments((prev) =>
        prev.map((c) =>
          c.comment_id === parentCommentId
            ? { ...c, replies: [...(c.replies || []), data.reply] }
            : c
        )
      );
      setReplyContent("");
      setReplyingTo(null);
    } catch (e: any) {
      console.error("Error adding reply:", e);
      alert(e.message || "Failed to add reply");
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading)
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );

  if (error)
    return (
      <AppShell header={{ height: 70 }} padding="md">
        <AppShell.Header>
          <Header />
        </AppShell.Header>
        <AppShell.Main>
          <Container>
            <Text c="red">{error}</Text>
          </Container>
        </AppShell.Main>
      </AppShell>
    );

  if (!recipe)
    return (
      <AppShell header={{ height: 70 }} padding="md">
        <AppShell.Header>
          <Header />
        </AppShell.Header>
        <AppShell.Main>
          <Container>
            <Text c="dimmed">Recipe not found.</Text>
          </Container>
        </AppShell.Main>
      </AppShell>
    );

  const authorUsername =
    recipe.users?.username || (recipe.author_id ?? "Unknown");

  const test = () => {
    console.log(recipe);
    console.log(recipe.tags);

    return true;
  };

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Header />
      </AppShell.Header>

      <AppShell.Main>
        <Container size="md" py="xl">
          {/* Header row */}
          <Group justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Title order={2}>{recipe.title}</Title>
              <Text c="dimmed" mt="sm">
                By{" "}
                <Link
                  href={`/${authorUsername}`}
                  style={{
                    color: "blue",
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {authorUsername}
                </Link>
              </Text>
              {recipe.image && (
                <Image
                  src={recipe.image}
                  alt="preview"
                  radius="sm"
                  w="auto"
                  h={140}
                  fit="contain"
                  mt="sm"
                ></Image>
              )}
            </div>

            <Group gap="xs" align="center">
              {/*
                Like and Dislike buttons
              */}

              <ActionIcon
                variant={recipe.user_has_liked ? "filled" : "light"}
                color={recipe.user_has_liked ? "red" : "gray"}
                size="md"
                radius="xl"
                onClick={(e) =>
                  handleLikeToggle(e, recipe.user_has_liked || false, false)
                }
                disabled={likeLoading}
                style={{
                  transition: "all 0.2s ease",
                  transform: isAnimatingLike ? "scale(1.2)" : "scale(1)",
                }}
              >
                {recipe.user_has_liked ? (
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
                {recipe.like_count || 0}
              </Text>
              <ActionIcon
                variant={recipe.user_has_disliked ? "filled" : "light"}
                color={recipe.user_has_disliked ? "red" : "gray"}
                size="md"
                radius="xl"
                onClick={(e) =>
                  handleLikeToggle(e, recipe.user_has_disliked || false, true)
                }
                style={{
                  transition: "all 0.2s ease",
                  transform: isAnimatingDislike ? "scale(1.2)" : "scale(1)",
                }}
              >
                {recipe.user_has_disliked ? (
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
                {recipe.dislike_count || 0}
              </Text>
            </Group>

            {/* share function, should there be a better url shortener later? */}
            <Tooltip label="Share" openDelay={250}>
              <ActionIcon
                variant="light"
                size="lg"
                radius="xl"
                onClick={openShare}
                aria-label="Share recipe"
              >
                <IconShare3 size={20} />
              </ActionIcon>
            </Tooltip>
            <Modal
              opened={shareOpen}
              onClose={closeShare}
              title="Share this recipe"
              centered
            >
              <Stack>
                <Text size="sm" c="dimmed">
                  Copy the link below to share this recipe.
                </Text>

                <TextInput
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.currentTarget.select()}
                  rightSection={
                    <CopyButton value={shareUrl} timeout={1400}>
                      {({ copied, copy }) => (
                        <Tooltip
                          label={copied ? "Copied!" : "Copy"}
                          openDelay={200}
                        >
                          <ActionIcon
                            onClick={copy}
                            variant="light"
                            aria-label="Copy link"
                          >
                            {copied ? (
                              <IconCheck size={18} />
                            ) : (
                              <IconCopy size={18} />
                            )}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  }
                />

                <Group justify="flex-end" mt="sm">
                  <Button variant="default" onClick={closeShare}>
                    Close
                  </Button>
                </Group>
              </Stack>
            </Modal>
          </Group>

          {/* Body */}
          <Paper shadow="xs" p="md" mt="xl">
            <Stack>
              {recipe.description && (
                <>
                  <Text fw={600}>Description</Text>
                  <Text>{recipe.description}</Text>
                </>
              )}

              {/* Prep and cook time */}
              {(recipe.prep_time > 0 || recipe.cook_time > 0) && (
                <Group justify="flex" gap="xl">
                  {recipe.prep_time > 0 && (
                    <Stack>
                      <Text fw={600}>Preparation Time</Text>
                      <Text>{recipe.prep_time} minutes</Text>
                    </Stack>
                  )}

                  {recipe.cook_time > 0 && (
                    <Stack>
                      <Text fw={600}>Cooking Time</Text>
                      <Text>{recipe.cook_time} minutes</Text>
                    </Stack>
                  )}
                </Group>
              )}

              {ingredients && (
                <>
                  <Text fw={600} mt="md">
                    Ingredients
                  </Text>

                  <Group>
                    <Select
                      label="Portion"
                      value={portion}
                      onChange={(value) => setPortion(value)}
                      data={["0.5", "1", "2", "3"]}
                      allowDeselect={false}
                    ></Select>
                  </Group>
                  <Stack>
                    {ingredients.map((ingredient, index) => {
                      return (
                        <Text key={index}>
                          {" "}
                          {ingredient.name}:{" "}
                          {ingredient.quantity * Number(portion)}{" "}
                          {ingredient.unit}{" "}
                        </Text>
                      );
                    })}
                  </Stack>
                </>
              )}

              {recipe.instructions && (
                <>
                  <Text fw={600} mt="md">
                    Instructions
                  </Text>
                  <Text>{recipe.instructions}</Text>
                </>
              )}

              {recipe.nutrition_facts && (
                <>
                  <Text fw={600} mt="md">
                    Nutrition Facts
                  </Text>
                  <Text>{recipe.nutrition_facts}</Text>
                </>
              )}

              {recipe.allergens && (
                <>
                  <Text fw={600} mt="md">
                    Allergens
                  </Text>
                  <Text>{recipe.allergens}</Text>
                </>
              )}

              {tags.length > 0 && (
                <>
                  <Text fw={600} mt="md">
                    Tags
                  </Text>
                  <Group gap="xs">
                    {tags.map((tag, index) => (
                      <Badge
                        key={`${tag}-${index}`}
                        color="indigo"
                        radius="xl"
                        variant="light"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </>
              )}
            </Stack>
          </Paper>

          {/* Comments Section */}
          <Paper shadow="xs" p="md" mt="xl">
            <Title order={3} mb="md">
              Comments ({comments.length})
            </Title>

            {/* Add Comment */}
            {user ? (
              <Stack mb="xl">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  minRows={3}
                  maxRows={6}
                />
                <Group justify="flex-end">
                  <Button onClick={handleAddComment} loading={commentLoading}>
                    Post Comment
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Text c="dimmed" mb="xl">
                Please log in to comment
              </Text>
            )}

            <Divider mb="md" />

            {/* Comments list */}
            {commentsLoading ? (
              <Center py="xl">
                <Loader />
              </Center>
            ) : comments.length === 0 ? (
              <Text c="dimmed" ta="center" py="xl">
                No comments yet. Be the first to comment!
              </Text>
            ) : (
              <Stack gap="md">
                {comments.map((comment) => (
                  <div key={comment.comment_id}>
                    <Card withBorder padding="md">
                      <Group justify="space-between" align="flex-start">
                        <div style={{ flex: 1 }}>
                          <Group gap="xs" mb="xs">
                            <Text fw={600} size="sm">
                              {comment.users?.username || "Unknown User"}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {formatDate(comment.created_at)}
                            </Text>
                          </Group>
                          <Text mb="sm">{comment.content}</Text>

                          {/* Like / Reply */}
                          <Group gap="md">
                            <Group gap="xs">
                              <ActionIcon
                                variant={
                                  comment.user_has_liked ? "filled" : "light"
                                }
                                color={comment.user_has_liked ? "red" : "gray"}
                                size="sm"
                                onClick={() =>
                                  handleCommentLikeToggle(
                                    comment.comment_id,
                                    Boolean(comment.user_has_liked)
                                  )
                                }
                                aria-label={
                                  comment.user_has_liked ? "Unlike" : "Like"
                                }
                              >
                                {comment.user_has_liked ? (
                                  <IconHeartFilled size={14} />
                                ) : (
                                  <IconHeart size={14} />
                                )}
                              </ActionIcon>
                              <Text size="sm" c="dimmed">
                                {comment.like_count || 0}
                              </Text>
                            </Group>

                            {user && (
                              <Button
                                variant="subtle"
                                size="xs"
                                onClick={() => {
                                  setReplyingTo(
                                    replyingTo === comment.comment_id
                                      ? null
                                      : comment.comment_id
                                  );
                                  setReplyContent("");
                                }}
                              >
                                Reply
                              </Button>
                            )}
                          </Group>
                        </div>

                        {user && user.id === comment.author_id && (
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            onClick={() => {
                              setCommentToDelete(comment.comment_id);
                              setDeleteModalOpen(true);
                            }}
                            aria-label="Delete comment"
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        )}
                      </Group>

                      {/* Reply input */}
                      {replyingTo === comment.comment_id && (
                        <Stack mt="md" pl="md">
                          <Textarea
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            minRows={2}
                            maxRows={4}
                          />
                          <Group justify="flex-end">
                            <Button
                              variant="default"
                              size="xs"
                              onClick={() => setReplyingTo(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => handleAddReply(comment.comment_id)}
                              loading={replyLoading}
                            >
                              Post Reply
                            </Button>
                          </Group>
                        </Stack>
                      )}
                    </Card>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <Stack gap="sm" ml="xl" mt="sm">
                        {comment.replies.map((reply) => (
                          <Card
                            key={reply.comment_id}
                            withBorder
                            padding="sm"
                            style={{ backgroundColor: "#f8f9fa" }}
                          >
                            <Group justify="space-between" align="flex-start">
                              <div style={{ flex: 1 }}>
                                <Group gap="xs" mb="xs">
                                  <Text fw={600} size="sm">
                                    {reply.users?.username || "Unknown User"}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {formatDate(reply.created_at)}
                                  </Text>
                                </Group>
                                <Text size="sm" mb="xs">
                                  {reply.content}
                                </Text>

                                <Group gap="xs">
                                  <ActionIcon
                                    variant={
                                      reply.user_has_liked ? "filled" : "light"
                                    }
                                    color={
                                      reply.user_has_liked ? "red" : "gray"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      handleCommentLikeToggle(
                                        reply.comment_id,
                                        Boolean(reply.user_has_liked)
                                      )
                                    }
                                    aria-label={
                                      reply.user_has_liked ? "Unlike" : "Like"
                                    }
                                  >
                                    {reply.user_has_liked ? (
                                      <IconHeartFilled size={14} />
                                    ) : (
                                      <IconHeart size={14} />
                                    )}
                                  </ActionIcon>
                                  <Text size="sm" c="dimmed">
                                    {reply.like_count || 0}
                                  </Text>
                                </Group>
                              </div>

                              {user && user.id === reply.author_id && (
                                <ActionIcon
                                  color="red"
                                  variant="subtle"
                                  size="sm"
                                  onClick={() => {
                                    setCommentToDelete(reply.comment_id);
                                    setDeleteModalOpen(true);
                                  }}
                                  aria-label="Delete reply"
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </div>
                ))}
              </Stack>
            )}
          </Paper>

          {/* Delete Confirmation Modal */}
          <Modal
            opened={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setCommentToDelete(null);
            }}
            title="Delete Comment"
            centered
          >
            <Text mb="md">
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </Text>
            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setCommentToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button color="red" onClick={handleDeleteComment}>
                Delete
              </Button>
            </Group>
          </Modal>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
