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
  FileInput,
  Image,
  Group,
  CloseButton,
  TagsInput,
  SegmentedControl, 
  Text,
  NumberInput
} from "@mantine/core";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, forbidden } from "next/navigation";

const ingredientDefault = [
  {name: "", quantity: 0, unit: ""},
];

export default function RecipeEditor(params: { recipe_id: string }) {
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDesc] = useState("");
  const [ingredients, setIngredients] = useState(ingredientDefault);
  const [instructions, setInstructions] = useState("");
  const [nutrition, setNutrition] = useState("");
  const [allergens, setAllergens] = useState("");
  const [files, setFiles] = useState<File | null>(null);
  const [previews, setPreviews] = useState<string>();
  const [tags, setTags] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  const { user } = useAuth();
  const router = useRouter();

  const isNew = params.recipe_id === "new";

  // Fetch existing recipe when editing
  useEffect(() => {
    if (!params.recipe_id || isNew) return;
    get_recipe(params.recipe_id);
  }, [params.recipe_id, isNew]);

  useEffect(() => {
    if (!files) {
      setPreviews("");
      return;
    }
    const urls = URL.createObjectURL(files);
    setPreviews(urls);
    return () => URL.revokeObjectURL(urls);
  }, [files]);

  function removeImage() {
    console.log("pressed");
    setPreviews("");
    setFiles(null);
  }

  function addIngredient() {
    console.log("pressed");
    setIngredients( [...ingredients, {name: "", quantity: 0, unit: ""}]);
  }

  function removeIngredient(index: number) {
    console.log("pressed");
    setIngredients( ingredients.filter(i => ingredients.indexOf(i) !== index));
  }

  // --- API helpers ---

  const get_recipe = async (recipe_id: string) => {
    try {
      const response = await fetch("http://localhost:5001/get_recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id,
          user_id: user?.id, // Include user_id for privacy checks
        }),
      });


      const data = await response.json();

      console.log(data)

      if (response.ok) {
        setAuthor(data.author_id || "");
        setTitle(data.title || "");
        setDesc(data.description || "");
        setIngredients(JSON.parse(data.ingredients) || ingredientDefault);
        setInstructions(data.instructions || "");
        setNutrition(data.nutrition_facts || "");
        setAllergens(data.allergens || "");
        setPreviews(data.image || "");
        setVisibility(data.visibility || "public");
        setTags(JSON.parse(data.tags) || [])

        console.log(user)

        if (user === null || author !== user.id) {
          console.log("illegal!")
          router.push("/dashboard/");
        }
      } else {
        console.error("Failed to load recipe:", data.error);
        setError(data.error || "Failed to load recipe");
      }
    } catch (err) {
      console.error(err);
      setError("Network error while fetching recipe");
    }
  };

  const update_recipe = async (recipe_id: string, author: string, title: string, description: string, 
    ingredients: {name: string, quantity: number, unit: string}[], instructions: string, nutrition: string, 
    allergens: string, posting: boolean, image: File | null, visibility: string) => {

    try {
      const fd = new FormData();
      fd.append("recipe_id", recipe_id);
      fd.append("author", author);
      fd.append("title", title);
      fd.append("description", description);
      fd.append("ingredients", JSON.stringify(ingredients));
      fd.append("instructions", instructions);
      fd.append("nutrition", nutrition);
      fd.append("allergens", allergens);
      fd.append("posting", String(posting));
      fd.append("visibility", visibility);
      if (image) {
        fd.append("image", image)
      }
      fd.append("tags", JSON.stringify(tags).toLowerCase())

      const response = await fetch(`http://localhost:5001/update_recipe`, { method: "POST", body: fd });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to update");
      else 
        // ✅ Reload page after success
        router.push("/edit-recipe/" + data.recipe_id);

    } catch (err) {
      console.error(err);
      setError("Network error while updating recipe");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log("Posting: " + posting);

    if (!user) {
      setError("User not logged in");
      setLoading(false);
      return;
    }

    const confirmMsg = posting ? "Are you sure you want to post this recipe to your profile?" : "Save this recipe as a draft?";
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
      posting,
      files,
      visibility
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
            <TextInput label="Title" placeholder="Your recipe's title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} required size="md" />

            <Textarea label="Description" placeholder="Your recipe's description" autosize minRows={2} maxRows={3} value={description} onChange={(e) => setDesc(e.currentTarget.value)} required size="md" />
            
            <Stack gap="sm" align="flex-start">
              <Group justify="flex-start" gap="xs">
                <Text size="md" fw={500}>
                  Ingredients
                </Text>
                <Text size="md" fw={500} c="red">
                  *
                </Text>
              </Group>
              <Stack justify="space-between" align="stretch">
                {ingredients.map((ingredient, index) => (
                  <Group key = {index} justify="flex-start">
                    <TextInput placeholder="Ingredient name" value={ingredient.name} required size="md"
                    onChange={(e) => setIngredients(
                      ingredients.map((ingredient, subIndex) => {
                        if (index === subIndex) {
                          return { ...ingredient, name: e.currentTarget.value };
                        } else {
                          return ingredient;
                        }
                      })
                    )}/>          
                    <NumberInput required size="md" placeholder="Quantity" allowNegative={false} decimalScale={3} hideControls value={ingredient.quantity}
                    onChange={(e) => setIngredients(
                      ingredients.map((ingredient, subIndex) => {
                        if (index === subIndex) {  
                          return { ...ingredient, quantity: Number(e)};
                        } else {
                          return ingredient;
                        }
                      })
                    )}/>
                    <TextInput placeholder="Unit" value={ingredient.unit} required size="md" 
                    onChange={(e) => setIngredients(
                      ingredients.map((ingredient, subIndex) => {
                        if (index === subIndex) {
                          return { ...ingredient, unit: e.currentTarget.value };
                        } else {
                          return ingredient;
                        }
                      })
                    )}/>
                    <CloseButton size="md" onClick={() => removeIngredient(index)} >
                    </CloseButton>
                  </Group>
                ))}
              </Stack>
              <Group justify="center">
                <Button size="md" onClick={() => addIngredient()} >
                  Add ingredient
                </Button>
              </Group>
            </Stack>
            
            <Textarea label="Instructions" placeholder="Your recipe's directions" autosize minRows={4} maxRows={10} value={instructions} onChange={(e) => setInstructions(e.currentTarget.value)} required size="md" />

            <Textarea label="Nutrition Facts" placeholder="Your recipe's nutritional information" autosize minRows={2} maxRows={6} value={nutrition} onChange={(e) => setNutrition(e.currentTarget.value)} size="md" />

            <Textarea label="Allergens" placeholder="Your recipe's allergens" value={allergens} autosize minRows={2} maxRows={6} onChange={(e) => setAllergens(e.currentTarget.value)} size="md" />
            
            <TagsInput label="Tags" placeholder="Type a tag and press enter" value={tags} onChange={setTags} size="md" />

            <FileInput label="Add an Image" placeholder="Click to upload an image" accept="image/*" value={files} onChange={setFiles} clearable />
        
            {previews && (
              <Group>
                <Image src={previews} alt="preview" radius="sm" w="auto" h={140} fit="contain" />
                <CloseButton type="button" size="sm" onClick={() => removeImage()}></CloseButton>
              </Group>
            )}

            {/* Privacy Settings */}
            <div>
              <Text size="sm" fw={500} mb={4}>
                Recipe Visibility
              </Text>
              <SegmentedControl
                value={visibility}
                onChange={(value) => setVisibility(value as "public" | "private")}
                data={[
                  { label: "🌍 Public - Everyone can see", value: "public" },
                  { label: "🔒 Private - Followers only", value: "private" },
                ]}
                fullWidth
                color="blue"
              />
              <Text size="xs" c="dimmed" mt={4}>
                {visibility === "public" ? "This recipe will be visible to everyone" : "Only your followers can view this recipe"}
              </Text>
            </div>

            {error && (
              <Alert color="red" variant="filled">
                {error}
              </Alert>
            )}

            <Flex justify="center" gap="xl" align="center">
              <Button type="submit" loading={loading} size="md" onClick={() => setPosting(false)}>
                {loading ? "Loading..." : "Save Draft"}
              </Button>
              <Button type="submit" loading={loading} size="md" onClick={() => setPosting(true)}>
                {loading ? "Loading..." : "Post"}
              </Button>
            </Flex>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
