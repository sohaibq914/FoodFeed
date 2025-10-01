"use client";

import { AppShell, Container } from "@mantine/core";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import CommonHeader from "@/components/Header";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();

  const profileUsername = params.username;
  const isOwner = !!user?.username && user.username === profileUsername;

  return (
    <AppShell
      // Tell AppShell the header height so it offsets Main correctly
      header={{ height: 64 }}
      padding="md"
    >
      <AppShell.Header>
        <CommonHeader />
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <h1 style={{ margin: 0 }}>@{profileUsername}</h1>
          <p style={{ color: "#666" }}>
            {isOwner
              ? "This is your profile — show edit controls here."
              : "Public view."}
          </p>

          {isOwner && (
            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              <button>Edit profile</button>
              
            </div>
          )}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
