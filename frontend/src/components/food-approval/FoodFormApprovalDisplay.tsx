'use client';
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Text,
  AppShell,
  Stack,
  ActionIcon
} from '@mantine/core';
import { FoodForm, accept_form, reject_form, get_all_pending_forms } from '@/services/DietService'
import { useEffect, useState } from 'react';
import FoodFormDisplay from './FoodFormDisplay';
import { IconCheck, IconTrash } from '@tabler/icons-react';

interface FoodFormApprovalDisplayInfo {
    user_id: string;
}

export default function FoodFormApprovalDisplay({user_id}: FoodFormApprovalDisplayInfo) {
    const [forms, setForms] = useState([] as FoodForm[])
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        const runner = async () => {
            const {success, message, forms: pend_forms} = await get_all_pending_forms();
            if (success) {
                setForms(pend_forms!);
            }
            setLoading(false);
        }
        runner()
    }, ['pending_foods'])

    const accept_food = async (form: FoodForm) => {
        const {success, message} = await accept_form(form.id);
        if (success) {
            setForms(forms.filter((value, index) => {
                return value.id != form.id
            }))
        }
    };

    const reject_food = async (form: FoodForm) => {
        const {success, message} = await reject_form(form.id);
        if (success) {
            setForms(forms.filter((value, index) => {
                return value.id != form.id
            }))
        }
    };

    return <Stack>
        {loading ? <Text>Loading...</Text>:
            forms.map((value, index) => {
                return <Group key={value.id}>
                    <FoodFormDisplay item={value}/>
                    <ActionIcon
                        color="green"
                        size="md"
                        radius="xl"
                        onClick={(e) => accept_food(value)}
                        style={{
                        transition: "all 0.2s ease",
                        }}>
                        <IconCheck/>
                    </ActionIcon>
                    <ActionIcon
                        color="red"
                        size="md"
                        radius="xl"
                        onClick={(e) => reject_food(value)}
                        style={{
                        transition: "all 0.2s ease",
                        }}>
                        <IconTrash/>
                    </ActionIcon>
                </Group>
            })
        }
    </Stack>
}