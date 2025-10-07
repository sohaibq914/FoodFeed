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
  Tooltip
} from '@mantine/core';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function RecipeEditor(params: {recipe_id: string}) {
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [nutrition, setNutrition] = useState('');
  const [allergens, setAllergens] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  const { user } = useAuth();
  const router = useRouter();
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (user != null ) {
      update_recipe( params.recipe_id, user.id, title, description, ingredients, instructions, nutrition, allergens, posting);
      //TODO: redirect to recipe list page or refresh this page after updating 
      //      (which requires moving to url with new id if the draft was new)
    }
    else {
      setError('User not logged in')
    }
    
    setLoading(false);
  };

  const get_recipe = async (id: string) => {
    try {
      console.log("hello")

      const response = await fetch('http://localhost:5001/get_recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();
      console.log(data)
      
      if (response.ok) {
        if ( data.title ) {
          setTitle( data.title )
        }
        if ( data.description ) {
          setDesc( data.description )
        }
        if ( data.ingredients ) {
          setIngredients( data.ingredients )
        }
        if ( data.instructions ) {
          setInstructions( data.instructions )
        }
        if ( data.nutrition ) {
          setNutrition( data.nutrition )
        }
        if ( data.allergens ) {
          setAllergens( data.allergens )
        }
        return { data, error: null };
        
      } else {
        router.push('/edit-recipe/new')
        return { data: null, error: data };
      }
    } catch (error) {
      console.log(error)
      return { data: null, error: { message: 'Network error' } };
    }
  };

  const update_recipe = async (id: string, author: string, title: string, description: string, ingredients: string, instructions: string, nutrition: string, allergens: string, posting: boolean) => {
   try {
      const response = await fetch('http://localhost:5001/update_recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, author, title, description, ingredients, instructions, nutrition, allergens, posting }),
      });
      
      const data = await response.json();

    } catch (error) {
      return { data: null, error: { message: 'Network error' } };
    }
  };

  useEffect(() => {
    get_recipe(params.recipe_id)
  }, []);

  return (

    <Container size="xl" style={{ height: 70, minHeight: '100vh', display: 'flex', alignItems: 'start' }}>
      <Paper shadow="lg" p="xl" radius="md" style={{ width: '100%' }}>
        <Center mb="xl">
          <Title order={2}>Recipe Editor </Title>
        </Center>
        
        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Title"
              placeholder="Your recipe's title"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              required
              size="md"
            />
            
            <Textarea
              label="Description"
              placeholder="Your recipe's description"
              autosize
              minRows={2}
              maxRows={3}
              value={description}
              onChange={(e) => setDesc(e.currentTarget.value)}
              required
              size="md"
            />

            <Textarea
              label="Ingredients"
              placeholder="Your recipe's ingredient list"
              value={ingredients}
              autosize
              minRows={2}
              maxRows={8}
              onChange={(e) => setIngredients(e.currentTarget.value)}
              required
              size="md"
            />

            <Textarea
              label="Instructions"
              placeholder="Your recipe's directions"
              autosize
              minRows={4}
              maxRows={10}
              value={instructions}
              onChange={(e) => setInstructions(e.currentTarget.value)}
              required
              size="md"
            />

            <Textarea
              label="Nutrition Facts"
              placeholder="Your recipe's nutritional information"
              autosize
              minRows={2}
              maxRows={6}
              value={nutrition}
              onChange={(e) => setNutrition(e.currentTarget.value)}
              
              size="md"
            />

            <Textarea
              label="Allergens"
              placeholder="Your recipe's nutritional information"
              value={allergens}
              autosize
              minRows={2}
              maxRows={6}
              onChange={(e) => setAllergens(e.currentTarget.value)}
              
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
              <Tooltip
                label="Post this recipe to your profile."
              >
                <Checkbox
                  checked={posting}
                  onChange={(event) => setPosting(event.currentTarget.checked)}
                  size="md"
                  label="Post"
                  labelPosition="left"
                >
                </Checkbox>
              </Tooltip>
              <Button
                type="submit"
                loading={loading}
                size="md"
                fullWidth
                mt="md"
              >
                {posting ? 'Post to profile' : 'Save as Draft'}
              </Button>
            </Flex>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}