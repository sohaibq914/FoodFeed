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

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, username);
    
    if (error) {
      setError(error.error || error.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  return (
    <Container size="xs" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper shadow="lg" p="xl" radius="md" style={{ width: '100%' }}>
        <Center mb="xl">
          <Title order={2}>Register Account</Title>
        </Center>
        
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="Enter your email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
              required
              size="md"
            />

            <TextInput
              label="Username"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              required
              minLength={3}
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

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.currentTarget.value)}
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
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}