"use client";
import { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  TextInput, 
  Textarea,
  Button, 
  Title, 
  Alert, 
  Stack,
  Center,
  Flex,
  Checkbox,
  Tooltip,
  TagsInput,
  NativeSelect
} from '@mantine/core';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { RestrictionItem, add_restriction, remove_restriction, get_restrictions} from '@/services/DietService';



export default function RestrictionsForm() {

  const [tags, setTags] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const [userRestrictions, setUserRestrictions] = useState([] as RestrictionItem[])
  const [chosenRestrToAdd, setRestrToAdd] = useState('')
  const [otherRestrictions, setOtherRestrictions] = useState([] as RestrictionItem[])
  const [chosenRestrToRemove, setRestrToRemove] = useState('')

  useEffect(() => {
    const runner = async () => {
      const {success, message, restrictions} = await get_restrictions(user?.id!)
      if (success) {
        setUserRestrictions(restrictions!.filter((value) => {
          return value.user_has
        }))
        setOtherRestrictions(restrictions!.filter((value) => {
          return !value.user_has
        }))
      }
      else {
        setError(message!)
      }
    }
    runner()
  }, ['restrictions'])
  const router = useRouter();

  const addRestriction = async (restr_id: string) => {
    setLoading(true);
    setError('');

    if (user != null) {
      if (confirm("Are you sure you want to save your changes?")) {
        const {success, message} = await add_restriction(user.id, restr_id);
        if (!success) {
          setError(message!)
        }
        else {
          const item = otherRestrictions.find((value) => {
            return value.id === restr_id
          })!
          setUserRestrictions(userRestrictions.concat(item))
          setOtherRestrictions(otherRestrictions.filter((value) => {
            return value.id !== restr_id
          }))
          setRestrToAdd('')
          setRestrToRemove('')
        }
      }
    }
    else {
      setError('User not logged in')
    }
    
    setLoading(false);
  };

  const removeRestriction = async (restr_id: string) => {
    setLoading(true);
    setError('');

    if (user != null) {
      if (confirm("Are you sure you want to save your changes?")) {
        const {success, message} = await remove_restriction(user.id, restr_id);
        if (!success) {
          setError(message!)
        }
        else {
          const item = userRestrictions.find((value) => {
            return value.id === restr_id
          })!
          setOtherRestrictions(otherRestrictions.concat(item))
          setUserRestrictions(userRestrictions.filter((value) => {
            return value.id !== restr_id
          }))
          setRestrToAdd('')
          setRestrToRemove('')
        }
      }
    }
    else {
      setError('User not logged in')
    }
    
    setLoading(false);
  };

  // const get_restrictions = async (user_id: string) => {
  //   try {
  //     console.log("hello")
      

  //     const response = await fetch('http://localhost:5001/get_restrictions', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ user_id }),
  //     });

  //     const data = await response.json();
  //     console.log(data)
      
  //     if (response.ok) {
  //       if ( data[0].dietary_restrictions ) {
  //         setTags( data[0].dietary_restrictions )
  //       }
  //       //router.push("/dashboard");
  //       //return { data, error: null };
  //     } else {
  //       //router.push('/edit-recipe/new')
  //       return { data: null, error: data };
  //     }
  //   } catch (error) {
  //     console.log(error)
  //     return { data: null, error: { message: 'Network error' } };
  //   }
  // };

  // const update_restrictions = async (user_id: string, tags: string[]) => {
  //  try {
  //     const response = await fetch('http://localhost:5001/update_restrictions', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ user_id, tags }),
  //     });
      
  //     const data = await response.json();
  //     console.log(data)

  //     //notification
  //   } catch (error) {
  //     return { data: null, error: { message: 'Network error' } };
  //   }
  // };

  // useEffect(() => {
  //   if (user != null) {
  //     get_restrictions(user.id);
  //   }
  // }, []);


  return (

    <Container size="xl" style={{ height: 70, minHeight: '100vh', display: 'flex', alignItems: 'start' }}>
      <Paper shadow="lg" p="xl" radius="md" style={{ width: '100%' }}>
        <Center mb="xl">
          <Title order={2}>Dietary Restrictions </Title>
        </Center>
        
          <Stack gap="sm">
            <TagsInput
              label="Current Dietary Restrictions"
              placeholder="Such as allergens or diets"
              value={userRestrictions.map((value) => {return value.name})}
              size="md"
              disabled={true}
            />
            
            {error && (
              <Alert color="red" variant="filled">
                {error}
              </Alert>
            )}
            
            <Flex
              justify="flex-start"
              gap="xl"
              align="Center"
            >
              {/* Add */}
              <Stack>
                <NativeSelect label='Add Restriction' data={otherRestrictions.map((value) => {return value.name})}
                    value={chosenRestrToAdd} onChange={(event)=>{setRestrToAdd(event.currentTarget.value)}}>
                    </NativeSelect>
                <Button
                  onClick={(e) => {
                    if (chosenRestrToAdd === '') {
                      setError("Have to select a value.")
                      return
                    }
                    addRestriction(otherRestrictions.find((value) => {return value.name === chosenRestrToAdd})!.id)
                  }}
                  loading={loading}
                  size="md"
                  fullWidth
                  mt="md"
                >
                  Add
                </Button>
              </Stack>
              {/* Remove */}
              <Stack>
                <NativeSelect label='Remove Restriction' data={userRestrictions.map((value) => {return value.name})}
                    value={chosenRestrToRemove} onChange={(event)=>{setRestrToRemove(event.currentTarget.value)}}>
                    </NativeSelect>
                <Button
                  onClick={(e) => {
                    if (chosenRestrToRemove === '') {
                      setError("Have to select a value.")
                      return
                    }
                    removeRestriction(userRestrictions.find((value) => {return value.name === chosenRestrToRemove})!.id)
                  }}
                  loading={loading}
                  size="md"
                  fullWidth
                  mt="md"
                >
                  Remove
                </Button>
              </Stack>
            </Flex>
          </Stack>
      </Paper>
    </Container>
  );
}