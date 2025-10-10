"use client";
import { useState, useEffect } from "react";
import {
  Container,
  Paper,
  TextInput,
  Textarea,
  Button,
  Title,
  Alert,
  Stack,
  Center,
  Flex,
  Checkbox,
  Tooltip,
} from "@mantine/core";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function RecipeEditor(params: { recipe_id: string }) {
  const [title, setTitle] = useState("");
  const [description, setDesc] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [nutrition, setNutrition] = useState("");
  const [allergens, setAllergens] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  const isNew = params.recipe_id === "new";

  // Fetch existing recipe when editing
  useEffect(() => {
    if (!params.recipe_id || isNew) return;
    get_recipe(params.recipe_id);
  }, [params.recipe_id, isNew]);

  // --- API helpers ---

  const get_recipe = async (recipe_id: string) => {
    try {
      const response = await fetch("http://localhost:5001/get_recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipe_id }),
      });

      const data = await response.json();
      if (response.ok) {
        setTitle(data.title || "");
        setDesc(data.description || "");
        setIngredients(data.ingredients || "");
        setInstructions(data.instructions || "");
        setNutrition(data.nutrition || "");
        setAllergens(data.allergens || "");
      } else {
        router.push("/edit-recipe/new");
      }
    } catch (err) {
      console.error(err);
      setError("Network error while fetching recipe");
    }
  };

  const update_recipe = async (
    recipe_id: string,
    author: string,
    title: string,
    description: string,
    ingredients: string,
    instructions: string,
    nutrition: string,
    allergens: string,
    posting: boolean
  ) => {
    try {
      const response = await fetch("http://localhost:5001/update_recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id,
          author,
          title,
          description,
          ingredients,
          instructions,
          nutrition,
          allergens,
          posting,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data?.error || "Failed to update");

      // ✅ Redirect to dashboard after success
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Network error while updating recipe");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!user) {
      setError("User not logged in");
      setLoading(false);
      return;
    }

    const confirmMsg = posting
      ? "Are you sure you want to post this recipe to your profile?"
      : "Save this recipe as a draft?";
    const confirmed = confirm(confirmMsg);
    if (!confirmed) {
      setLoading(false);
      return;
    }

    await update_recipe(
      params.recipe_id,
      user.id,
      title,
      description,
      ingredients,
      instructions,
      nutrition,
      allergens,
      posting
    );

    setLoading(false);
  };

  // --- UI ---
  return (
    <Container
      size="xl"
      style={{
        height: 70,
        minHeight: "100vh",
        display: "flex",
        alignItems: "start",
      }}
    >
      <Paper shadow="lg" p="xl" radius="md" style={{ width: "100%" }}>
        <Center mb="xl">
          <Title order={2}>Recipe Editor</Title>
        </Center>

        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Title"
              placeholder="Your recipe's title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              required
              size="md"
            />

            <Textarea
              label="Description"
              placeholder="Your recipe's description"
              autosize
              minRows={2}
              maxRows={3}
              value={description}
              onChange={(e) => setDesc(e.currentTarget.value)}
              required
              size="md"
            />

            <Textarea
              label="Ingredients"
              placeholder="Your recipe's ingredient list"
              value={ingredients}
              autosize
              minRows={2}
              maxRows={8}
              onChange={(e) => setIngredients(e.currentTarget.value)}
              required
              size="md"
            />

            <Textarea
              label="Instructions"
              placeholder="Your recipe's directions"
              autosize
              minRows={4}
              maxRows={10}
              value={instructions}
              onChange={(e) => setInstructions(e.currentTarget.value)}
              required
              size="md"
            />

            <Textarea
              label="Nutrition Facts"
              placeholder="Your recipe's nutritional information"
              autosize
              minRows={2}
              maxRows={6}
              value={nutrition}
              onChange={(e) => setNutrition(e.currentTarget.value)}
              size="md"
            />

            <Textarea
              label="Allergens"
              placeholder="Your recipe's allergens"
              value={allergens}
              autosize
              minRows={2}
              maxRows={6}
              onChange={(e) => setAllergens(e.currentTarget.value)}
              size="md"
            />

            {error && (
              <Alert color="red" variant="filled">
                {error}
              </Alert>
            )}

            <Flex justify="flex-start" gap="xl" align="center">
              <Tooltip label="Post this recipe to your profile.">
                <Checkbox
                  checked={posting}
                  onChange={(e) => setPosting(e.currentTarget.checked)}
                  size="md"
                  label="Post"
                  labelPosition="left"
                />
              </Tooltip>

              <Button type="submit" loading={loading} size="md">
                {posting ? "Post to Profile" : "Save Draft"}
              </Button>
            </Flex>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
