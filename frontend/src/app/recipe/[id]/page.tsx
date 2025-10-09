"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Container,
  Title,
  Text,
  Loader,
  Center,
  Paper,
  Stack,
  AppShell,
} from "@mantine/core";
import Header from "@/components/Header";

export default function RecipePage() {
  const params = useParams();
  const recipe_id = params.id as string;

  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecipe = async () => {
      try {
        const res = await fetch(`http://localhost:5001/get_recipe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipe_id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch recipe");
        setRecipe(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipe();
  }, [recipe_id]);

  if (loading)
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );

  if (error)
    return (
      <AppShell header={{ height: 70 }} padding="md">
        <Header />
        <AppShell.Main>
          <Container>
            <Text c="red">{error}</Text>
          </Container>
        </AppShell.Main>
      </AppShell>
    );

  if (!recipe) {
    console.log("Recipe is missing:", recipe);
    return (
      <AppShell header={{ height: 70 }} padding="md">
        <Header />
        <AppShell.Main>
          <Container>
            <Text c="dimmed">Recipe not found.</Text>
          </Container>
        </AppShell.Main>
      </AppShell>
    );
  }

  return (
    <AppShell header={{ height: 70 }} padding="md">
      <Header showBackButton={true} showSettingsButton={true} />
      <AppShell.Main>
        <Container size="md" py="xl">
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
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
