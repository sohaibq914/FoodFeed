import LoginForm from '@/components/LoginForm';
import Link from 'next/link';
import { Container, Text, Anchor } from '@mantine/core';

export default function LoginPage() {
  return (
    <div style={{ position: 'relative' }}>
      <LoginForm />
      <Container size="xs" style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }}>
        <Text ta="center" c="dimmed" size="sm">
          Don't have an account?{' '}
          <Anchor component={Link} href="/register" c="blue">
            Sign up here
          </Anchor>
        </Text>
      </Container>
    </div>
  );
}