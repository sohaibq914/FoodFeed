'use client';
import dayjs from 'dayjs';
import { ActionIcon, Button, Card, Container, Divider, Group, Indicator, NumberInput, Stack, Text, TextInput, Title} from "@mantine/core";
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';
import {Plan, PlanComponent, get_meal_plan, get_days_of_plan, add_component, update_component, delete_component, mark_day, get_all_food_of_type, get_nutrients_to_foods, FoodItem, get_all_nutrients, NutritionItem, set_meal_name, set_meal_desc} from '@/services/DietService'
import { useEffect, useState } from "react";
import { Calendar } from "@mantine/dates";
import { PieChart, PieChartCell } from '@mantine/charts';
import NutritionCard from '../diet-related/NutritionCard';
import { IconDeviceFloppy, IconHeartFilled, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';

interface MealPlannerInfo {
    user_id: string
    plan_id: string
}

class SamplePlan implements Plan {
    name: string = '';
    desc: string = '';
    plan_id: string = '';
    components: PlanComponent[] = [];
}

class PlanComponentInstance implements PlanComponent {
    id: string;
    food_id: string;
    amount: number;
    
    constructor(id: string, food_id: string, amount: number) {
        this.id = id
        this.food_id = food_id
        this.amount = amount
    }
}

export default function MealPlanner ({user_id, plan_id}: MealPlannerInfo) {
    const [mealPlan, setMealPlan] = useState(new SamplePlan() as Plan)
    const [nutrToFoods, setNutrToFoods] = useState(new Map<String, Set<String>>())
    const [nutrients, setNutrients] = useState([] as NutritionItem[])
    const [fruits, setFruits] = useState([] as FoodItem[])
    const [vegetables, setVegetables] = useState([] as FoodItem[])
    const [proteins, setProteins] = useState([] as FoodItem[])
    const [dairy, setDairy] = useState([] as FoodItem[])
    const [idToItem, setIdToItem] = useState(new Map<String, FoodItem>())
    const [idToTypes, setIdToTypes] = useState(new Map<String, String>());

    const [selected, setSelected] = useState(new Set<String>())
    const [components, setComponents] = useState([] as PlanComponent[])
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState([] as Date[])

    const [mealName, setMealName] = useState('')
    const [mealDesc, setMealDesc] = useState('')

    const [fQuery, setFQuery] = useState('')
    const [vQuery, setVQuery] = useState('')
    const [pQuery, setPQuery] = useState('')
    const [dQuery, setDQuery] = useState('')

    useEffect(() => {
        const runner = async() => {
            const {success, message, plan} = await get_meal_plan(user_id, plan_id)
            if (success) {
                setMealPlan(plan!);
                setMealName(plan?.name!)
                setMealDesc(plan?.desc!)
                setComponents(plan!.components)
                let selectedIds = new Set<String>()
                plan!.components.forEach((value) => {
                    selectedIds.add(value.food_id)
                })
                setSelected(selectedIds)
                const {success: daySuccess, message: dayMessage, days} = await get_days_of_plan(user_id, plan_id)
                console.log(days)
                if (daySuccess) {
                    setDays(days!)
                }
            }
            const {success: nutrSuccess, message: nutrMessage, nutrs_to_foods} = await get_nutrients_to_foods()
            if (nutrSuccess) {
                setNutrToFoods(nutrs_to_foods!)
            }
            const tempIdToTypes = new Map<String, String>();

            const {success: getNutrSuccess, nutrients} = await get_all_nutrients(user_id)
            if (getNutrSuccess) {
                setNutrients(nutrients!)
            }

            let idItemMap = new Map<String, FoodItem>();
            const {success: fSuccess, foods: fFoods} = await get_all_food_of_type(user_id, 'fruit', '')
            if (fSuccess) {
                setFruits(fFoods!)
                fFoods!.forEach((value) => {
                    tempIdToTypes.set(value.id, 'fruit')
                    idItemMap.set(value.id, value)
                })
            }
            const {success: vSuccess, foods: vFoods} = await get_all_food_of_type(user_id, 'vegetable', '')
            if (vSuccess) {
                setVegetables(vFoods!)
                vFoods!.forEach((value) => {
                    tempIdToTypes.set(value.id, 'vegetable')
                    idItemMap.set(value.id, value)
                })
            }
            const {success: pSuccess, foods: pFoods} = await get_all_food_of_type(user_id, 'protein', '')
            if (pSuccess) {
                setProteins(pFoods!)
                pFoods!.forEach((value) => {
                    tempIdToTypes.set(value.id, 'protein')
                    idItemMap.set(value.id, value)
                })
            }
            const {success: dSuccess, foods: dFoods} = await get_all_food_of_type(user_id, 'dairy', '')
            if (dSuccess) {
                setDairy(dFoods!)
                dFoods!.forEach((value) => {
                    tempIdToTypes.set(value.id, 'dairy')
                    idItemMap.set(value.id, value)
                })
            }
            setIdToTypes(tempIdToTypes)
            setIdToItem(idItemMap)
            setLoading(false)
        }
        runner()
    }, ['meal_plan']);

    const add_new_component = async (food_id: string, amount: number) => {
        const {success, message, id} = await add_component(plan_id, food_id, amount)
        if (success) {
            let copiedComponents = components.map((value) => value);
            copiedComponents.push(new PlanComponentInstance(id!, food_id, amount))
            setComponents(copiedComponents)
            let newItem = new Set<String>();
            newItem.add(food_id)
            setSelected(selected.union(newItem))
        }
    }

    const update_meal_name = async () => {
        const {success, message} = await set_meal_name(user_id, plan_id, mealName)
    }

    const update_meal_desc = async () => {
        const {success, message} = await set_meal_desc(user_id, plan_id, mealDesc)
    }

    const adjust_value = (comp_id: string, amount: number) => {
        setComponents(components.map((value) => {
            if (value.id === comp_id) {
                value.amount = amount;
            }
            return value;
        }))
    }

    const update_a_component = async (comp_id: string) => {
        const {success, message} = await update_component(comp_id, 
            components.filter((value) => value.id === comp_id)[0].amount)
        if (success) {
            // Do something
        }
    }

    const delete_a_component = async (comp_id: string) => {
        const {success, message} = await delete_component(comp_id)
        if (success) {
            let food_id = ''
            console.log(components.filter((value) => {
                if (value.id === comp_id) {
                    food_id = value.food_id
                }
                return value.id !== comp_id;
            }))
            setComponents(components.filter((value) => {
                if (value.id === comp_id) {
                    food_id = value.food_id
                }
                return value.id !== comp_id;
            }))
            let oldItem = new Set<String>();
            oldItem.add(food_id)
            setSelected(selected.difference(oldItem))
        }
    }

    const mark_a_day = async (day: Date) => {
        const {success, message} = await mark_day(user_id, plan_id, day)
        if (success) {
            let copiedDays = days.map((value) => value)
            copiedDays.push(day)
            setDays(copiedDays)
        }
    }

    function get_data(): PieChartCell[] {
        let sums = new Map<String, number>()
        sums.set('fruit', 0)
        sums.set('vegetable', 0)
        sums.set('protein', 0)
        sums.set('dairy', 0)
        components.forEach((value) => {
            let type = idToTypes.get(value.food_id)!
            sums.set(type, sums.get(type)! + value.amount)
        })
        return [
            {name: 'fruit', value: sums.get('fruit')!, color: 'red'},
            {name: 'vegetable', value: sums.get('vegetable')!, color: 'green'},
            {name: 'protein', value: sums.get('protein')!, color: 'violet'},
            {name: 'dairy', value: sums.get('dairy')!, color: 'blue'},
        ]
    }

    return <Stack>
        {loading? <Text>Loading...</Text>:
            <Container>
                {/* Name and desc */}
                <Group>                
                    <Stack>
                        <TextInput
                            label="Name"
                            placeholder="Add your own name!"
                            value={mealName}
                            onChange={(e) => {setMealName(e.currentTarget.value)}}
                            />
                        <TextInput
                            label="Description"
                            placeholder="Add your own description!"
                            value={mealDesc}
                            onChange={(e) => {setMealDesc(e.currentTarget.value)}}
                            />
                    </Stack>
                    <ActionIcon
                        color="green"
                        size="md"
                        radius="xl"
                        onClick={(e) => {
                            update_meal_name()
                            update_meal_desc()
                        }}
                        style={{
                        transition: "all 0.2s ease",
                        }}>
                        <IconDeviceFloppy/>
                    </ActionIcon>
                </Group>
                {/* Calendar View */}
                <Group>
                    <Calendar
                        static
                        renderDay={(date) => {
                            const convDate = new Date(date);
                            const day = dayjs(date).date()
                            let wasCompleted = false
                            console.log(nutrToFoods)
                            days.forEach((value) => {
                                if (wasCompleted || (value.getDate() == day
                                    && value.getMonth() == convDate.getMonth()
                                    && value.getFullYear() == convDate.getFullYear())) {
                                    wasCompleted = true
                                }
                            })
                            return (
                            <Indicator color="green" offset={-2} disabled={!wasCompleted}>
                                <div>{day}</div>
                            </Indicator>
                            );
                        }}
                        />
                    <Button onClick={(event) => {mark_a_day(new Date(Date.now()))}}>
                        Mark Day
                    </Button>
                </Group>
                <Divider my={'md'}/>
                {/* Selected Food */}
                <Group>
                    <Stack>
                        {components.map((value, index) => {
                            let item = idToItem.get(value.food_id)!
                            return <Card key={value.id}>
                                <Group>
                                    <Stack>
                                        <Title order={3}>{item.name}</Title>
                                        <Title order={4}>{idToTypes.get(item.id)!}</Title>
                                    </Stack>
                                    <NumberInput label='Amount' min={0} value={value.amount}
                                        onChange={(e) => {
                                            if (typeof e === 'string') {
                                                adjust_value(value.id, 0)
                                            }
                                            else {
                                                adjust_value(value.id, e.valueOf() as number)
                                            }
                                        }}></NumberInput>
                                    <ActionIcon
                                        color="green"
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => {update_a_component(value.id)}}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}>
                                        <IconDeviceFloppy/>
                                    </ActionIcon>
                                    <ActionIcon
                                        color="red"
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => {delete_a_component(value.id)}}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}>
                                        <IconTrash/>
                                    </ActionIcon>
                                </Group>
                            </Card>
                        })}
                    </Stack>
                </Group>
                <Divider my={'md'}/>
                {/* Nutrients and Charts */}
                <Group>
                    <Stack flex={1}>
                        <Title order={2}>Nutrients Added:</Title>
                        {
                            nutrients.filter(
                                (value) => {
                                    let elligibleFoods = nutrToFoods.get(value.id)
                                    if (elligibleFoods == null) {
                                        return false
                                    }
                                    let hasAtLeastOne = false
                                    components.forEach((value) => {
                                        if (elligibleFoods.has(value.food_id)) {
                                            hasAtLeastOne = true
                                        }
                                    })
                                    return hasAtLeastOne
                                }
                            ).map((value) => {
                                return <Group key={value.id}>
                                    <Text>{value.name}</Text>
                                </Group>
                            })
                        }
                    </Stack>
                    <PieChart flex={2} withLabelsLine labelsPosition="outside" labelsType="value" withLabels data={get_data()} withTooltip/>
                </Group>
                <Divider my={'md'}/>
                {/* Food Items */}
                <Group justify='space-between' align='top'>
                    {/* Fruit */}
                    <Stack>
                        <Group align="end" mb="xs" wrap="wrap">
                            <TextInput
                                w={30}
                                label="Fruits"
                                placeholder="Name"
                                value={fQuery}
                                onChange={(e) => setFQuery(e.currentTarget.value)}
                                style={{ flex: 1, minWidth: 120 }}
                            />
                            <Button type="button" disabled leftSection={<IconSearch size={16} /> as React.ReactNode}>
                            </Button>
                        </Group>
                        {
                            fruits.filter((value) => {
                                return value.name.toLowerCase().includes(fQuery.toLowerCase()) 
                                    && !selected.has(value.id)
                            })
                                .sort((a, b) => {
                                    if (a.favorite) {
                                        return -1
                                    }
                                    else if (b.favorite) {
                                        return 1
                                    }
                                    return 0
                                })
                                .map((value, index) => {
                                return <Card withBorder key={value.id}><Group>
                                    <Stack>
                                        <Title order={3}>{value.name}</Title>
                                        <Title order={4}>{idToTypes.get(value.id)!}</Title>
                                    </Stack>
                                    {value.favorite && <IconHeartFilled color='red'/>}
                                    <ActionIcon
                                        color="green"
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => {add_new_component(value.id, 0)}}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}>
                                        <IconPlus/>
                                    </ActionIcon>
                                </Group></Card>
                            })
                        }
                    </Stack>
                    {/* Vegetable */}
                    <Stack>
                        <Group align="end" mb="xs" wrap="wrap">
                            <TextInput
                                w={30}
                                label="Vegetables"
                                placeholder="Name"
                                value={vQuery}
                                onChange={(e) => setVQuery(e.currentTarget.value)}
                                style={{ flex: 1, minWidth: 120 }}
                            />
                            <Button type="button" disabled leftSection={<IconSearch size={16} /> as React.ReactNode}>
                            </Button>
                        </Group>
                        {
                            vegetables.filter((value) => {
                                return value.name.toLowerCase().includes(vQuery.toLowerCase()) 
                                    && !selected.has(value.id)
                            })
                                .sort((a, b) => {
                                    if (a.favorite) {
                                        return -1
                                    }
                                    else if (b.favorite) {
                                        return 1
                                    }
                                    return 0
                                })
                                .map((value, index) => {
                                return <Card withBorder key={value.id}><Group>
                                    <Stack>
                                        <Title order={3}>{value.name}</Title>
                                        <Title order={4}>{idToTypes.get(value.id)!}</Title>
                                    </Stack>
                                    {value.favorite && <IconHeartFilled color='red'/>}
                                    <ActionIcon
                                        color="green"
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => {add_new_component(value.id, 0)}}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}>
                                        <IconPlus/>
                                    </ActionIcon>
                                </Group></Card>
                            })
                        }
                    </Stack>
                    {/* Protein */}
                    <Stack>
                        <Group align="end" mb="xs" wrap="wrap">
                            <TextInput
                                w={30}
                                label="Proteins"
                                placeholder="Name"
                                value={pQuery}
                                onChange={(e) => setPQuery(e.currentTarget.value)}
                                style={{ flex: 1, minWidth: 120 }}
                            />
                            <Button type="button" disabled leftSection={<IconSearch size={16} /> as React.ReactNode}>
                            </Button>
                        </Group>
                        {
                            proteins.filter((value) => {
                                return value.name.toLowerCase().includes(pQuery.toLowerCase()) 
                                    && !selected.has(value.id)
                            })
                                .sort((a, b) => {
                                    if (a.favorite) {
                                        return -1
                                    }
                                    else if (b.favorite) {
                                        return 1
                                    }
                                    return 0
                                })
                                .map((value, index) => {
                                return <Card withBorder key={value.id}><Group>
                                    <Stack>
                                        <Title order={3}>{value.name}</Title>
                                        <Title order={4}>{idToTypes.get(value.id)!}</Title>
                                    </Stack>
                                    {value.favorite && <IconHeartFilled color='red'/>}
                                    <ActionIcon
                                        color="green"
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => {add_new_component(value.id, 0)}}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}>
                                        <IconPlus/>
                                    </ActionIcon>
                                </Group></Card>
                            })
                        }
                    </Stack>
                    {/* Dairy */}
                    <Stack>
                        <Group align="end" mb="xs" wrap="wrap">
                            <TextInput
                                w={30}
                                label="Dairy"
                                placeholder="Name"
                                value={dQuery}
                                onChange={(e) => setDQuery(e.currentTarget.value)}
                                style={{ flex: 1, minWidth: 120 }}
                            />
                            <Button type="button" disabled leftSection={<IconSearch size={16} /> as React.ReactNode}>
                            </Button>
                        </Group>
                        {
                            dairy.filter((value) => {
                                return value.name.toLowerCase().includes(dQuery.toLowerCase()) 
                                    && !selected.has(value.id)
                            })
                                .sort((a, b) => {
                                    if (a.favorite) {
                                        return -1
                                    }
                                    else if (b.favorite) {
                                        return 1
                                    }
                                    return 0
                                })
                                .map((value, index) => {
                                return <Card withBorder key={value.id}><Group>
                                    <Stack>
                                        <Title order={3}>{value.name}</Title>
                                        <Title order={4}>{idToTypes.get(value.id)!}</Title>
                                    </Stack>
                                    {value.favorite && <IconHeartFilled color='red'/>}
                                    <ActionIcon
                                        color="green"
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => {add_new_component(value.id, 0)}}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}>
                                        <IconPlus/>
                                    </ActionIcon>
                                </Group></Card>
                            })
                        }
                    </Stack>
                </Group>
            </Container>}
    </Stack>
}