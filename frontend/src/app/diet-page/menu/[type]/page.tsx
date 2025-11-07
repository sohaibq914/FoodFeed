"use client";
import Menu from "@/components/diet-related/Menu";
import NutritionCard from "@/components/diet-related/NutritionCard";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { NutritionItem, get_all_nutrients } from "@/services/DietService";
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

    const params = useParams<{ type: string }>()

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
                    <Menu user_id={user.id} type={params.type}/>
                </Container>
            </AppShell.Main>
            </AppShell>
        </div>)
}