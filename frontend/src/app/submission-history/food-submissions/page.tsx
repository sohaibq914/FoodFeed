"use client";
import UserFoodFormDisplay from "@/components/food-approval/UserFoodFormDisplay";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell, Container, Group, Stack, Title, Text, Button } from "@mantine/core";
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
                <UserFoodFormDisplay user_id={user.id} />
              </Container>
            </AppShell.Main>
          </AppShell>
        </div>)
}