import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
} from "@chakra-ui/react";
import api from "../api/client";
import StoryCard from "../components/StoryCard";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const profileId = id ?? user?.id?.toString();
  const c = useColors();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: () => api.get(`/users/${profileId}`).then((r) => r.data),
    enabled: !!profileId,
  });

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
        <Avatar size="xl" name={data.username} src={data.avatarUrl || undefined} />
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
