"use client";
import MealAverage from "@/components/diet-related/MealAverage";
import MealTemplateList from "@/components/diet-related/MealTemplateList";
import NutritionCard from "@/components/diet-related/NutritionCard";
import NutritionChecklist from "@/components/diet-related/NutritionChecklist";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { get_all_nutrients, NutritionItem } from "@/services/DietService";
import { AppShell, Container, Stack, Title, Group, Menu, Text } from "@mantine/core";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function NutrientPage() {
    const user_id = useAuth().user?.id
    const params = useParams<{ nutrient: string }>()
    const [item, set_item] = useState(null as NutritionItem|null)
    const [loading, set_loading] = useState(true)
    useEffect(() => { 
        const runner = async () => {
            set_loading(true)
            const {success, message, nutrients} = await get_all_nutrients(user_id!)
            if (success) {
                set_item(nutrients!.filter((value) => { console.log(value); return value.id === params.nutrient })[0])
            }
            else {
                set_item(null)
            }
            set_loading(false)
        }
        runner()
    }, ['nutrition_card'])
    // params
    return (<div style={{ minHeight: '100vh' }}>
            <AppShell
            header={{ height: 70 }}
            padding="md"
            >
            <Header showSettingsButton={true} showBackButton={true} />
            <AppShell.Main>
                <Container size="lg" py="xl">
                {loading || item == null ? <></> : 
                    <NutritionCard user_id={user_id!} item={item!}/> }          
                </Container>
            </AppShell.Main>
            </AppShell>
        </div>)
}