"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { 
  Container, 
  Title, 
  Text, 
  Center, 
  Loader,
  AppShell,
  Card,
  Stack
} from '@mantine/core';
import Header from '@/components/Header';
import { IconStar, IconStarFilled } from "@tabler/icons-react";

type RecipeSummary = { recipe_id: string; title: string };


export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipesError, setRecipesError] = useState<string | null>(null);

  // auth redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // fetch all recipe titles
  useEffect(() => {
    if (!user) return; // wait until auth known
    const fetchRecipes = async () => {
      try {
        setRecipesLoading(true);
        setRecipesError(null);
        const res = await fetch(`http://localhost:5001/recipes`, { method: "GET" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to fetch recipes");
        const postedOnly = (data.recipes || []).filter((r: any) => r.posted === true);
        setRecipes(postedOnly);
      } catch (err: any) {
        setRecipesError(err.message || "Failed to fetch recipes");
      } finally {
        setRecipesLoading(false);
      }
    };
    fetchRecipes();
  }, [user]);

  if (loading) {
    return (
      <Container size="lg" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Center style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Loader size="lg" />
            <Text mt="md" c="dimmed">Loading...</Text>
          </div>
        </Center>
      </Container>
    );
  }
  
  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh' }}>
      <AppShell header={{ height: 70 }} padding="md">
        <Header showSettingsButton={true} showBackButton={false} />
        <AppShell.Main>
          <Container size="lg" py="xl">
            <Title order={2}>Welcome to your Dashboard!</Title>
            <Text c="dimmed" mt="md">You are logged in as {user.username}</Text>

            {/* === All Recipes (titles only) === */}
            <Title order={3} mt="xl">All Recipes</Title>
            {recipesLoading && (
              <Center mt="md">
                <Loader />
              </Center>
            )}
            {recipesError && (
              <Text c="red" mt="md">{recipesError}</Text>
            )}
            {!recipesLoading && !recipesError && (
              <Stack mt="md">
                {recipes.length === 0 ? (
                  <Text c="dimmed">No recipes found.</Text>
                ) : (
                  recipes.map((r) => (
                    <Card key={r.recipe_id}
                    withBorder
                    component={Link}
                    href={`/recipe/${r.recipe_id}`}
                    style={{ textDecoration: "none" }}>
                      <Text fw={500}>{r.title || "(untitled)"}</Text>
                    </Card>
                  ))
                )}
              </Stack>
            )}
          </Container>
        </AppShell.Main>
      </AppShell>
    </div>
  );
}
