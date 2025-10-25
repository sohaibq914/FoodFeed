import ResetPasswordForm from '@/components/ResetPasswordForm';
import { Suspense } from 'react';
import { Container, Loader, Center } from '@mantine/core';

function ResetPasswordContent() {
  return <ResetPasswordForm />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Container size="xs" style={{ marginTop: '5rem' }}>
          <Center>
            <Loader size="lg" />
          </Center>
        </Container>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
