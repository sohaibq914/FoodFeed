'use client';

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
    user_id = useAuth().user!.id
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
        const {success, message, averages} = await get_user_meals(user_id)
        if (success) {
            console.log("Averages: " + averages)
            const records = averages!.map((value, index) => {
                const record: MealRecord = {
                    time: `${index}:00`,
                    average: value
                }
                console.log("Given record: " + record.average + ", " + record.time)
                return record
            })
            console.log(String(records) + ", " + records.length) 
            console.log("Given records: " + records.forEach((value, index) => {
                console.log("{" + value.time + ", " + value.average + "}")
            }))
            set_averages(records)
        }
    }

    const get_meals_within_range = async () => {
        const {success, message, averages} = await get_user_meals_range(user_id, start, end)
        if (success) {
            console.log("Given averages: ")
            console.log(averages)
            const records = averages!.map((value, index) => {
                const record: MealRecord = {
                    time: `${index}:00`,
                    average: value
                }
                return record
            })
            set_averages(records)
            console.log("Given records: " + String(records))
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
                            w={500}
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
                            <Button onClick={() => {
                                get_meals_within_range()
                            }}>Search Within Range</Button>
                        </form>
                        <Button onClick={() => {
                            get_all_meals();
                        }}>Get Total Average</Button>
                    </Group>
                </Stack>}
        </Stack>
    </Container>)
}