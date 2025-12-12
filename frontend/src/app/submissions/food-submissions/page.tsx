"use client";

import FoodFormApprovalDisplay from "@/components/food-approval/FoodFormApprovalDisplay";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { is_admin } from "@/services/AdminService";
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

    useEffect(() => {
      const runner = async () => {
        const {success, message, is_admin: isAnAdmin} = await is_admin(user?.id!)
        if (!success || !isAnAdmin) {
          router.push("/login");
        }
      }
      runner()
    }, ["isAdmin"])

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
                <FoodFormApprovalDisplay user_id={user.id}/>      
              </Container>
            </AppShell.Main>
          </AppShell>
        </div>)
}