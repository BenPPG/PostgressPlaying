import { Box, Button, Flex, Heading, HStack, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { FaEye, FaHeart, FaRegHeart } from "react-icons/fa";
import { useColors } from "../../hooks/useColors";
import type { StoryType } from "../../types/story";

interface StoryDetailHeaderProps {
  story: StoryType & { userLiked?: boolean };
  user?: { id: number };
  isOwner: boolean;
  likeLoading: boolean;
  onLike: () => void;
}

export default function StoryDetailHeader({
  story,
  user,
  isOwner,
  likeLoading,
  onLike,
}: StoryDetailHeaderProps) {
  const c = useColors();

  return (
    <Box bg={c.cardBg} borderWidth="1px" borderColor={c.border} rounded="lg" p={5} mb={6}>
      <Flex
        direction={{ base: "column", md: "row" }}
        align={{ base: "flex-start", md: "center" }}
        justify="space-between"
        gap={4}
      >
        <Box minW={0}>
          <Heading size="xl" color={c.heading} mb={2} noOfLines={2}>
            {story.title}
          </Heading>
          <HStack spacing={4} fontSize="sm" color={c.subtext}>
            <Text>{new Date(story.createdAt).toLocaleDateString()}</Text>
            <HStack spacing={1} alignItems="center">
              <FaEye />
              <Text>{story.viewsCount} views</Text>
            </HStack>
          </HStack>
        </Box>

        <HStack spacing={3}>
          {user && (
            <Button
              size="sm"
              colorScheme={story.userLiked ? "red" : "gray"}
              variant={story.userLiked ? "solid" : "outline"}
              leftIcon={story.userLiked ? <FaHeart /> : <FaRegHeart />}
              onClick={onLike}
              isLoading={likeLoading}
            >
              {story.userLiked ? "Liked" : "Like"} ({story._count?.likes ?? 0})
            </Button>
          )}
          {isOwner && (
            <Button as={RouterLink} to={`/stories/${story.id}/edit`} size="sm" variant="outline">
              Edit
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  );
}
