import { Heading, SimpleGrid, Box, Text } from "@chakra-ui/react";
import StoryCard from "./StoryCard";
import type { StoryType } from "../types/story";
import { useColors } from "../hooks/useColors";

interface StoryGridProps {
  title: string;
  stories: StoryType[];
  columns?: { base?: number; md?: number; lg?: number };
  noStoriesText?: string;
}

export default function StoryGrid({ title, stories, columns = { base: 1, md: 2, lg: 3 }, noStoriesText = "No stories available." }: StoryGridProps) {
  const c = useColors();

  return (
    <Box>
      <Heading size="md" mb={3} color={c.heading}>
        {title}
      </Heading>
      {stories.length === 0 ? (
        <Text color={c.subtext}>{noStoriesText}</Text>
      ) : (
        <SimpleGrid columns={columns} spacing={4}>
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
