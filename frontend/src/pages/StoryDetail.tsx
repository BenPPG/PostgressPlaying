import { useState, useCallback } from "react";
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
  Avatar,
  Center,
  Spinner,
  Link,
  Flex,
  Badge,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { FaCopy } from "react-icons/fa";
import { toast } from "sonner";
import api from "../api/client";
import StoryDetailHeader from "../components/story-detail/StoryDetailHeader";
import StoryCommentsCard from "../components/story-detail/StoryCommentsCard";
import MoreByAuthorStrip from "../components/story-detail/MoreByAuthorStrip";
import SimilarStoriesCard from "../components/story-detail/SimilarStoriesCard";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";
import AddToListModal from "../components/AddToListModal";


interface SeriesTabContentProps {
  seriesId: number;
  seriesTitle: string;
  currentStoryId: number;
  currentOrder: number;
}

function SeriesTabContent({ seriesId, seriesTitle, currentStoryId, currentOrder }: SeriesTabContentProps) {
  const c = useColors();
  const { data: seriesData } = useQuery({
    queryKey: ["series", seriesId],
    queryFn: () => api.get(`/series/${seriesId}`).then((r) => r.data),
  });

  const stories: { id: number; order: number; title: string }[] = seriesData?.stories ?? [];
  const currentIndex = stories.findIndex((s) => s.id === currentStoryId);
  const position = currentIndex >= 0 ? currentIndex : stories.findIndex((s) => s.order === currentOrder);
  const prevStory = position > 0 ? stories[position - 1] : null;
  const nextStory = position >= 0 && position < stories.length - 1 ? stories[position + 1] : null;

  return (
    <Box>
      <Text fontSize="sm" fontWeight="semibold" mb={3}>
        {seriesTitle}
      </Text>
      <HStack spacing={3} mb={4} flexWrap="wrap" w="full">
        <Button
          as={RouterLink}
          to={prevStory ? `/stories/${prevStory.id}` : "#"}
          flex={1}
          size="sm"
          variant={prevStory ? "outline" : "ghost"}
          colorScheme="purple"
          leftIcon={<ChevronLeftIcon />}
          isDisabled={!prevStory}
          minW="0"
        >
          Prev
        </Button>
        <Button
          as={RouterLink}
          to={nextStory ? `/stories/${nextStory.id}` : "#"}
          flex={1}
          size="sm"
          variant={nextStory ? "solid" : "ghost"}
          colorScheme="purple"
          rightIcon={<ChevronRightIcon />}
          isDisabled={!nextStory}
          minW="0"
        >
          Next
        </Button>
      </HStack>
      {stories.length > 0 ? (
        <VStack align="stretch" spacing={2} borderTop="1px" borderColor={c.borderSubtle} pt={3}>
          {stories.map((storyItem) => (
            <HStack key={storyItem.id} spacing={2} align="center">
              <Badge
                colorScheme={storyItem.id === currentStoryId ? "purple" : "purple"}
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
      ) : (
        <Text fontSize="sm" color={c.subtext} fontStyle="italic">
          No stories found for this series.
        </Text>
      )}
    </Box>
  );
}

export default function StoryDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [copied, setCopied] = useState(false);
  const [listModalOpen, setListModalOpen] = useState(false);
  const openListModal = useCallback(() => setListModalOpen(true), []);
  const closeListModal = useCallback(() => setListModalOpen(false), []);
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
        <Spinner size="xl" color={c.accent} />
      </Center>
    );
  }

  if (!story) {
    return (
      <Center py={12}>
        <Text color={c.subtext}>Story not found.</Text>
      </Center>
    );
  }

  const isOwner = user?.id === story.author?.id;

  // For each series this story belongs to, find prev/next siblings
  const seriesEntries: { order: number; series: { id: number; title: string; slug: string } }[] =
    story.series ?? [];

  const headingColor = c.heading;
  const cardBg = c.cardBg;
  const borderColor = c.border;

  return (
    <Box maxW="6xl" mx="auto">
      <StoryDetailHeader
        story={story}
        user={user ?? undefined}
        isOwner={isOwner}
        likeLoading={likeMutation.isPending}
        onLike={() => likeMutation.mutate()}
        onAddToList={user ? openListModal : undefined}
      />

      {user && (
        <AddToListModal
          isOpen={listModalOpen}
          onClose={closeListModal}
          storyId={story.id}
          storyTitle={story.title}
        />
      )}

      {/* Two-column layout: main content + sidebar */}
      <Flex gap={8} align="flex-start" direction={{ base: "column", xl: "row" }}>
        <Box flex={1} minW={0}>

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


      <StoryCommentsCard
        story={story}
        comments={comments}
        user={user ?? undefined}
        commentValue={comment}
        onCommentChange={setComment}
        onCommentPost={() => {
          if (comment.trim()) addComment.mutate(comment.trim());
        }}
        addCommentLoading={addComment.isPending}
        onDeleteComment={(commentId) => deleteComment.mutate(commentId)}
      />

      <MoreByAuthorStrip authorUsername={story.author?.username ?? ""} currentStoryId={story.id} />
        </Box>{/* end main column */}

        {/* Sidebar */}
        <Box
          w={{ base: "full", xl: "300px" }}
          flexShrink={0}
          position="sticky"
          top={4}
          alignSelf="flex-start"
        >
          <Box
            bg={cardBg}
            borderWidth="1px"
            borderColor={borderColor}
            rounded="lg"
            overflow="hidden"
          >
            <Tabs colorScheme="purple" size="sm">
              <TabList px={4} pt={3}>
                <Tab>Author</Tab>
                <Tab>Tags</Tab>
                <Tab>Series</Tab>
                <Tab>Share</Tab>
              </TabList>
              <TabPanels>
                {/* Author */}
                <TabPanel>
                  <HStack spacing={4} align="start">
                    <Avatar
                      size="md"
                      name={story.author.username}
                      src={story.author.avatarUrl ?? undefined}
                    />
                    <VStack align="start" spacing={1}>
                      <Link
                        as={RouterLink}
                        to={`/profile/${story.author.id}`}
                        fontWeight="semibold"
                        color={c.accent}
                      >
                        {story.author.username}
                      </Link>
                      {story.author.bio ? (
                        <Text fontSize="sm" color={c.subtext}>
                          {story.author.bio}
                        </Text>
                      ) : (
                        <Text fontSize="sm" color={c.meta} fontStyle="italic">
                          No bio provided.
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                </TabPanel>

                {/* Tags */}
                <TabPanel>
                  {story.tags?.length > 0 ? (
                    <HStack spacing={2} flexWrap="wrap">
                      {story.tags.map((t: any) => (
                        <Tag
                          key={t.id}
                          as={RouterLink}
                          to={`/?tag=${encodeURIComponent(t.name)}`}
                          colorScheme="purple"
                          size="md"
                          cursor="pointer"
                          _hover={{ opacity: 0.8 }}
                        >
                          {t.name}
                        </Tag>
                      ))}
                    </HStack>
                  ) : (
                    <Text fontSize="sm" color={c.subtext} fontStyle="italic">
                      No tags on this story.
                    </Text>
                  )}
                </TabPanel>

                {/* Series */}
                <TabPanel>
                  {seriesEntries.length > 0 ? (
                    <VStack align="stretch" spacing={4}>
                      {seriesEntries.map((se) => (
                        <SeriesTabContent
                          key={se.series.id}
                          seriesId={se.series.id}
                          seriesTitle={se.series.title}
                          currentStoryId={Number(id)}
                          currentOrder={se.order}
                        />
                      ))}
                    </VStack>
                  ) : (
                    <Text fontSize="sm" color={c.subtext} fontStyle="italic">
                      This story is not part of a series.
                    </Text>
                  )}
                </TabPanel>

                {/* Share */}
                <TabPanel>
                  <VStack align="start" spacing={3}>
                    <Text fontSize="sm" color={c.subtext}>
                      Share this story:
                    </Text>
                    <HStack spacing={2} w="full">
                      <Box
                        flex={1}
                        px={3}
                        py={2}
                        bg={c.inputBg}
                        borderWidth="1px"
                        borderColor={borderColor}
                        rounded="md"
                        fontSize="sm"
                        color={c.subtext}
                        overflow="hidden"
                        textOverflow="ellipsis"
                        whiteSpace="nowrap"
                      >
                        {window.location.href}
                      </Box>
                      <Button
                        size="sm"
                        colorScheme={copied ? "green" : "purple"}
                        leftIcon={<FaCopy />}
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </HStack>
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>

          <SimilarStoriesCard
            tagSlugs={story.tags?.map((tag: any) => tag.slug).filter(Boolean) ?? []}
            currentStoryId={story.id}
          />
        </Box>
      </Flex>
    </Box>
  );
}
