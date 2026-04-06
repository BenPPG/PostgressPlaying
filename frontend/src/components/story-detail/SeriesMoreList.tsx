import { Box, HStack, Link, Text, VStack, Badge } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import { useColors } from "../../hooks/useColors";

interface SeriesMoreListProps {
  seriesId: number;
  currentStoryId: number;
}

export default function SeriesMoreList({ seriesId, currentStoryId }: SeriesMoreListProps) {
  const c = useColors();
  const { data: seriesData, isLoading } = useQuery({
    queryKey: ["series", "detail", seriesId],
    queryFn: () => api.get(`/series/${seriesId}`).then((r) => r.data),
  });

  if (!seriesData) {
    return isLoading ? (
      <Text fontSize="sm" color={c.subtext}>
        Loading series...
      </Text>
    ) : null;
  }

  return (
    <Box bg={c.cardBg} borderWidth="1px" borderColor={c.border} rounded="lg" p={4}>
      <HStack justify="space-between" align="center" mb={3}>
        <Text fontSize="sm" fontWeight="semibold">
          {seriesData.title}
        </Text>
        <Link as={RouterLink} to={`/series/${seriesId}`} color={c.accent} fontSize="sm">
          View series
        </Link>
      </HStack>
      <VStack align="stretch" spacing={2}>
        {seriesData.stories.map((storyItem: any) => (
          <HStack key={storyItem.id} spacing={2} align="center">
            <Badge
              colorScheme={storyItem.id === currentStoryId ? "purple" : "gray"}
              variant={storyItem.id === currentStoryId ? "solid" : "subtle"}
              minW="28px"
              textAlign="center"
            >
              {storyItem.order + 1}
            </Badge>
            <Link
              as={RouterLink}
              to={`/stories/${storyItem.id}`}
              fontSize="sm"
              color={storyItem.id === currentStoryId ? "purple.700" : "purple.500"}
              fontWeight={storyItem.id === currentStoryId ? "semibold" : "medium"}
            >
              {storyItem.title}
            </Link>
            {storyItem.id === currentStoryId && (
              <Text fontSize="xs" color={c.meta}>(current)</Text>
            )}
          </HStack>
        ))}
      </VStack>
    </Box>
  );
}
