"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";
import { 
  Container, 
  Title, 
  Text, 
  Center, 
  Loader,
  AppShell
} from '@mantine/core';
import Header from '@/components/Header';
import RecipeEditor from "@/components/RecipeEditor";



export default function Dashboard() {
  const params = useParams<{ recipe_id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AppShell
        header={{ height: 70 }}
        padding="md"
      > 
        <Header showSettingsButton={true} showBackButton={false} />

        <AppShell.Main>
          <RecipeEditor 
            recipe_id={params.recipe_id}
          />
        </AppShell.Main>
      </AppShell>
    </div>
  );
}