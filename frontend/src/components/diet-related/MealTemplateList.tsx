'use client';

import '@mantine/dates/styles.css';

import { Meal, MealTemplate, add_meal, add_meal_template, delete_meal_template, get_meal_templates, get_user_meals, update_meal_template, delete_meal } from "@/services/DietService";
import { Button, Container, Group, NumberInput, Stack, TextInput, Title, Text, Divider, Alert, Card, ScrollArea, ActionIcon } from "@mantine/core";
import { DateInput, DateTimePicker } from "@mantine/dates"
import { create } from "domain";
import { useEffect, useState } from "react";
import MealItem from "./MealItem";
import { Console } from "console";
import { IconDeviceFloppy, IconLoader, IconTrash } from "@tabler/icons-react";

interface MealTemplateInfo {
    user_id: string
}

class MealTemplateObject implements MealTemplate {
    name: string;
    calories: number;
    
    public constructor(name: string, calories: number) {
        this.name = name;
        this.calories = calories;
    }
}

export default function MealTemplateList({user_id}: MealTemplateInfo) {
    const [meal_templates, set_meal_templates] = useState([] as MealTemplate[]);
    const [meals, set_meals] = useState([] as Meal[])
    const [old_names, set_old_names] = useState([] as string[])
    const [loading, set_loading] = useState(true);
    const [error, set_error] = useState(null as null|string)
    const [meals_loaded, set_meals_loaded] = useState(0)
    
    const load_more_meals = async (currently_loaded: number) => {
        const {success: mealSuccess, message: mealMessage, meals: cur_meal_set} = await get_user_meals(user_id, meals_loaded)
        if (mealSuccess) {
            const len = currently_loaded + cur_meal_set?.length!
            if (currently_loaded == 0) {
                set_meals(cur_meal_set!)
            }
            else {
                set_meals(meals.concat(cur_meal_set!))
            }
            set_meals_loaded(len)
        }
    }
    
    useEffect(() => {
        const runner = async () => {
            set_loading(true)
            const {success: templateSuccess, message: templateMessage, templates} = await get_meal_templates(user_id)
            if (templateSuccess) {
                set_meal_templates(templates!);
                set_old_names(
                    templates!.map((value) => {
                        return value.name
                    })
                )
            }
            await load_more_meals(0)
            set_loading(false)
        }
        runner()
    }, ['templates'])

    // Meals

    const [meal_name, set_meal_name] = useState('')
    const [meal_calories, set_meal_calories] = useState(0)
    const [meal_date, set_meal_date] = useState(new Date(Date.now()))
    const set_meal_params = (i: number) => {
        const template = meal_templates[i]
        set_meal_name(template.name)
        set_meal_calories(template.calories)
    }

    const adjust_meal_params = (name: string, calories: number, date: Date) => {
        set_meal_name(name)
        set_meal_calories(calories)
        set_meal_date(date)
    }

    const create_meal = async () => {
        set_error(null)
        if (meal_name === '') {
            set_error('Cannot have a blank name.')
            return
        }
        const {success, message, res} = await add_meal(user_id, meal_name, meal_calories, meal_date)
        if (success) {
            set_meals(meals.concat(res!))
            adjust_meal_params('', 0, new Date(Date.now()))
        }
        else {
            set_error(message)
        }
    }

    const remove_meal = async (id: string) => {
        set_error(null)
        const {success, message} = await delete_meal(id)
        if (success) {
            set_meals(meals.filter((value) => value.id !== id))
        }
        else {
            set_error(null)
        }
    }

    // Templates
    const set_template = (i: number, name: string, calories: number) => {
        set_meal_templates(
            meal_templates.map(
                (value, index) => {
                    if (i == index) {
                        value.name = name;
                        value.calories = calories;
                    }
                    return value;
                }
            )
        )
    }

    const update_template = async (i: number) => {
        const template = meal_templates[i]
        set_error(null)
        if (template.name === '') {
            set_error("Cannot have a blank name.")
            return
        }
        const {success, message} = await update_meal_template(user_id, old_names[i], template.name, template.calories);
        if (success) {
            set_old_names(old_names.map((value, index) => {
                if (index == i) {
                    return meal_templates[i].name;
                }
                return value;
            }))
        } else {
            set_error(message)
        }
    }

    const delete_template = (i: number) => {
        const template = meal_templates[i]
        delete_meal_template(user_id, template.name)
        set_meal_templates(meal_templates.filter((value, index) => {return index != i}))
        set_old_names(old_names.filter((value, index) => {return index != i}))
    }

    const add_template = async (name: string, calories: number) => {
        const {success, message} = await add_meal_template(user_id, name, calories);
        set_error(null)
        if (success) {
            set_meal_templates(meal_templates.concat(new MealTemplateObject(name, calories)))
            set_old_names(old_names.concat(name))
            set_calories_new_template(0)
            set_new_template_name('')
        } else {
            set_error(message)
        }
    }

    const [name_of_new_template, set_new_template_name] = useState('')
    const [calories_of_new_template, set_calories_new_template] = useState(0)
    return (<Container>
        {error && (
            <Alert color="red" variant="filled">
                {error}
            </Alert>
        )}
        <Group justify="space-between" grow wrap="nowrap" preventGrowOverflow={false} align='top'>
            {/* Meals */}
            <Stack>
                {loading ? <>Loading meals...</>:
                    <Stack>
                        <Title>Add Meal</Title>
                        <form>
                            <TextInput
                                    label='New Name:'
                                    placeholder='Enter name:'
                                    value={meal_name}
                                    onChange={(new_name) => {
                                        set_meal_name(new_name.currentTarget.value);
                                    }}
                                    />
                            <NumberInput
                                label='Calories:'
                                placeholder='Enter calories:'
                                value={meal_calories}
                                onChange={(num) => {
                                    if (typeof num === 'number') {
                                        set_meal_calories(num)
                                    }
                                    else {
                                        set_meal_calories(0)
                                    }
                                }}/>
                            <DateTimePicker 
                                label="Time Aten:"
                                placeholder="Enter time:"
                                value={meal_date}
                                onChange={(value) => {
                                    if (value == null) {
                                        set_meal_date(new Date(Date.now()))
                                    }
                                    else {
                                        set_meal_date(new Date(value))
                                    }
                                }}></DateTimePicker>
                            <Button onClick={() => {
                                create_meal()
                            }}>Add New Meal</Button>
                        </form>
                        <Divider/>
                        <Title>Meals</Title>
                        <ScrollArea h={300}>
                        {
                            meals.map((value, index) => {
                                return <Container key={value.id}>
                                    <Group>
                                        <MealItem meal={value}></MealItem>
                                        <ActionIcon
                                            color="red"
                                            size="md"
                                            radius="xl"
                                            onClick={(e) => {remove_meal(value.id)}}
                                            style={{
                                            transition: "all 0.2s ease",
                                            }}>
                                            <IconTrash/>
                                        </ActionIcon>
                                    </Group>
                                    <Divider/>
                                </Container>
                            })
                        }
                        <ActionIcon
                            color="blue"
                            size="md"
                            radius="xl"
                            onClick={(e) => {load_more_meals(meals_loaded)}}
                            style={{
                            transition: "all 0.2s ease",
                            }}>
                            <IconLoader/>
                        </ActionIcon>
                        </ScrollArea>
                    </Stack>
                }
            </Stack>
            <Divider orientation="vertical"/>
            {/* Templates */}
            <Stack>
                {loading ? <></>: 
                    <Stack>
                        <Title>Add Template</Title>
                        <form>
                            <Group>
                                <TextInput
                                    label='New Name:'
                                    placeholder='Enter name:'
                                    value={name_of_new_template}
                                    onChange={(new_name) => {
                                        set_new_template_name(new_name.currentTarget.value);
                                    }}
                                    />
                                <NumberInput
                                    label='Calories:'
                                    placeholder='Enter calories:'
                                    value={calories_of_new_template}
                                    onChange={(num) => {
                                        if (typeof num === 'number') {
                                            set_calories_new_template(num)
                                        }
                                        else {
                                            set_calories_new_template(0)
                                        }
                                    }}/>
                                <Button onClick={
                                    () => {
                                        add_template(name_of_new_template, calories_of_new_template)
                                    }
                                }>Add New Template</Button>
                            </Group>
                        </form>
                        <Divider/>
                        <Title>Templates</Title>
                        <ScrollArea h={400}>
                        {meal_templates.map((value, index) => {
                        return (
                            <Card withBorder
                                radius="md"
                                p="md" key={index}>
                                <Group justify="space-between" grow>
                                    <Stack>
                                        <TextInput
                                            label='Name:'
                                            placeholder='Enter name'
                                            value={value.name}
                                            onChange={(new_name) => {
                                                set_template(index, new_name.currentTarget.value, value.calories)
                                            }}
                                            />
                                        <NumberInput
                                            label='Calories:'
                                            placeholder='Enter calories'
                                            value={value.calories}
                                            onChange={(num) => {
                                                if (typeof num === 'number') {
                                                    set_template(index, value.name, num)
                                                }
                                                else {
                                                    set_template(index, value.name, 0)
                                                }
                                            }}
                                            />
                                    </Stack>
                                    <ActionIcon
                                        color="green"
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => {update_template(index)}}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}>
                                        <IconDeviceFloppy/>
                                    </ActionIcon>
                                    <ActionIcon
                                        color="red"
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => {delete_template(index)}}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}>
                                        <IconTrash/>
                                    </ActionIcon>
                                    <ActionIcon
                                        color="blue"
                                        size="md"
                                        radius="xl"
                                        onClick={(e) => {set_meal_params(index)}}
                                        style={{
                                        transition: "all 0.2s ease",
                                        }}>
                                        <IconLoader/>
                                    </ActionIcon>
                                </Group>
                            </Card>
                        )
                    })}
                    </ScrollArea>
                    </Stack>
                }
            </Stack>
        </Group>
    </Container>)
}