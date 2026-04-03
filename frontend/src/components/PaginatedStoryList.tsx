import { Box, Button, Flex, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import type { StoryType } from "../types/story";
import { useColors } from "../hooks/useColors";

interface PaginatedStoryListProps {
  stories: StoryType[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  title?: string;
  noStoriesText?: string;
}

function HorizontalStoryCard({ story }: { story: StoryType }) {
  const c = useColors();

  return (
    <Flex
      w="100%"
      direction={{ base: "column", md: "row" }}
      bg={c.cardBg}
      borderWidth="1px"
      borderColor={c.border}
      borderRadius="md"
      p={4}
      gap={4}
      align="center"
      _hover={{ shadow: "md" }}
      transition="box-shadow 0.2s"
    >
      <Box flex="1">
        <Text fontWeight="bold" fontSize="lg" color={c.accent}>
          {story.title}
        </Text>
        {story.summary && (
          <Text fontSize="sm" color={c.subtext} noOfLines={2}>
            {story.summary}
          </Text>
        )}
        <HStack spacing={3} mt={2} fontSize="xs" color={c.subtext}>
          <Text>{story.author?.username ?? story.authorUsername ?? "Unknown author"}</Text>
          <Text>{new Date(story.createdAt).toLocaleDateString()}</Text>
          <Text>👀 {story.viewsCount}</Text>
          <Text>❤️ {story._count.likes}</Text>
          <Text>💬 {story._count.comments}</Text>
        </HStack>
      </Box>
    </Flex>
  );
}

export default function PaginatedStoryList({
  stories,
  page,
  totalPages,
  onPageChange,
  title = "All Stories",
  noStoriesText = "No stories available.",
}: PaginatedStoryListProps) {
  const c = useColors();

  return (
    <VStack align="stretch" spacing={4}>
      <Heading size="md" color={c.heading}>{title}</Heading>
      {stories.length === 0 ? (
        <Text color={c.subtext}>{noStoriesText}</Text>
      ) : (
        <VStack align="stretch" spacing={3}>
          {stories.map((story) => (
            <HorizontalStoryCard key={story.id} story={story} />
          ))}
        </VStack>
      )}

      <HStack justify="center" spacing={2} pt={2}>
        <Button size="sm" onClick={() => onPageChange(Math.max(1, page - 1))} isDisabled={page <= 1}>
          Previous
        </Button>
        <Text fontSize="sm" color={c.subtext}>
          Page {page} of {totalPages || 1}
        </Text>
        <Button size="sm" onClick={() => onPageChange(Math.min(totalPages, page + 1))} isDisabled={page >= totalPages}>
          Next
        </Button>
      </HStack>
    </VStack>
  );
}
