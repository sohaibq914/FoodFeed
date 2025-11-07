"use client";
import Menu from "@/components/diet-related/Menu";
import NutritionCard from "@/components/diet-related/NutritionCard";
import Header from "@/components/Header";
import MealPlanner from "@/components/meal-plan/MealPlanner";
import { useAuth } from "@/contexts/AuthContext";
import { NutritionItem, get_all_nutrients, get_meal_plan } from "@/services/DietService";
import { AppShell, Container } from "@mantine/core";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function NutrientPage() {
    const { user, loading: loadingUser } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loadingUser && !user) {
        router.push("/login");
      }
      window.addEventListener('beforeunload', alertUser)

      return () => {
          window.removeEventListener('beforeunload', alertUser)
      }
    }, [user, loadingUser, router]);    
    
    const alertUser = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    const params = useParams<{ plan_id: string }>()
    const [isUserPlan, setIsUserPlan] = useState(true)

    if (!user) return null;

    useEffect(() => {
      const runner = async () => {
        const {success, plan} = await get_meal_plan(user.id)
        if (success) {
          console.log("Found plan id: " + plan?.plan_id)
          setIsUserPlan(plan!.plan_id === params.plan_id)
        }
      }
    }, ['plan']);    
    
    // params
    return (<div style={{ minHeight: '100vh' }}>
            <AppShell
            header={{ height: 70 }}
            padding="md"
            >
            <Header showSettingsButton={true} showBackButton={true} />
            <AppShell.Main>
                <Container size="lg" py="xl">
                  {!isUserPlan ? <></>:
                    <MealPlanner user_id={user.id} plan_id={params.plan_id}/>}
                </Container>
            </AppShell.Main>
            </AppShell>
        </div>)
}