"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PasswordInput,
  Button,
  Paper,
  Title,
  Container,
  Alert,
  Stack,
  Text,
} from "@mantine/core";
import { IconLock, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import Link from "next/link";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("No reset token provided");
        setValidating(false);
        setTokenValid(false);
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:5001/validate-reset-token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
        } else {
          setError(data.error || "Invalid or expired reset token");
          setTokenValid(false);
        }
      } catch (err) {
        setError("Failed to validate reset token");
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5001/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          new_password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <Container size="xs" style={{ marginTop: "5rem" }}>
        <Paper shadow="md" p="xl" radius="md" withBorder>
          <Stack gap="md" align="center">
            <Title order={2}>Validating Reset Link...</Title>
            <Text c="dimmed">Please wait</Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (!tokenValid) {
    return (
      <Container size="xs" style={{ marginTop: "5rem" }}>
        <Paper shadow="md" p="xl" radius="md" withBorder>
          <Stack gap="md" align="center">
            <IconAlertCircle size={64} color="red" />
            <Title order={2} ta="center">
              Invalid Reset Link
            </Title>
            <Text ta="center" c="dimmed">
              {error ||
                "This password reset link is invalid or has expired. Please request a new one."}
            </Text>
            <Button
              fullWidth
              variant="light"
              component={Link}
              href="/forgot-password"
              mt="md"
            >
              Request New Reset Link
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  if (success) {
    return (
      <Container size="xs" style={{ marginTop: "5rem" }}>
        <Paper shadow="md" p="xl" radius="md" withBorder>
          <Stack gap="md" align="center">
            <IconCheck size={64} color="green" />
            <Title order={2} ta="center">
              Password Reset Successfully
            </Title>
            <Text ta="center" c="dimmed">
              Your password has been updated. You can now log in with your new
              password.
            </Text>
            <Text ta="center" size="sm" c="dimmed">
              Redirecting to login...
            </Text>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="xs" style={{ marginTop: "5rem" }}>
      <Paper shadow="md" p="xl" radius="md" withBorder>
        <Title order={2} ta="center" mb="md">
          Reset Password
        </Title>
        <Text ta="center" c="dimmed" mb="xl">
          Enter your new password below.
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

            <PasswordInput
              label="New Password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftSection={<IconLock size={16} />}
              size="md"
            />

            <PasswordInput
              label="Confirm Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              leftSection={<IconLock size={16} />}
              size="md"
              error={
                confirmPassword &&
                password !== confirmPassword &&
                "Passwords do not match"
              }
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              size="md"
              disabled={!password || !confirmPassword || password !== confirmPassword}
            >
              Reset Password
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}