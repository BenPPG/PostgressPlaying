import { useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  Tag,
  Button,
  Textarea,
  Avatar,
  Divider,
  IconButton,
  Center,
  Spinner,
  Link,
  Flex,
  Badge,
} from "@chakra-ui/react";
import { DeleteIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { FaEye, FaHeart, FaRegHeart } from "react-icons/fa";
import { toast } from "sonner";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";

interface SeriesNavBarProps {
  seriesId: number;
  seriesTitle: string;
  currentStoryId: number;
  currentOrder: number;
}

function SeriesNavBar({ seriesId, seriesTitle, currentStoryId, currentOrder }: SeriesNavBarProps) {
  const c = useColors();

  const { data: seriesData } = useQuery({
    queryKey: ["series", seriesId],
    queryFn: () => api.get(`/series/${seriesId}`).then((r) => r.data),
  });

  const stories: { id: number; order: number; title: string }[] = seriesData?.stories ?? [];
  const total = stories.length;
  const currentIndex = stories.findIndex((s) => s.id === currentStoryId);
  const position = currentIndex >= 0 ? currentIndex : stories.findIndex((s) => s.order === currentOrder);
  const prevStory = position > 0 ? stories[position - 1] : null;
  const nextStory = position >= 0 && position < total - 1 ? stories[position + 1] : null;

  return (
    <Box
      bg={c.cardBg}
      borderWidth="1px"
      borderColor="purple.200"
      rounded="md"
      px={4}
      py={3}
    >
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={2}>
        <HStack spacing={2}>
          <Badge colorScheme="purple" variant="subtle">Series</Badge>
          <Link as={RouterLink} to={`/series/${seriesId}`} fontWeight="semibold" color="purple.500" fontSize="sm">
            {seriesTitle}
          </Link>
          {total > 0 && (
            <Text fontSize="xs" color={c.subtext}>
              Part {position + 1} of {total}
            </Text>
          )}
        </HStack>
        <HStack spacing={2}>
          {prevStory ? (
            <Button
              as={RouterLink}
              to={`/stories/${prevStory.id}`}
              size="xs"
              variant="outline"
              colorScheme="purple"
              leftIcon={<ChevronLeftIcon />}
            >
              Prev
            </Button>
          ) : (
            <Button size="xs" variant="outline" isDisabled leftIcon={<ChevronLeftIcon />}>
              Prev
            </Button>
          )}
          {nextStory ? (
            <Button
              as={RouterLink}
              to={`/stories/${nextStory.id}`}
              size="xs"
              variant="outline"
              colorScheme="purple"
              rightIcon={<ChevronRightIcon />}
            >
              Next
            </Button>
          ) : (
            <Button size="xs" variant="outline" isDisabled rightIcon={<ChevronRightIcon />}>
              Next
            </Button>
          )}
        </HStack>
      </HStack>
    </Box>
  );
}

export default function StoryDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const c = useColors();

  const { data: story, isLoading } = useQuery({
    queryKey: ["story", id],
    queryFn: () => api.get(`/stories/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: () => api.get(`/stories/${id}/comments`).then((r) => r.data),
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: () => api.post(`/stories/${id}/like`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["story", id] }),
  });

  const addComment = useMutation({
    mutationFn: (content: string) =>
      api.post(`/stories/${id}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      queryClient.invalidateQueries({ queryKey: ["story", id] });
      setComment("");
      toast.success("Comment added!");
    },
  });

  const deleteComment = useMutation({
    mutationFn: (commentId: number) => api.delete(`/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      queryClient.invalidateQueries({ queryKey: ["story", id] });
      toast.success("Comment deleted");
    },
  });

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="xl" color="purple.500" />
      </Center>
    );
  }

  if (!story) {
    return (
      <Center py={12}>
        <Text color="gray.500">Story not found.</Text>
      </Center>
    );
  }

  const isOwner = user?.id === story.author?.id;

  // For each series this story belongs to, find prev/next siblings
  const seriesEntries: { order: number; series: { id: number; title: string; slug: string } }[] =
    story.series ?? [];

  const headingColor = c.heading;
  const textColor = c.subtext;
  const cardBg = c.cardBg;
  const borderColor = c.border;

  return (
    <Box maxW="3xl" mx="auto">
      {/* Header */}
      <Heading size="xl" mb={2} color={headingColor}>
        {story.title}
      </Heading>
      <HStack spacing={4} mb={4} fontSize="sm" color={textColor}>
        <Link as={RouterLink} to={`/profile/${story.author.id}`} color="purple.500">
          {story.author.username}
        </Link>
        <Text>{new Date(story.createdAt).toLocaleDateString()}</Text>
        <HStack spacing={1} alignItems="center">
          <FaEye />
          <Text>{story.viewsCount} views</Text>
        </HStack>
      </HStack>
      {story.tags?.length > 0 && (
        <HStack mb={4} spacing={2}>
          {story.tags.map((t: any) => (
            <Tag key={t.id} colorScheme="purple" size="sm">
              {t.name}
            </Tag>
          ))}
        </HStack>
      )}

      {/* Series membership + prev/next nav */}
      {seriesEntries.length > 0 && (
        <VStack align="stretch" spacing={3} mb={5}>
          {seriesEntries.map((se) => (
            <SeriesNavBar
              key={se.series.id}
              seriesId={se.series.id}
              seriesTitle={se.series.title}
              currentStoryId={Number(id)}
              currentOrder={se.order}
            />
          ))}
        </VStack>
      )}

      {/* Actions */}
      <HStack mb={6} spacing={3}>
        {user && (
          <Button
            size="sm"
            colorScheme={story.userLiked ? "red" : "gray"}
            variant={story.userLiked ? "solid" : "outline"}
            leftIcon={story.userLiked ? <FaHeart /> : <FaRegHeart />}
            onClick={() => likeMutation.mutate()}
            isLoading={likeMutation.isPending}
          >
            {story.userLiked ? "Liked" : "Like"} ({story._count?.likes ?? 0})
          </Button>
        )}
        {isOwner && (
          <Button as={RouterLink} to={`/stories/${id}/edit`} size="sm" variant="outline">
            Edit
          </Button>
        )}
      </HStack>

      {/* Story content */}
      <Box
        bg={cardBg}
        p={8}
        rounded="lg"
        borderWidth="1px"
        borderColor={borderColor}
        mb={8}
        whiteSpace="pre-wrap"
        lineHeight="1.8"
        fontSize="md"
      >
        {story.content}
      </Box>

      {/* Comments */}
      <Divider mb={6} />
      <Heading size="md" mb={4}>
        Comments ({story._count?.comments ?? 0})
      </Heading>

      {user && (
        <Box mb={6}>
          <Textarea
            placeholder="Write a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            mb={2}
            bg={c.cardBg}
          />
          <Button
            colorScheme="purple"
            size="sm"
            onClick={() => {
              if (comment.trim()) addComment.mutate(comment.trim());
            }}
            isLoading={addComment.isPending}
            isDisabled={!comment.trim()}
          >
            Post Comment
          </Button>
        </Box>
      )}

      <VStack spacing={4} align="stretch">
        {comments?.map((c: any) => (
          <Box key={c.id} bg={cardBg} p={4} rounded="md" borderWidth="1px" borderColor={borderColor}>
            <Flex justify="space-between" align="start">
              <HStack spacing={3} mb={2}>
                <Avatar size="xs" name={c.author.username} />
                <Link as={RouterLink} to={`/profile/${c.author.id}`} fontWeight="medium" fontSize="sm" color="purple.600">
                  {c.author.username}
                </Link>
                <Text fontSize="xs" color="gray.400">
                  {new Date(c.createdAt).toLocaleDateString()}
                </Text>
              </HStack>
              {(user?.id === c.author.id || user?.role === "ADMIN") && (
                <IconButton
                  aria-label="Delete comment"
                  icon={<DeleteIcon />}
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => deleteComment.mutate(c.id)}
                />
              )}
            </Flex>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {c.content}
            </Text>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}
