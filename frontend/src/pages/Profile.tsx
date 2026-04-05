import { useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Heading,
  Text,
  Avatar,
  HStack,
  VStack,
  SimpleGrid,
  Center,
  Spinner,
  Divider,
  IconButton,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";
import api from "../api/client";
import StoryCard from "../components/StoryCard";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user, setUser } = useAuth();
  const profileId = id ?? user?.id?.toString();
  const isOwnProfile = !id || id === user?.id?.toString();
  const c = useColors();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: () => api.get(`/users/${profileId}`).then((r) => r.data),
    enabled: !!profileId,
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", status: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be smaller than 5 MB", status: "error" });
      return;
    }

    try {
      // 1. Get a presigned upload URL from our backend
      const { data: presigned } = await api.post("/users/me/avatar-upload-url", {
        contentType: file.type,
      });

      // 2. Upload directly to R2 — no auth header, just the presigned URL
      const upload = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!upload.ok) throw new Error("Upload failed");

      // 3. Save the public object URL on the user profile
      const { data: updated } = await api.put("/users/me", {
        avatarUrl: presigned.objectUrl,
      });

      setUser(updated);
      await queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      toast({ title: "Avatar updated", status: "success" });
    } catch {
      toast({ title: "Failed to upload avatar", status: "error" });
    }
  }

  if (!profileId) {
    return (
      <Center py={12}>
        <Text color={c.subtext}>Please login to view your profile.</Text>
      </Center>
    );
  }

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="xl" color="purple.500" />
      </Center>
    );
  }

  if (!data) {
    return (
      <Center py={12}>
        <Text color={c.subtext}>User not found.</Text>
      </Center>
    );
  }

  return (
    <Box maxW="4xl" mx="auto">
      <VStack spacing={4} align="center" mb={8}>
        <Box position="relative">
          <Avatar size="xl" name={data.username} src={data.avatarUrl || undefined} />
          {isOwnProfile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
              <Tooltip label="Change avatar">
                <IconButton
                  aria-label="Change avatar"
                  icon={<EditIcon />}
                  size="xs"
                  borderRadius="full"
                  position="absolute"
                  bottom={0}
                  right={0}
                  onClick={() => fileInputRef.current?.click()}
                />
              </Tooltip>
            </>
          )}
        </Box>
        <Heading size="lg" color={c.heading}>{data.username}</Heading>
        {data.bio && (
          <Text color={c.subtext} textAlign="center" maxW="lg">
            {data.bio}
          </Text>
        )}
        <HStack spacing={6} fontSize="sm" color={c.meta}>
          <Text>Joined {new Date(data.createdAt).toLocaleDateString()}</Text>
          <Text>{data._count?.stories ?? 0} stories</Text>
        </HStack>
      </VStack>

      <Divider mb={6} />

      <Heading size="md" mb={4}>
        Published Stories
      </Heading>

      {data.stories?.length === 0 ? (
        <Text color="gray.400">No published stories yet.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {data.stories?.map((story: any) => (
            <StoryCard
              key={story.id}
              story={{
                ...story,
                authorId: data.id,
                authorUsername: data.username,
              }}
            />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
