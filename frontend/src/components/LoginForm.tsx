"use client";
import { useState } from 'react';
import { 
  Container, 
  Paper, 
  TextInput, 
  PasswordInput, 
  Button, 
  Title, 
  Alert, 
  Stack,
  Center
} from '@mantine/core';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await signIn(login, password);
    
    if (error) {
      setError(error.error || error.message || 'Login failed');
    }
    
    setLoading(false);
  };

  return (
    <Container size="xs" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper shadow="lg" p="xl" radius="md" style={{ width: '100%' }}>
        <Center mb="xl">
          <Title order={2}>Sign In</Title>
        </Center>
        
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email or Username"
              placeholder="Enter your email or username"
              value={login}
              onChange={(e) => setLogin(e.currentTarget.value)}
              required
              size="md"
            />
            
            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
              required
              size="md"
            />
            
            {error && (
              <Alert color="red" variant="filled">
                {error}
              </Alert>
            )}
            
            <Button
              type="submit"
              loading={loading}
              size="md"
              fullWidth
              mt="md"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}