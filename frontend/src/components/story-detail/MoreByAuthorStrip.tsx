import { Box, Heading, VStack, Text, Link, Divider, Icon, HStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FaHeart, FaEye } from "react-icons/fa";
import api from "../../api/client";
import { useColors } from "../../hooks/useColors";
import type { StoryType } from "../../types/story";

interface MoreByAuthorStripProps {
  authorId: number;
  authorUsername: string;
  currentStoryId: number;
}

export default function MoreByAuthorStrip({ authorId, authorUsername, currentStoryId }: MoreByAuthorStripProps) {
  const c = useColors();
  const { data: stories } = useQuery({
    queryKey: ["stories", "authorStrip", authorUsername],
    queryFn: () =>
      authorUsername
        ? api.get(`/stories?author=${encodeURIComponent(authorUsername)}&limit=6`).then((r) => r.data.stories)
        : Promise.resolve([] as StoryType[]),
    enabled: !!authorUsername,
  });

  const filtered = (stories ?? []).filter((story: StoryType) => story.id !== currentStoryId).slice(0, 4);
  if (filtered.length === 0) return null;

  return (
    <Box mb={8} bg={c.cardBg} borderWidth="1px" borderColor={c.border} rounded="lg" overflow="hidden">
      {/* Header */}
      <Box px={5} pt={4} pb={3}>
        <Heading size="sm" color={c.heading}>
          More by{" "}
          <Link as={RouterLink} to={`/profile/${authorId}`} color={c.accent} _hover={{ textDecoration: "underline" }}>
            {authorUsername}
          </Link>
        </Heading>
        <Box h="2px" w="12" bg={c.accentBg} mt={2} rounded="full" />
      </Box>

      {/* Story list */}
      <VStack align="stretch" spacing={0} divider={<Divider borderColor={c.borderSubtle} />} px={5} pb={4}>
        {filtered.map((story: StoryType) => (
          <Box key={story.id} py={3} _hover={{ "& .story-title": { color: "purple.500" } }}>
            <Link
              as={RouterLink}
              to={`/stories/${story.id}`}
              _hover={{ textDecoration: "none" }}
              display="block"
            >
              <Text
                className="story-title"
                fontWeight="semibold"
                fontSize="sm"
                color={c.heading}
                noOfLines={2}
                transition="color 0.15s"
                _groupHover={{ color: "purple.500" }}
              >
                {story.title}
              </Text>
            </Link>
            {story.summary && (
              <Text fontSize="xs" color={c.subtext} mt={1} noOfLines={2} lineHeight="1.5">
                {story.summary}
              </Text>
            )}
            <HStack mt={2} spacing={3} fontSize="xs" color={c.meta}>
              <Text>{new Date(story.createdAt).toLocaleDateString()}</Text>
              <HStack spacing={1}>
                <Icon as={FaEye} boxSize={3} />
                <Text>{story.viewsCount}</Text>
              </HStack>
              <HStack spacing={1}>
                <Icon as={FaHeart} boxSize={3} />
                <Text>{story._count.likes}</Text>
              </HStack>
            </HStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
