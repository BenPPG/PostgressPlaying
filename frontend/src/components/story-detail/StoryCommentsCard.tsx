import { Box, Button, Heading, HStack, Text, Textarea, Avatar, Flex, IconButton, Link, VStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { DeleteIcon } from "@chakra-ui/icons";
import { useColors } from "../../hooks/useColors";
import type { StoryType } from "../../types/story";

interface CommentType {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; username: string };
}

interface StoryCommentsCardProps {
  story: StoryType;
  comments: CommentType[] | undefined;
  user?: { id: number; role?: string };
  commentValue: string;
  onCommentChange: (value: string) => void;
  onCommentPost: () => void;
  addCommentLoading: boolean;
  onDeleteComment: (commentId: number) => void;
}

export default function StoryCommentsCard({
  story,
  comments,
  user,
  commentValue,
  onCommentChange,
  onCommentPost,
  addCommentLoading,
  onDeleteComment,
}: StoryCommentsCardProps) {
  const c = useColors();

  return (
    <Box bg={c.cardBg} borderWidth="1px" borderColor={c.border} rounded="lg" p={6} mb={8}>
      <Heading size="md" mb={4}>
        Comments ({story._count?.comments ?? 0})
      </Heading>

      {user && (
        <Box mb={6}>
          <Textarea
            placeholder="Write a comment..."
            value={commentValue}
            onChange={(e) => onCommentChange(e.target.value)}
            mb={2}
            bg={c.cardBg}
          />
          <Button
            colorScheme="purple"
            size="sm"
            onClick={onCommentPost}
            isLoading={addCommentLoading}
            isDisabled={!commentValue.trim()}
          >
            Post Comment
          </Button>
        </Box>
      )}

      <VStack spacing={4} align="stretch">
        {comments?.map((comment) => (
          <Box key={comment.id} bg={c.cardBg} p={4} rounded="md" borderWidth="1px" borderColor={c.border}>
            <Flex justify="space-between" align="start">
              <HStack spacing={3} mb={2}>
                <Avatar size="xs" name={comment.author.username} />
                <Link as={RouterLink} to={`/profile/${comment.author.id}`} fontWeight="medium" fontSize="sm" color={c.accent}>
                  {comment.author.username}
                </Link>
                <Text fontSize="xs" color={c.meta}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </Text>
              </HStack>
              {(user?.id === comment.author.id || user?.role === "ADMIN") && (
                <IconButton
                  aria-label="Delete comment"
                  icon={<DeleteIcon />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => onDeleteComment(comment.id)}
                />
              )}
            </Flex>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {comment.content}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
