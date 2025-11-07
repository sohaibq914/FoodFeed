'use client';
import { add_nutrient, get_all_nutrients, NutritionItem, remove_nutrient, update_nutrient } from '@/services/DietService'
import { ActionIcon, Alert, Button, Card, Checkbox, Container, Group, NumberInput, Stack, Text, Title } from '@mantine/core'
import { IconDeviceFloppy } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react'

interface ChecklistInfo {
    user_id: string
}

export default function NutritionChecklist({user_id}: ChecklistInfo) {
    const [loading, set_loading] = useState(true);
    const [items, set_items] = useState([] as NutritionItem[]);
    const [old_item_states, set_old_item_states] = useState([] as boolean[]);
    const [error, set_error] = useState(null as null|string);

    useEffect(() => {
        const runner = async () => {
            set_loading(true);
            const {success, message, nutrients} = await get_all_nutrients(user_id);
            console.log("Found: " + String(success) + ", " + String(message) + ", " + String(nutrients))
            if (success) {
                set_items(nutrients!);
                set_old_item_states(nutrients!.map((nutr) => nutr.is_eaten));
            }
            set_loading(false);
        };
        runner();
    }, ['nutrition']) ;
    
    const update_item = (i: number, amount: number, is_aten_state: boolean) => {
        const res = items.map((item, index) => {
            if (index == i) {
                item.amount = amount;
                item.is_eaten = is_aten_state;
            }
            return item
        });
        set_items(res);
    }

    const submit_item = (i: number) => {
        set_error(null);
        items.forEach(async (item, index) => {
            if (index == i) {
                if (old_item_states[index] && !item.is_eaten) {
                    const {success, message} = await remove_nutrient(item.id, user_id);
                    if (!success) {
                        set_error(message)
                    }
                    item.is_eaten = false;
                }
                else if (item.is_eaten) {
                    if (!old_item_states[index]) {
                        const {success, message} = await add_nutrient(item.id, user_id, item.amount);
                        if (!success) {
                            set_error(message)
                        }
                    }
                    else {
                        const {success, message} = await update_nutrient(item.id, user_id, item.amount);
                        if (!success) {
                            set_error(message)
                        }
                    }
                }
            }
        })
    }

    return (<Container>
        {loading? <Text>Loading Nutrients...</Text>: 
            <Stack>
                <Title>Nutrients</Title>
                {error && (
                    <Alert color="red" variant="filled">
                        {error}
                    </Alert>
                )}
                {items.map((item, index) => {
                    const submit = async () => {
                        submit_item(index)
                    };

                    return (<Card withBorder
                                radius="md" key={item.id}>
                        <form>
                            <Group>
                                <Link 
                                    href={`/diet-page/nutrient/${item.id}`}
                                    style={{ 
                                            textDecoration: 'none',
                                            color: 'inherit'
                                        }}
                                        ><Text>{item.name}</Text>
                                </Link>
                                <Checkbox checked={item.is_eaten}
                                    onChange={(value) => {
                                        update_item(index, item.amount, value.currentTarget.checked)
                                    }}/>
                                <NumberInput label='Amount'
                                    value={item.amount}
                                    onChange={(value) => {
                                        if (typeof value === "number") {
                                            update_item(index, value, item.is_eaten)
                                        }
                                        else {
                                            update_item(index, 0, item.is_eaten)
                                        }
                                    }}
                                    />
                                <ActionIcon
                                    color="green"
                                    size="md"
                                    radius="xl"
                                    onClick={(e) => {submit()}}
                                    style={{
                                    transition: "all 0.2s ease",
                                    }}>
                                    <IconDeviceFloppy/>
                                </ActionIcon>
                            </Group>
                        </form>
                    </Card>);
                })}
            </Stack>
        }
    </Container>);
}