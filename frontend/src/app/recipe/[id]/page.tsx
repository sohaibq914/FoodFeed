"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Container, Title, Text, Loader, Center, Paper, Stack, Group, ActionIcon, Textarea, Button, Card, Divider, Modal } from "@mantine/core";
import { IconHeart, IconHeartFilled, IconTrash } from "@tabler/icons-react";

export default function RecipePage() {
  const params = useParams();
  const recipe_id = params.id as string;
  const { user } = useAuth();

  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // Comment state
  const [comments, setComments] = useState<any[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const res = await fetch(`http://localhost:5001/get_recipe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe_id,
            user_id: user?.id || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch recipe");
        setRecipe(data);
        setLikeCount(data.like_count || 0);
        setIsLiked(data.user_has_liked || false);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [recipe_id, user]);

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setCommentsLoading(true);
        const url = user ? `http://localhost:5001/recipes/${recipe_id}/comments?user_id=${user.id}` : `http://localhost:5001/recipes/${recipe_id}/comments`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch comments");
        setComments(data.comments || []);
      } catch (err: any) {
        console.error("Error fetching comments:", err);
      } finally {
        setCommentsLoading(false);
      }
    };
    fetchComments();
  }, [recipe_id, user]);

  const handleLikeToggle = async () => {
    if (!user) {
      alert("Please log in to like recipes");
      return;
    }

    if (likeLoading) return;

    setLikeLoading(true);
    setIsAnimating(true);

    try {
      const endpoint = isLiked ? `http://localhost:5001/recipes/${recipe_id}/unlike` : `http://localhost:5001/recipes/${recipe_id}/like`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to update like");

      setLikeCount(data.like_count);
      setIsLiked(data.liked);
    } catch (err: any) {
      console.error("Error updating like:", err);
      alert(err.message || "Failed to update like");
    } finally {
      setLikeLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      alert("Please log in to comment");
      return;
    }

    if (!commentContent.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    setCommentLoading(true);

    try {
      const res = await fetch(`http://localhost:5001/recipes/${recipe_id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_id: user.id,
          content: commentContent,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to add comment");

      // Add new comment to the top of the list
      setComments([data.comment, ...comments]);
      setCommentContent("");
    } catch (err: any) {
      console.error("Error adding comment:", err);
      alert(err.message || "Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete || !user) return;

    try {
      const res = await fetch(`http://localhost:5001/comments/${commentToDelete}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to delete comment");

      // Remove comment from list
      setComments(comments.filter((c) => c.comment_id !== commentToDelete));
      setDeleteModalOpen(false);
      setCommentToDelete(null);
    } catch (err: any) {
      console.error("Error deleting comment:", err);
      alert(err.message || "Failed to delete comment");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
  };

  const handleCommentLikeToggle = async (commentId: string, isCurrentlyLiked: boolean) => {
    if (!user) {
      alert("Please log in to like comments");
      return;
    }

    try {
      const endpoint = isCurrentlyLiked ? `http://localhost:5001/comments/${commentId}/unlike` : `http://localhost:5001/comments/${commentId}/like`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to update like");

      // Update comment in state
      setComments((prev) =>
        prev.map((c) => {
          if (c.comment_id === commentId) {
            return { ...c, like_count: data.like_count, user_has_liked: data.liked };
          }
          // Also check replies
          if (c.replies) {
            c.replies = c.replies.map((r: any) => (r.comment_id === commentId ? { ...r, like_count: data.like_count, user_has_liked: data.liked } : r));
          }
          return c;
        })
      );
    } catch (err: any) {
      console.error("Error updating comment like:", err);
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!user) {
      alert("Please log in to reply");
      return;
    }

    if (!replyContent.trim()) {
      alert("Reply cannot be empty");
      return;
    }

    setReplyLoading(true);

    try {
      const res = await fetch(`http://localhost:5001/comments/${parentCommentId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_id: user.id,
          content: replyContent,
          recipe_id: recipe_id,
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to add reply");

      // Add reply to the parent comment
      setComments((prev) =>
        prev.map((c) => {
          if (c.comment_id === parentCommentId) {
            return {
              ...c,
              replies: [...(c.replies || []), data.reply],
            };
          }
          return c;
        })
      );
      setReplyContent("");
      setReplyingTo(null);
    } catch (err: any) {
      console.error("Error adding reply:", err);
      alert(err.message || "Failed to add reply");
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
      <Container>
        <Text c="red">{error}</Text>
      </Container>
    );

  if (!recipe) {
    console.log("Recipe is missing:", recipe);
    return (
      <Container>
        <Text c="dimmed">Recipe not found.</Text>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="flex-start">
        <div style={{ flex: 1 }}>
          <Title order={2}>{recipe.title}</Title>
          <Text c="dimmed" mt="sm">
            By{" "}
            <Link
              href={`/${recipe.users?.username || recipe.author_id}`}
              style={{
                color: "blue",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {recipe.users?.username || "Unknown"}
            </Link>
          </Text>
        </div>

        <Group gap="xs" align="center">
          <ActionIcon
            variant={isLiked ? "filled" : "light"}
            color={isLiked ? "red" : "gray"}
            size="lg"
            radius="xl"
            onClick={handleLikeToggle}
            loading={likeLoading}
            style={{
              transition: "all 0.2s ease",
              transform: isAnimating ? "scale(1.2)" : "scale(1)",
            }}
          >
            {isLiked ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
          </ActionIcon>
          <Text fw={600} size="lg">
            {likeCount}
          </Text>
        </Group>
      </Group>

      <Paper shadow="xs" p="md" mt="xl">
        <Stack>
          <Text fw={600}>Description</Text>
          <Text>{recipe.description}</Text>

          <Text fw={600} mt="md">
            Ingredients
          </Text>
          <Text>{recipe.ingredients}</Text>

          <Text fw={600} mt="md">
            Instructions
          </Text>
          <Text>{recipe.instructions}</Text>

          {recipe.nutrition && (
            <>
              <Text fw={600} mt="md">
                Nutrition
              </Text>
              <Text>{recipe.nutrition}</Text>
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
        </Stack>
      </Paper>

      {/* Comments Section */}
      <Paper shadow="xs" p="md" mt="xl">
        <Title order={3} mb="md">
          Comments ({comments.length})
        </Title>

        {/* Add Comment Form */}
        {user ? (
          <Stack mb="xl">
            <Textarea placeholder="Write a comment..." value={commentContent} onChange={(e) => setCommentContent(e.target.value)} minRows={3} maxRows={6} />
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

        {/* Comments List */}
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

                      {/* Like and Reply buttons */}
                      <Group gap="md">
                        <Group gap="xs">
                          <ActionIcon variant={comment.user_has_liked ? "filled" : "light"} color={comment.user_has_liked ? "red" : "gray"} size="sm" onClick={() => handleCommentLikeToggle(comment.comment_id, comment.user_has_liked)}>
                            {comment.user_has_liked ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
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
                              setReplyingTo(replyingTo === comment.comment_id ? null : comment.comment_id);
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
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    )}
                  </Group>

                  {/* Reply input box */}
                  {replyingTo === comment.comment_id && (
                    <Stack mt="md" pl="md">
                      <Textarea placeholder="Write a reply..." value={replyContent} onChange={(e) => setReplyContent(e.target.value)} minRows={2} maxRows={4} />
                      <Group justify="flex-end">
                        <Button variant="default" size="xs" onClick={() => setReplyingTo(null)}>
                          Cancel
                        </Button>
                        <Button size="xs" onClick={() => handleAddReply(comment.comment_id)} loading={replyLoading}>
                          Post Reply
                        </Button>
                      </Group>
                    </Stack>
                  )}
                </Card>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <Stack gap="sm" ml="xl" mt="sm">
                    {comment.replies.map((reply: any) => (
                      <Card key={reply.comment_id} withBorder padding="sm" style={{ backgroundColor: "#f8f9fa" }}>
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

                            {/* Reply like button */}
                            <Group gap="xs">
                              <ActionIcon variant={reply.user_has_liked ? "filled" : "light"} color={reply.user_has_liked ? "red" : "gray"} size="sm" onClick={() => handleCommentLikeToggle(reply.comment_id, reply.user_has_liked)}>
                                {reply.user_has_liked ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
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
        <Text mb="md">Are you sure you want to delete this comment? This action cannot be undone.</Text>
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
  );
}
