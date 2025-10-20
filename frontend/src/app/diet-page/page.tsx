"use client";
import MealAverage from "@/components/diet-related/MealAverage";
import MealTemplateList from "@/components/diet-related/MealTemplateList";
import Menu from "@/components/diet-related/Menu";
import NutritionChecklist from "@/components/diet-related/NutritionChecklist";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell, Container, Group, Stack, Title, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DietPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.push("/login");
      }
      window.addEventListener('beforeunload', alertUser)

      return () => {
          window.removeEventListener('beforeunload', alertUser)
      }
    }, [user, loading, router]);

    const alertUser = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    if (!user) return null;

    return (<div style={{ minHeight: '100vh' }}>
          <AppShell
            header={{ height: 70 }}
            padding="md"
          >
            <Header showSettingsButton={true} showBackButton={false} />
            <AppShell.Main>
              <Container size="lg" py="xl">
                <Stack>
                    <Title order={2}>Diet Page</Title>
                    <MealTemplateList user_id={user?.id ?? ''}/>
                    <MealAverage user_id={user?.id ?? ''}/>
                    <NutritionChecklist user_id={user?.id ?? ''}/>
                    <Group justify="space-between" grow wrap="nowrap" preventGrowOverflow={false} align='top'>
                        <Stack>
                            <Title order={3}>Fruits</Title>
                            <Menu user_id={user?.id ?? ''} type={"fruit"} />
                        </Stack>
                        <Stack>
                            <Title order={3}>Vegetables</Title>
                            <Menu user_id={user?.id ?? ''} type={"vegetable"} />
                        </Stack>
                        <Stack>
                            <Title order={3}>Proteins</Title>
                            <Menu user_id={user?.id ?? ''} type={"protein"} />
                        </Stack>
                    </Group>
                </Stack>             
              </Container>
            </AppShell.Main>
          </AppShell>
        </div>)
}