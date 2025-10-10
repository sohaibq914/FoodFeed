import Header from "@/components/Header"
import { useAuth } from "@/contexts/AuthContext"
import { get_user_meals_range, NutritionItem } from "@/services/DietService"
import { BarChart } from "@mantine/charts"
import { AppShell, Container } from "@mantine/core"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

type MealRecord = Record<string, any>

export default function NutrientPage() {
    const user_id = useAuth().user?.id
    const params = useParams<{ start: string, end: string }>()
    const [avgs, set_averages] = useState([] as MealRecord[])
    const [loading, set_loading] = useState(true)
    useEffect(() => { 
        const runner = async () => {
            set_loading(true)
            const {success, message, averages} = await get_user_meals_range(user_id!, 
                new Date(params.start), new Date(params.end))
            const records = averages!.map((value, index) => {
                const record: MealRecord = {
                    time: `${index}:00`,
                    average: value
                }
                console.log("Given record: " + record.average + ", " + record.time)
                return record
            })
            set_averages(records)
        }
        runner()
    }, ['averages of all'])
    // params
    return (<div style={{ minHeight: '100vh' }}>
            <AppShell
            header={{ height: 70 }}
            padding="md"
            >
            <Header showSettingsButton={true} showBackButton={true} />
            <AppShell.Main>
                <Container size="lg" py="xl">
                {loading || avgs == null ? <></> : 
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
                        />}          
                </Container>
            </AppShell.Main>
            </AppShell>
        </div>)
}