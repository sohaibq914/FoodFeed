"use client";
import { useState, useEffect } from 'react';
import { 
  Stack, 
  Group, 
  TextInput, 
  Button, 
  Text, 
  Paper, 
  ActionIcon,
  Select,
  Alert,
  Divider
} from '@mantine/core';
import { 
  IconBrandTwitter, 
  IconBrandInstagram, 
  IconBrandFacebook, 
  IconBrandLinkedin, 
  IconBrandYoutube, 
  IconBrandTiktok, 
  IconBrandGithub, 
  IconWorld,
  IconTrash,
  IconPlus,
  IconCheck,
  IconX,
  IconAlertCircle
} from '@tabler/icons-react';

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

interface SocialLinksManagerProps {
  userId: string;
}

const platformIcons: Record<string, any> = {
  twitter: IconBrandTwitter,
  instagram: IconBrandInstagram,
  facebook: IconBrandFacebook,
  linkedin: IconBrandLinkedin,
  youtube: IconBrandYoutube,
  tiktok: IconBrandTiktok,
  github: IconBrandGithub,
  website: IconWorld,
};

const platformColors: Record<string, string> = {
  twitter: 'blue',
  instagram: 'pink',
  facebook: 'blue',
  linkedin: 'blue',
  youtube: 'red',
  tiktok: 'gray',
  github: 'gray',
  website: 'grape',
};

const platformLabels: Record<string, string> = {
  twitter: 'Twitter / X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  github: 'GitHub',
  website: 'Website',
};

export default function SocialLinksManager({ userId }: SocialLinksManagerProps) {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingNew, setAddingNew] = useState(false);
  const [newPlatform, setNewPlatform] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchLinks();
  }, [userId]);

  const fetchLinks = async () => {
    try {
      const response = await fetch(`http://localhost:5001/user/${userId}/social-links`);
      const data = await response.json();

      if (response.ok) {
        setLinks(data.links || []);
      }
    } catch (error) {
      console.error('Failed to fetch social links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = async () => {
    if (!newPlatform || !newUrl) {
      setError('Please select a platform and enter a URL');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`http://localhost:5001/user/${userId}/social-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          platform: newPlatform,
          url: newUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${platformLabels[newPlatform]} link added successfully!`);
        setNewPlatform(null);
        setNewUrl('');
        setAddingNew(false);
        await fetchLinks();
      } else {
        setError(data.error || 'Failed to add link');
      }
    } catch (error) {
      console.error('Failed to add social link:', error);
      setError('Failed to add social link');
    }
  };

  const handleRemoveLink = async (platform: string) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`http://localhost:5001/user/${userId}/social-links/${platform}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': userId,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`${platformLabels[platform]} link removed successfully!`);
        await fetchLinks();
      } else {
        setError(data.error || 'Failed to remove link');
      }
    } catch (error) {
      console.error('Failed to remove social link:', error);
      setError('Failed to remove social link');
    }
  };

  const getAvailablePlatforms = () => {
    const existingPlatforms = links.map(link => link.platform);
    return Object.keys(platformLabels)
      .filter(platform => !existingPlatforms.includes(platform))
      .map(platform => ({
        value: platform,
        label: platformLabels[platform],
      }));
  };

  return (
    <Stack gap="md">
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" onClose={() => setError('')} withCloseButton>
          {error}
        </Alert>
      )}

      {success && (
        <Alert icon={<IconCheck size={16} />} color="green" variant="light" onClose={() => setSuccess('')} withCloseButton>
          {success}
        </Alert>
      )}

      {links.length > 0 && (
        <Stack gap="xs">
          {links.map((link) => {
            const Icon = platformIcons[link.platform] || IconWorld;
            return (
              <Paper key={link.id} p="sm" withBorder>
                <Group justify="space-between">
                  <Group gap="sm">
                    <Icon size={20} color={platformColors[link.platform]} />
                    <div>
                      <Text size="sm" fw={500}>{platformLabels[link.platform]}</Text>
                      <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                        {link.url}
                      </Text>
                    </div>
                  </Group>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemoveLink(link.platform)}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Paper>
            );
          })}
        </Stack>
      )}

      {links.length === 0 && !addingNew && !loading && (
        <Text size="sm" c="dimmed">
          No social media links added yet
        </Text>
      )}

      {addingNew ? (
        <Paper p="md" withBorder style={{ backgroundColor: '#f8f9fa' }}>
          <Stack gap="md">
            <Text size="sm" fw={500}>Add Social Media Link</Text>
            
            <Select
              label="Platform"
              placeholder="Select a platform"
              data={getAvailablePlatforms()}
              value={newPlatform}
              onChange={setNewPlatform}
              required
            />

            <TextInput
              label="URL"
              placeholder="https://..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.currentTarget.value)}
              required
            />

            <Group gap="xs">
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleAddLink}
                disabled={!newPlatform || !newUrl}
              >
                Add Link
              </Button>
              <Button
                variant="light"
                color="gray"
                leftSection={<IconX size={16} />}
                onClick={() => {
                  setAddingNew(false);
                  setNewPlatform(null);
                  setNewUrl('');
                  setError('');
                }}
              >
                Cancel
              </Button>
            </Group>
          </Stack>
        </Paper>
      ) : (
        getAvailablePlatforms().length > 0 && (
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() => setAddingNew(true)}
            fullWidth
          >
            Add Social Media Link
          </Button>
        )
      )}

      {getAvailablePlatforms().length === 0 && !addingNew && (
        <Text size="xs" c="dimmed" ta="center">
          All available platforms have been added
        </Text>
      )}
    </Stack>
  );
}
