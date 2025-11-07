'use client';
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Text,
  AppShell,
  Stack,
  Fieldset,
  TextInput,
  NativeSelect
} from '@mantine/core';
import { FoodForm, get_user_forms, submit_form } from '@/services/DietService'
import { useState, useEffect } from 'react';
import FoodFormDisplay from './FoodFormDisplay';

interface UserFoodFormDisplayInfo {
    user_id: string;
}

export default function UserFoodFormDisplay({user_id}: UserFoodFormDisplayInfo) {
    const [forms, setForms] = useState([] as FoodForm[])
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        const runner = async () => {
            const {success, message, forms: usr_forms} = await get_user_forms(user_id);
            if (success) {
                setForms(usr_forms!);
            }
            setLoading(false);
        }
        runner()
    }, ['user_forms']);

    const [name, setName] = useState('')
    const [type, setType] = useState('fruit')
    const [desc, setDesc] = useState('')

    return <Stack>
        <Fieldset legend='Submit New Food'>
            <TextInput label='Name' value={name}
                onChange={(e) => {setName(e.currentTarget.value)}}></TextInput>
            <NativeSelect label='Type' value={type}
                data={['fruit', 'vegetable', 'protein', 'dairy']}
                onChange={(e) => {setType(e.currentTarget.value)}}></NativeSelect>
            <TextInput label='Description' value={desc}
                onChange={(e) => {setDesc(e.currentTarget.value)}}></TextInput>
            <Button onClick={(e) => {
                const runner = async () => {
                    const {success} = await submit_form(user_id, name, type, desc)
                    if (success) {
                        setName('')
                        setType('fruit')
                        setDesc('')
                    }
                }
                runner()
            }}>Submit</Button>
        </Fieldset>
        {loading ? <Text>Loading...</Text>:
            forms.map((value, index) => {
                return <Group key={value.id}>
                    <FoodFormDisplay item={value}/>
                    <Text>Status: {value.status}</Text>
                </Group>
            })
        }
    </Stack>
}