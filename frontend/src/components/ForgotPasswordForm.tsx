"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TextInput,
  Button,
  Paper,
  Title,
  Container,
  Alert,
  Stack,
  Text,
  Anchor,
} from "@mantine/core";
import { IconMail, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5001/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to send reset email");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container size="xs" style={{ marginTop: "5rem" }}>
        <Paper shadow="md" p="xl" radius="md" withBorder>
          <Stack gap="md" align="center">
            <IconCheck size={64} color="green" />
            <Title order={2} ta="center">
              Check Your Email
            </Title>
            <Text ta="center" c="dimmed">
              If an account exists with <strong>{email}</strong>, you will
              receive a password reset link shortly.
            </Text>
            <Text ta="center" size="sm" c="dimmed">
              Please check your spam folder if you don&apos;t see the email.
            </Text>
            <Button
              fullWidth
              variant="light"
              component={Link}
              href="/login"
              mt="md"
            >
              Return to Login
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xs" style={{ marginTop: "5rem" }}>
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={2} ta="center" mb="md">
          Forgot Password
        </Title>
        <Text ta="center" c="dimmed" mb="xl">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </Text>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {error && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                title="Error"
                color="red"
                variant="filled"
              >
                {error}
              </Alert>
            )}

            <TextInput
              label="Email"
              placeholder="your-email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              leftSection={<IconMail size={16} />}
              size="md"
            />

            <Button type="submit" fullWidth loading={loading} size="md">
              Send Reset Link
            </Button>

            <Text ta="center" c="dimmed" size="sm">
              Remember your password?{" "}
              <Anchor component={Link} href="/login" c="blue">
                Back to Login
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
