'use client';
import { ActionIcon, Button, Container, Fieldset, Group, NativeSelect, NumberInput, Stack, Text, TextInput, Title} from "@mantine/core";
import {get_calorie_intake, calculate_calorie_intake} from '@/services/DietService'
import { useEffect, useState } from "react";

interface CalorieCalculatorInfo {
    user_id: string;
}

export default function CalorieCalculator({user_id}: CalorieCalculatorInfo) {
    const [calorie_intake, set_calorie_intake] = useState(0)
    const [loading, set_loading] = useState(true)
    const [has_calculated_intake, set_has_calculated] = useState(false) 
    
    useEffect(() => {
        const runner = async () => {
            const {success, message, intake} = await get_calorie_intake(user_id)
            if (success) {
                set_calorie_intake(intake!)
                set_has_calculated(true)
            }
            set_loading(false)
        }
        runner()
    }, ['calorie_calculator'])

    const [sex, setSex] = useState('')
    const [weight, setWeight] = useState(0)
    const [height, setHeight] = useState(0)
    const [age, setAge] = useState(0)
    const [activity, setActivity] = useState('None')

    const perform_calculations = async () => {
        let a_level = 0
        switch (activity) {
            case 'None':
                a_level = 0
                break;
            case 'Some':
                a_level = 1
                break;
            case 'Average':
                a_level = 2
                break;
            case 'Above Average':
                a_level = 3
                break;
            case 'High':
                a_level = 4
                break;
        }
        const {success, message, intake} = await calculate_calorie_intake(user_id, sex.toLowerCase(), weight, height, age, a_level)
        if (success) {
            set_has_calculated(true)
            set_calorie_intake(intake!)
        }
    }
    return <Group>
        {loading? <Text>Loading... </Text>:
            has_calculated_intake? <Title>Calorie Intake: {calorie_intake}</Title>:
                <Fieldset>
                    <Title>Calculate Calories:</Title>
                    <NativeSelect label='Sex' data={['None','M','F']}
                        value={sex} onChange={(event)=>{setSex(event.currentTarget.value)}}></NativeSelect>
                    <NumberInput label='Weight (lb.)'
                        min={0} value={weight} onChange={(event)=>{
                            if (typeof event.valueOf() === 'string') {
                                setWeight(0)
                            }
                            else {
                                setWeight(event as number)
                            }
                        }}></NumberInput>
                    <NumberInput label='Height (ft.)'
                        min={0} value={height} onChange={(event)=>{
                            if (typeof event.valueOf() === 'string') {
                                setHeight(0)
                            }
                            else {
                                setHeight(event as number)
                            }
                        }}></NumberInput>
                    <NumberInput label='Age (yrs)'
                        min={0} value={age} onChange={(event)=>{
                            if (typeof event.valueOf() === 'string') {
                                setAge(0)
                            }
                            else {
                                setAge(event as number)
                            }
                        }}></NumberInput>
                    <NativeSelect label='Exercise Level' data={['None','Some','Average','Above Average', 'High']}
                        value={activity} onChange={(event)=>{setActivity(event.currentTarget.value)}}></NativeSelect>
                    <Button onClick={(e) => {perform_calculations()}}>Submit</Button>
                </Fieldset>
        }
    </Group>
}