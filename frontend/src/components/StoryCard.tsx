import { Link as RouterLink } from "react-router-dom";
import { Box, Heading, Text, HStack, Tag, Link } from "@chakra-ui/react";
import { FaEye, FaHeart, FaComment } from "react-icons/fa";
import { useColors } from "../hooks/useColors";

import type { StoryType } from "../types/story";

interface StoryCardProps {
  story: StoryType;
}

export default function StoryCard({ story }: StoryCardProps) {
  const authorId = story.author?.id ?? story.authorId;
  const authorUsername = story.author?.username ?? story.authorUsername ?? "Unknown";
  const c = useColors();

  return (
    <Box bg={c.cardBg} rounded="lg" borderWidth="1px" borderColor={c.border} p={5} _hover={{ shadow: "md" }} transition="box-shadow 0.2s">
      <Link as={RouterLink} to={`/stories/${story.id}`} _hover={{ textDecoration: "none" }}>
        <Heading size="md" color={c.heading} _hover={{ color: "purple.600" }} noOfLines={2}>
          {story.title}
        </Heading>
      </Link>
      {story.summary && (
        <Text mt={2} color={c.subtext} fontSize="sm" noOfLines={3}>
          {story.summary}
        </Text>
      )}
      <HStack mt={3} spacing={3} fontSize="xs" color={c.subtext}>
        <Link as={RouterLink} to={`/profile/${authorId ?? ""}`} color={c.accent} _hover={{ textDecoration: "underline" }}>
          {authorUsername}
        </Link>
        <Text>{new Date(story.createdAt).toLocaleDateString()}</Text>
        <HStack spacing={1} alignItems="center">
          <FaEye />
          <Text>{story.viewsCount}</Text>
        </HStack>
        <HStack spacing={1} alignItems="center">
          <FaHeart />
          <Text>{story._count.likes}</Text>
        </HStack>
        <HStack spacing={1} alignItems="center">
          <FaComment />
          <Text>{story._count.comments}</Text>
        </HStack>
      </HStack>
      {story.tags.length > 0 && (
        <HStack mt={2} flexWrap="wrap" spacing={1}>
          {story.tags.map((tag) => (
            <Tag key={tag.id} size="sm" colorScheme="purple" variant="subtle">
              {tag.name}
            </Tag>
          ))}
        </HStack>
      )}
    </Box>
  );
}
