"use client";
import CalorieCalculator from "@/components/diet-related/CalorieCalculator";
import MealAverage from "@/components/diet-related/MealAverage";
import MealTemplateList from "@/components/diet-related/MealTemplateList";
import Menu from "@/components/diet-related/Menu";
import NutritionChecklist from "@/components/diet-related/NutritionChecklist";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { create_meal_plan, get_meal_plan, Plan } from "@/services/DietService";
import { AppShell, Container, Group, Stack, Title, Text, Button, Divider } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DietPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    if (!user) return null;

    useEffect(() => {
      if (!loading && !user) {
        router.push("/login");
      }
      window.addEventListener('beforeunload', alertUser)

      return () => {
          window.removeEventListener('beforeunload', alertUser)
      }
    }, [user, loading, router]);

    const [plan, setPlan] = useState(null as null|Plan)
    useEffect(() => {
      const runner = async () => {
        const {success, plan} = await get_meal_plan(user.id)
        setPlan(plan)
      }
      runner()
    }, ['plan'])
    const alertUser = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    return (<div style={{ minHeight: '100vh' }}>
          <AppShell
            header={{ height: 70 }}
            padding="md"
          >
            <Header showSettingsButton={true} showBackButton={false} />
            <AppShell.Main>
              <Container size="lg" py="xl">
                <Stack>
                    <Title order={1}>Diet Page</Title>
                    <MealTemplateList user_id={user?.id ?? ''}/>
                    <Divider my="md"/>
                    <MealAverage user_id={user?.id ?? ''}/>
                    <Divider my="md"/>
                    <NutritionChecklist user_id={user?.id ?? ''}/>
                    <Divider my="md"/>
                    <CalorieCalculator user_id={user?.id}/>
                    <Divider my="md"/>
                    <Group justify="space-between" grow wrap="nowrap" preventGrowOverflow={false} align='top'>
                      <Button
                        onClick={(e) => {
                          router.push('/diet-page/menu/fruit')
                        }}>Fruits</Button>
                      <Button
                        onClick={(e) => {
                          router.push('/diet-page/menu/vegetable')
                        }}>Vegetables</Button>
                      <Button
                        onClick={(e) => {
                          router.push('/diet-page/menu/protein')
                        }}>Proteins</Button>

                      <Button
                        onClick={(e) => {
                          router.push('/diet-page/menu/dairy')
                        }}>Dairy</Button>
                    </Group>
                    <Divider my="md"/>
                    <Button onClick={(e) => {
                      const runner = async() => {
                        let current_plan_id = plan?.plan_id
                        if (!plan) {
                          const {success, plan_id} = await create_meal_plan(user.id)
                          if (!success) {
                            return
                          }
                          current_plan_id = plan_id!
                        }
                        console.log("New version")
                        console.log(current_plan_id)
                        router.push(`/diet-page/menu_plan/${current_plan_id}`)
                      }
                      runner()
                    }}>
                      {plan? 'Update Plan': 'Create Plan'}
                    </Button>
                </Stack>             
              </Container>
            </AppShell.Main>
          </AppShell>
        </div>)
}