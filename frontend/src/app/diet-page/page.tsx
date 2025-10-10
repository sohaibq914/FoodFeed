"use client";
import MealAverage from "@/components/diet-related/MealAverage";
import MealTemplateList from "@/components/diet-related/MealTemplateList";
import Menu from "@/components/diet-related/Menu";
import NutritionChecklist from "@/components/diet-related/NutritionChecklist";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell, Container, Group, Stack, Title, Text } from "@mantine/core";

export default function DietPage() {
    let user_id = useAuth().user?.id
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
                    <MealTemplateList user_id={user_id!}/>
                    <MealAverage user_id={user_id!}/>
                    <NutritionChecklist user_id={user_id!}/>
                    <Group justify="space-between" grow wrap="nowrap" preventGrowOverflow={false} align='top'>
                        <Stack>
                            <Title order={3}>Fruits</Title>
                            <Menu user_id={user_id!} type={"fruit"} />
                        </Stack>
                        <Stack>
                            <Title order={3}>Vegetables</Title>
                            <Menu user_id={user_id!} type={"vegetable"} />
                        </Stack>
                        <Stack>
                            <Title order={3}>Proteins</Title>
                            <Menu user_id={user_id!} type={"protein"} />
                        </Stack>
                    </Group>
                </Stack>             
              </Container>
            </AppShell.Main>
          </AppShell>
        </div>)
}