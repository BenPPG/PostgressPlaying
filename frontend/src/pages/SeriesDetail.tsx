import { useParams, Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Center,
  Spinner,
  Link,
  Divider,
} from "@chakra-ui/react";
import api from "../api/client";
import { useColors } from "../hooks/useColors";
import StoryCard from "../components/StoryCard";
import type { StoryType } from "../types/story";

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const c = useColors();

  const { data: series, isLoading } = useQuery({
    queryKey: ["series", id],
    queryFn: () => api.get(`/series/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="xl" color="purple.500" />
      </Center>
    );
  }

  if (!series) {
    return (
      <Center py={12}>
        <Text color={c.subtext}>Series not found.</Text>
      </Center>
    );
  }

  const storyCount = series.stories?.length ?? 0;

  return (
    <Box maxW="3xl" mx="auto">
      {/* Series header */}
      <Box mb={6}>
        <HStack mb={1} spacing={3} alignItems="baseline">
          <Heading size="xl" color={c.heading}>
            {series.title}
          </Heading>
          <Badge colorScheme="purple" fontSize="sm">
            {storyCount} {storyCount === 1 ? "story" : "stories"}
          </Badge>
        </HStack>
        <Text fontSize="sm" color={c.subtext} mb={1}>
          by{" "}
          <Link as={RouterLink} to={`/profile/${series.author?.id}`} color="purple.500">
            {series.author?.username}
          </Link>
        </Text>
        {series.description && (
          <Text color={c.subtext} mt={2}>
            {series.description}
          </Text>
        )}
      </Box>

      <Divider mb={6} />

      {storyCount === 0 ? (
        <Center py={8}>
          <Text color={c.subtext}>No stories in this series yet.</Text>
        </Center>
      ) : (
        <VStack spacing={4} align="stretch">
          {series.stories.map((story: StoryType & { order: number }, index: number) => (
            <HStack key={story.id} align="start" spacing={4}>
              <Box
                minW="32px"
                h="32px"
                bg="purple.500"
                color="white"
                rounded="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="sm"
                fontWeight="bold"
                flexShrink={0}
                mt={1}
              >
                {index + 1}
              </Box>
              <Box flex={1}>
                <StoryCard story={story} />
              </Box>
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  );
}
