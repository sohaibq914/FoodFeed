"use client";
import Menu from "@/components/diet-related/Menu";
import NutritionCard from "@/components/diet-related/NutritionCard";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { NutritionItem, get_all_nutrients, get_food_of_type, get_recipes_by_ingredient, Recipe } from "@/services/DietService";
import { AppShell, Container, Title, Card, Group, Text, Stack, Button } from "@mantine/core";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function IngredientPage() {
    const { user, loading: loadingUser } = useAuth();
    const params = useParams<{ ingredient: string, type: string }>()
    const [ingredient, setIngredient] = useState(decodeURI(params?.ingredient))
    const [type, setType] = useState(decodeURI(params?.type))
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const router = useRouter();

    useEffect(() =>  {
      const runner = async () => {
        console.log("ingredient")
        const {success, message, recipes} = await get_recipes_by_ingredient(ingredient);
        setRecipes(recipes)
      } 
      runner();
    }, [ingredient]);    

    if (!user) return null;

    // params
    return (<div style={{ minHeight: '100vh' }}>
            <AppShell
            header={{ height: 70 }}
            padding="md"
            >
            <Header showSettingsButton={true} showBackButton={true} />
            <AppShell.Main>
              <Container size="lg" py="xl">
                <Title>Popular recipes featuring {ingredient}</Title>
                <Stack mt ="md">
                  {recipes.length === 0 ? (
                    <Text c="dimmed">No recipes found.</Text>
                  ) : (
                    recipes.map((recipe) => (
                      <Card
                        key={recipe.recipe_id}
                        withBorder
                        p="md"
                        component={Link}
                        href={`/recipe/${recipe.recipe_id}`}
                        style={{ textDecoration: "none", cursor: "pointer" }}
                      >
                      <Group justify="space-between" align="center">
                        <Text fw={500} style={{ flex: 1 }}>
                            {recipe.title || "(untitled)"}
                        </Text>
                        <Group
                        gap="xs"
                        align="center"
                        onClick={(e) => e.preventDefault()}
                        >
                      </Group>
                    </Group>
                    </Card>
                    )) 
                  )}
                  <Button component={Link}
                  href={`/diet-page/menu/${type}`}> Return to {type} </Button>
                </Stack>
              </Container>
            </AppShell.Main>
            </AppShell>
        </div>)
}