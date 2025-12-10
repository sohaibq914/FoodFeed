'use client';

import '@mantine/dates/styles.css';

import { Meal, get_user_meals, get_user_meals_range } from "@/services/DietService"
import { Button, Checkbox, Container, Group, Stack, Text } from "@mantine/core"
import { BarChart } from "@mantine/charts"
import { useEffect, useState } from "react"
import { DateTimePicker } from "@mantine/dates"
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface MealAverageInfo {
    user_id: string
}

type MealRecord = Record<string, any>

export default function MealAverage({user_id}: MealAverageInfo) {
    const [loading, is_loading] = useState(false)
    const [visible, set_visible] = useState(true)

    const base = []
    for (let i = 0; i < 24; i++) {
        const record: MealRecord = {
            time: `${i}:00`,
            average: 0
        }
        base.push(record)
    }
    const [avgs, set_averages] = useState(base);
    const [start, set_start] = useState(new Date(Date.now()))
    const [end, set_end] = useState(new Date(Date.now()))
    const router = useRouter();

    const get_all_meals = async () => {
        const {success, message, averages} = await get_user_meals(user_id, 0)
        if (success) {
            let date = new Date()
            const records = []
            for (let i = 0; i < 24; i++) {
                const record: MealRecord = {
                    time: `${i}:00`,
                    average: averages![(i + (date.getTimezoneOffset() / 60) + 24) % 24]
                }
                records.push(record)
            }
            set_averages(records)
        }
    }

    const get_meals_within_range = async () => {
        const {success, message, averages} = await get_user_meals_range(user_id, start, end, 0)
        if (success) {
            let date = new Date()
            const records = []
            for (let i = 0; i < 24; i++) {
                const record: MealRecord = {
                    time: `${i}:00`,
                    average: averages![(i + (date.getTimezoneOffset() / 60) + 24) % 24]
                }
                records.push(record)
            }
            set_averages(records)
        }
    }

    useEffect(() => {
        const runner = async () => {
            get_all_meals()
        }
        runner();
    }, ['averages'])

    return (<Container>
        <Stack>
            <Checkbox 
                label='Is Visible:'
                checked={visible}
                onChange={(value) => {
                    set_visible(value.currentTarget.checked)
                }}/>
            { !visible || loading ? <></>:
                <Stack>

                    <Group justify="space-between" grow wrap="nowrap" preventGrowOverflow={false} align='top'>
                        <BarChart 
                            h={300}
                            w={800}
                            data={avgs} 
                            type='default'
                            series={[
                                { name: 'average', color: 'violet.6'}
                            ]} 
                            dataKey='time'
                            xAxisLabel="Time"
                            yAxisLabel="Average Calories Eaten"
                            />
                        <form>
                            <DateTimePicker 
                                label="Start Time:"
                                placeholder="Enter start:"
                                value={start}
                                onChange={(value) => {
                                    if (value == null) {
                                        set_start(new Date(Date.now()))
                                    }
                                    else {
                                        set_start(new Date(value))
                                    }
                                }}></DateTimePicker>
                            <DateTimePicker 
                                label="End Time:"
                                placeholder="Enter end:"
                                value={end}
                                onChange={(value) => {
                                    if (value == null) {
                                        set_end(new Date(Date.now()))
                                    }
                                    else {
                                        set_end(new Date(value))
                                    }
                                }}></DateTimePicker>
                            <Stack>
                                <Button onClick={() => {
                                    get_meals_within_range()
                                }}>Search Within Range</Button>
                                <Button onClick={() => {
                                    get_all_meals();
                                }}>Get Total Average</Button>
                            </Stack>
                        </form>
                    </Group>
                </Stack>}
        </Stack>
    </Container>)
}