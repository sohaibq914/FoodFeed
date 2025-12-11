'use client';

import { Card, Stack, Title, Text, Group, ActionIcon, Button } from "@mantine/core";
import { PlanDisplay, create_meal_plan, delete_meal_plan, get_all_meal_plans } from '@/services/DietService'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@tabler/icons-react";


interface MealPlanListInfo {
    user_id: string
}


export default function MealPlanList({user_id}: MealPlanListInfo) {
    const [displays, setDisplays] = useState([] as PlanDisplay[])
    
    useEffect(() => {
        const runner = async () => {
            const {success, message, plans} = await get_all_meal_plans(user_id)
            if (success) {
                setDisplays(plans!)
            }
        }
        runner()
    }, ['All meal plans'])

    const delete_plan = async (plan_id: string) => {
        const {success, message} = await delete_meal_plan(plan_id)
        if (success) {
            setDisplays(displays.filter((value) => {return value.plan_id != plan_id}))
        }
    }

    const create_plan = async () => {
        const {success, message, plan_id} = await create_meal_plan(user_id)
        if (success) {
            router.push(`/diet-page/menu_plan/${plan_id}`)
        }
    }

    const router = useRouter()

    return <Stack>
        {
            displays.map((item) => {
                return <Group key={item.plan_id}>
                        <Card withBorder
                        radius="md"
                        onClick={(e) => {
                            router.push(`/diet-page/menu_plan/${item.plan_id}`)
                        }}>
                            <Stack>
                                <Title order={4}>{item.name}</Title>
                                <Text>{item.desc}</Text>
                            </Stack>
                        </Card>
                        <ActionIcon
                            color="red"
                            size="md"
                            radius="xl"
                            onClick={(e) => {delete_plan(item.plan_id)}}
                            style={{
                            transition: "all 0.2s ease",
                            }}>
                            <IconTrash/>
                        </ActionIcon>
                    </Group>
            })
        }
        <Button onClick={(e) => {
            create_plan()
        }}>Add New Plan</Button>
    </Stack>
}
