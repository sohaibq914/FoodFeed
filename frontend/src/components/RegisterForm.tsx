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
  Text,
  PinInput
} from '@mantine/core';
import { IconMail, IconCheck } from '@tabler/icons-react';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterForm() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const { signUp } = useAuth();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSendingCode(true);

    if (!email || !username) {
      setError('Email and username are required');
      setSendingCode(false);
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      setSendingCode(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username }),
      });

      const data = await response.json();

      if (response.ok) {
        setCodeSent(true);
        setError('');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5001/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: verificationCode }),
      });

      const data = await response.json();

      if (response.ok) {
        setCodeVerified(true);
        setError('');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('An error occurred verifying the code');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, username);
    
    if (error) {
      setError(error.error || error.message || 'Registration failed');
    }
    
    setLoading(false);
  };

  if (!codeSent) {
    return (
      <Container size="xs" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Paper shadow="lg" p="xl" radius="md" style={{ width: '100%' }}>
          <Center mb="xl">
            <Title order={2}>Register Account</Title>
          </Center>
          
          <form onSubmit={handleSendCode}>
            <Stack gap="md">
              <TextInput
                label="Email"
                placeholder="Enter your email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                required
                size="md"
                leftSection={<IconMail size={16} />}
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
              
              {error && (
                <Alert color="red" variant="filled">
                  {error}
                </Alert>
              )}
              
              <Button
                type="submit"
                loading={sendingCode}
                size="md"
                fullWidth
                mt="md"
              >
                {sendingCode ? 'Sending Code...' : 'Send Verification Code'}
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    );
  }

  if (!codeVerified) {
    return (
      <Container size="xs" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Paper shadow="lg" p="xl" radius="md" style={{ width: '100%' }}>
          <Center mb="xl">
            <Title order={2}>Verify Your Email</Title>
          </Center>
          
          <Stack gap="md">
            <Text ta="center" c="dimmed">
              We've sent a 6-digit code to <strong>{email}</strong>
            </Text>
            <Text ta="center" size="sm" c="dimmed">
              Please check your email and enter the code below.
            </Text>

            <Center>
              <PinInput
                length={6}
                size="lg"
                type="number"
                value={verificationCode}
                onChange={setVerificationCode}
                onComplete={handleVerifyCode}
              />
            </Center>
            
            {error && (
              <Alert color="red" variant="filled">
                {error}
              </Alert>
            )}

            <Button
              onClick={handleVerifyCode}
              loading={loading}
              size="md"
              fullWidth
              disabled={verificationCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <Button
              variant="subtle"
              onClick={() => {
                setCodeSent(false);
                setVerificationCode('');
                setError('');
              }}
              size="sm"
            >
              Use a different email
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xs" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper shadow="lg" p="xl" radius="md" style={{ width: '100%' }}>
        <Center mb="md">
          <IconCheck size={64} color="green" />
        </Center>
        <Center mb="xl">
          <Title order={2}>Email Verified!</Title>
        </Center>
        
        <form onSubmit={handleRegister}>
          <Stack gap="md">
            <Text ta="center" c="dimmed" mb="md">
              Now set your password to complete registration.
            </Text>

            <TextInput
              label="Email"
              value={email}
              disabled
              size="md"
            />

            <TextInput
              label="Username"
              value={username}
              disabled
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
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}