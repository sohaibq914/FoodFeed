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
  TagsInput
} from '@mantine/core';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';



export default function RestrictionsForm() {

  const [tags, setTags] = useState<string[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (user != null ) {
      if (confirm("Are you sure you want to save your changes?")) {
        update_restrictions(user.id, tags)
      }
    }
    else {
      setError('User not logged in')
    }
    
    setLoading(false);
  };

  const get_restrictions = async (user_id: string) => {
    try {
      console.log("hello")
      

      const response = await fetch('http://localhost:5001/get_restrictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id }),
      });

      const data = await response.json();
      console.log(data)
      
      if (response.ok) {
        if ( data[0].dietary_restrictions ) {
          setTags( data[0].dietary_restrictions )
        }
        //router.push("/dashboard");
        //return { data, error: null };
      } else {
        //router.push('/edit-recipe/new')
        return { data: null, error: data };
      }
    } catch (error) {
      console.log(error)
      return { data: null, error: { message: 'Network error' } };
    }
  };

  const update_restrictions = async (user_id: string, tags: string[]) => {
   try {
      const response = await fetch('http://localhost:5001/update_restrictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id, tags }),
      });
      
      const data = await response.json();
      console.log(data)

      //notification
    } catch (error) {
      return { data: null, error: { message: 'Network error' } };
    }
  };

  useEffect(() => {
    if (user != null) {
      get_restrictions(user.id);
    }
  }, []);


  return (

    <Container size="xl" style={{ height: 70, minHeight: '100vh', display: 'flex', alignItems: 'start' }}>
      <Paper shadow="lg" p="xl" radius="md" style={{ width: '100%' }}>
        <Center mb="xl">
          <Title order={2}>Dietary Restrictions </Title>
        </Center>
        
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TagsInput
              label="Dietary Restrictions"
              placeholder="Such as allergens or diets"
              value={tags}
              onChange={setTags}
              required
              size="md"
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
              <Button
                type="submit"
                loading={loading}
                size="md"
                fullWidth
                mt="md"
              >
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </Flex>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}