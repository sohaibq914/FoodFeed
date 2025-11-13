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
  Center,
  PinInput,
  Text,
  Group
} from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginForm() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [userId, setUserId] = useState('');
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error, mfaRequired: needsMfa, userId: mfaUserId } = await signIn(login, password, mfaCode);
    
    if (needsMfa) {
      setMfaRequired(true);
      setUserId(mfaUserId || '');
      setLoading(false);
      return;
    }
    
    if (error) {
      setError(error.error || error.message || 'Login failed');
    }
    
    setLoading(false);
  };

  const handleMfaSubmit = async () => {
    if (mfaCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await signIn(login, password, mfaCode);
    
    if (error) {
      setError(error.error || error.message || 'Invalid MFA code');
    }
    
    setLoading(false);
  };

  if (mfaRequired) {
    return (
      <Container size="xs" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Paper shadow="lg" p="xl" radius="md" style={{ width: '100%' }}>
          <Center mb="xl">
            <Stack align="center" gap="xs">
              <IconCheck size={48} color="green" />
              <Title order={2}>Verify Your Identity</Title>
            </Stack>
          </Center>
          
          <Text size="sm" c="dimmed" ta="center" mb="xl">
            We've sent a 6-digit verification code to your email. Please enter it below to complete your login.
          </Text>

          <Stack gap="md">
            <Center>
              <PinInput
                length={6}
                value={mfaCode}
                onChange={setMfaCode}
                size="lg"
                type="number"
                placeholder=""
              />
            </Center>
            
            {error && (
              <Alert color="red" variant="filled">
                {error}
              </Alert>
            )}
            
            <Group grow>
              <Button
                variant="light"
                onClick={() => {
                  setMfaRequired(false);
                  setMfaCode('');
                  setError('');
                }}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                onClick={handleMfaSubmit}
                loading={loading}
                disabled={mfaCode.length !== 6}
              >
                Verify
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    );
  }

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