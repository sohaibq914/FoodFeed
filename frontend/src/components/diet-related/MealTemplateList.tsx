'use client';

import { Meal, MealTemplate, add_meal, add_meal_template, delete_meal_template, get_meal_templates, get_user_meals, update_meal_template, delete_meal } from "@/services/DietService";
import { Button, Container, Group, NumberInput, Stack, TextInput, Title, Text } from "@mantine/core";
import { DateInput, DateTimePicker } from "@mantine/dates"
import { create } from "domain";
import { useEffect, useState } from "react";
import MealItem from "./MealItem";
import { Console } from "console";

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
            const {success: mealSuccess, message: mealMessage, meals} = await get_user_meals(user_id)
            if (mealSuccess) {
                set_meals(meals!)
            }
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
        const {success, message, res} = await add_meal(user_id, meal_name, meal_calories, meal_date)
        if (success) {
            set_meals(meals.concat(res!))
            adjust_meal_params('', 0, new Date(Date.now()))
        }
    }

    const remove_meal = async (id: string) => {
        const {success, message} = await delete_meal(id)
        if (success) {
            set_meals(meals.filter((value) => value.id !== id))
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
        const {success, message} = await update_meal_template(user_id, old_names[i], template.name, template.calories);
        if (success) {
            set_old_names(old_names.map((value, index) => {
                if (index == i) {
                    return meal_templates[i].name;
                }
                return value;
            }))
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
        if (success) {
            set_meal_templates(meal_templates.concat(new MealTemplateObject(name, calories)))
            set_old_names(old_names.concat(name))
            set_calories_new_template(0)
            set_new_template_name('')
        }
    }

    const [name_of_new_template, set_new_template_name] = useState('')
    const [calories_of_new_template, set_calories_new_template] = useState(0)
    return (<Container>
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
                        <Title>Meals</Title>
                        {
                            meals.map((value, index) => {
                                return <Group key={index}>
                                    <MealItem meal={value}></MealItem>
                                    <Button onClick={() => {
                                        remove_meal(value.id)
                                    }}>Delete Meal</Button>
                                </Group>
                            })
                        }
                    </Stack>
                }
            </Stack>
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
                        <Title>Templates</Title>
                        {meal_templates.map((value, index) => {
                        return (
                            <Container key={index}>
                                <Group>
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
                                    <Button onClick={(event) => {
                                            update_template(index)
                                        }}>Submit</Button>
                                    <Button onClick={(event) => {
                                            delete_template(index)
                                        }}>Delete</Button>
                                    <Button onClick={(event) => {
                                            set_meal_params(index)
                                        }}>Set</Button>
                                </Group>
                            </Container>
                        )
                    })}
                    </Stack>
                }
            </Stack>
        </Group>
    </Container>)
}