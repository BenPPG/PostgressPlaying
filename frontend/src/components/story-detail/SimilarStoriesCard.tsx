import { Box, Button, Text, VStack, Link, useColorModeValue } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import { useColors } from "../../hooks/useColors";
import type { StoryType } from "../../types/story";

interface SimilarStoriesCardProps {
  tagSlugs: string[];
  currentStoryId: number;
}

export default function SimilarStoriesCard({ tagSlugs, currentStoryId }: SimilarStoriesCardProps) {
  const c = useColors();
  const { data: stories } = useQuery({
    queryKey: ["stories", "related", tagSlugs.join(",")],
    queryFn: () =>
      tagSlugs.length > 0
        ? api.get(`/stories?tag=${encodeURIComponent(tagSlugs.join(","))}&limit=6`).then((r) => r.data.stories)
        : Promise.resolve([] as StoryType[]),
    enabled: tagSlugs.length > 0,
  });

  const filtered = (stories ?? []).filter((story: StoryType) => story.id !== currentStoryId).slice(0, 6);
  if (filtered.length === 0) return null;

  const moreStoriesLink = tagSlugs.length > 0 ? `/?tag=${encodeURIComponent(tagSlugs[0])}` : "/stories";

  return (
    <Box mt={4} mb={8} bg={c.cardBg} borderWidth="1px" borderColor={c.border} rounded="lg" overflow="hidden">
      <Box px={4} pt={4} pb={3}>
        <Text fontSize="xs" letterSpacing="wider" fontWeight="bold" color={c.accent} textTransform="uppercase">
          Similar stories
        </Text>
        <Box h="2px" w="24" bg={c.accentBg} mt={2} mb={3} />
      </Box>
      <VStack spacing={0} align="stretch">
        {filtered.map((story: StoryType, index: number) => {
          const seriesLabel = story.series?.[0]?.series?.title;
          const tagLabel = story.tags?.[0]?.name;
          const metaLabel = seriesLabel ? `in ${seriesLabel}` : tagLabel ? `in ${tagLabel}` : undefined;
          return (
            <Box
              key={story.id}
              px={4}
              py={4}
              borderTop={index === 0 ? "none" : "1px solid"}
              borderColor={c.border}
              _hover={{ bg: useColorModeValue("gray.50", "gray.800") }}
            >
              <Link
                as={RouterLink}
                to={`/stories/${story.id}`}
                fontWeight="semibold"
                color={c.accent}
                fontSize="sm"
                _hover={{ textDecoration: "underline" }}
              >
                {story.title}
              </Link>
              {story.summary && (
                <Text mt={2} fontSize="sm" color={c.subtext} noOfLines={2}>
                  {story.summary}
                </Text>
              )}
              {metaLabel && (
                <Text mt={2} fontSize="xs" color={c.meta}>
                  {metaLabel}
                </Text>
              )}
            </Box>
          );
        })}
      </VStack>
      <Box p={4}>
        <Button as={RouterLink} to={moreStoriesLink} size="sm" colorScheme="purple" width="full">
          More Stories
        </Button>
      </Box>
    </Box>
  );
}
