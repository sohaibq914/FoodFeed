import RegisterForm from '@/components/RegisterForm';
import Link from 'next/link';
import { Container, Text, Anchor } from '@mantine/core';

export default function RegisterPage() {
  return (
    <div style={{ position: 'relative' }}>
      <RegisterForm />
      <Container size="xs" style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }}>
        <Text ta="center" c="dimmed" size="sm">
          Already have an account?{' '}
          <Anchor component={Link} href="/login" c="blue">
            Sign in here
          </Anchor>
        </Text>
      </Container>
    </div>
  );
}