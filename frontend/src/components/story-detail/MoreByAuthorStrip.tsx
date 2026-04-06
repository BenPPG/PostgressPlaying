import { Box, Heading, HStack } from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import { useColors } from "../../hooks/useColors";
import StoryCard from "./../StoryCard";
import type { StoryType } from "../../types/story";

interface MoreByAuthorStripProps {
  authorUsername: string;
  currentStoryId: number;
}

export default function MoreByAuthorStrip({ authorUsername, currentStoryId }: MoreByAuthorStripProps) {
  const c = useColors();
  const { data: stories } = useQuery({
    queryKey: ["stories", "authorStrip", authorUsername],
    queryFn: () =>
      authorUsername
        ? api.get(`/stories?author=${encodeURIComponent(authorUsername)}&limit=6`).then((r) => r.data.stories)
        : Promise.resolve([] as StoryType[]),
    enabled: !!authorUsername,
  });

  const filtered = (stories ?? []).filter((story: StoryType) => story.id !== currentStoryId).slice(0, 5);
  if (filtered.length === 0) return null;

  return (
    <Box mb={8}>
      <Heading size="md" mb={4} color={c.heading}>
        More by this author
      </Heading>
      <HStack spacing={4} overflowX="auto" pb={2}>
        {filtered.map((story: StoryType) => (
          <Box key={story.id} minW="260px" flexShrink={0}>
            <StoryCard story={story} />
          </Box>
        ))}
      </HStack>
    </Box>
  );
}
