import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Tag,
  Text,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import api from "../api/client";
import StoryGrid from "../components/StoryGrid";
import PaginatedStoryList from "../components/PaginatedStoryList";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";
import type { TagType, StoryType, StoriesResponse } from "../types/story";

export default function Home() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [activeTag, setActiveTag] = useState("");

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags").then((r) => r.data),
  });

  const { data, isLoading, isError } = useQuery<StoriesResponse, unknown, StoriesResponse>({
    queryKey: ["stories", page, activeTag],
    queryFn: async () => {
      const response = await api.get<StoriesResponse>("/stories", {
        params: {
          page,
          limit: 12,
          tag: activeTag || undefined,
        },
      });
      return response.data;
    },
  });

  const stories = useMemo<StoryType[]>(() => data?.stories ?? [], [data?.stories]);

  const featuredStories = useMemo(() => {
    return [...stories]
      .sort(
        (a, b) =>
          b.viewsCount + b._count.likes + b._count.comments -
          (a.viewsCount + a._count.likes + a._count.comments)
      )
      .slice(0, 3);
  }, [stories]);

  const trendingStories = useMemo(() => {
    return [...stories]
      .sort(
        (a, b) =>
          b.viewsCount + b._count.likes + b._count.comments -
          (a.viewsCount + a._count.likes + a._count.comments)
      )
      .slice(0, 6);
  }, [stories]);

  const navigate = useNavigate();

  const randomStory = useMemo(() => {
    if (stories.length === 0) return null;
    return stories[Math.floor(Math.random() * stories.length)];
  }, [stories]);

  const topAuthors = useMemo(() => {
    const countMap = new Map<string, number>();
    stories.forEach((story) => {
      const name = story.author?.username ?? story.authorUsername ?? "Unknown";
      countMap.set(name, (countMap.get(name) ?? 0) + 1);
    });
    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [stories]);

  const c = useColors();

  const stats = {
    totalStories: data?.total ?? 0,
    totalTags: tagsData?.length ?? 0,
    totalAuthors: topAuthors.length,
    currentPage: data?.page ?? 1,
    totalPages: data?.totalPages ?? 1,
  };

  return (
    <Box>
      <Box
        bgGradient="linear(to-r, purple.500, purple.600)"
        borderRadius="xl"
        color="white"
        p={8}
        mb={6}
      >
        <Stack direction={{ base: "column", md: "row" }} align="center" justify="space-between" spacing={4}>
          <Box>
            <Heading size="xl" mb={2}>
              Discover captivating short stories
            </Heading>
            <Text fontSize="lg" maxW="2xl" color="gray.100">
              Browse trending content, explore tags, and get inspired by top authors from our storytelling community.
            </Text>
          </Box>
          <HStack>
            <Button
              as="a"
              href="#stories"
              colorScheme="whiteAlpha"
              variant="outline"
              borderColor="white"
              _hover={{ bg: "whiteAlpha.200" }}
            >
              Start Browsing
            </Button>
            {user && (
              <Button as="a" href="/stories/new" colorScheme="orange" bg="orange.400" _hover={{ bg: "orange.500" }}>
                Write a Story
              </Button>
            )}
          </HStack>
        </Stack>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={6}>
        <Box
          bg={c.cardBg}
          borderRadius="xl"
          p={6}
          shadow="md"
          borderWidth="1px"
          borderColor={c.borderSubtle}
          cursor="pointer"
          transition="all 0.2s ease"
          _hover={{ transform: "translateY(-4px)", shadow: "lg", bg: c.hoverBg }}
          onClick={() => navigate("/search")}
        >
          <Text fontSize="sm" fontWeight="semibold" color="purple.500" mb={3}>
            Search stories
          </Text>
          <Heading size="md" mb={2}>
            Find your next read
          </Heading>
          <Text color={c.subtext} mb={4}>
            Search across {stats.totalStories} stories, filter by tags, and uncover hidden gems.
          </Text>
        </Box>

        <Box
          bg={c.cardBg}
          borderRadius="xl"
          p={6}
          shadow="md"
          borderWidth="1px"
          borderColor={c.borderSubtle}
          cursor="pointer"
          transition="all 0.2s ease"
          _hover={{ transform: "translateY(-4px)", shadow: "lg", bg: c.hoverBg }}
          onClick={() => {
            const element = document.getElementById("top-authors");
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
        >
          <Text fontSize="sm" fontWeight="semibold" color="purple.500" mb={3}>
            Top authors
          </Text>
          <Heading size="md" mb={2}>
            Meet the best writers
          </Heading>
          <Text color={c.subtext} mb={4}>
            Browse the most active authors on this page and follow their latest stories.
          </Text>
        </Box>

        <Box
          bg={c.cardBg}
          borderRadius="xl"
          p={6}
          shadow="md"
          borderWidth="1px"
          borderColor={c.borderSubtle}
          cursor={randomStory ? "pointer" : "not-allowed"}
          transition="all 0.2s ease"
          _hover={randomStory ? { transform: "translateY(-4px)", shadow: "lg", bg: c.hoverBg } : undefined}
          onClick={() => randomStory && navigate(`/stories/${randomStory.id}`)}
          opacity={randomStory ? 1 : 0.65}
        >
          <Text fontSize="sm" fontWeight="semibold" color="purple.500" mb={3}>
            Random story
          </Text>
          <Heading size="md" mb={2}>
            Surprise me
          </Heading>
          <Text color={c.subtext} mb={4}>
            Jump to a random story from the current list and discover something unexpected.
          </Text>
        </Box>
      </SimpleGrid>

      {tagsData && tagsData.length > 0 && (
        <HStack mb={4} flexWrap="wrap" spacing={2}>
          <Tag
            size="md"
            variant={activeTag === "" ? "solid" : "outline"}
            colorScheme="purple"
            cursor="pointer"
            onClick={() => {
              setActiveTag("");
              setPage(1);
            }}
          >
            All
          </Tag>
          {tagsData.map((t: TagType) => (
            <Tag
              key={t.id}
              size="md"
              variant={activeTag === t.slug ? "solid" : "outline"}
              colorScheme="purple"
              cursor="pointer"
              onClick={() => {
                setActiveTag(t.slug);
                setPage(1);
              }}
            >
              {t.name}
            </Tag>
          ))}
        </HStack>
      )}

      {isLoading ? (
        <Center py={12}>
          <Spinner size="xl" color="purple.500" />
        </Center>
      ) : isError ? (
        <Center py={12}>
          <Text color="red.500">Failed to load stories. Please refresh.</Text>
        </Center>
      ) : stories.length === 0 ? (
        <Center py={12}>
          <Text color="gray.500">No stories found for current filters.</Text>
        </Center>
      ) : (
        <VStack align="stretch" spacing={8} id="stories">
          <StoryGrid title="Featured Stories" stories={featuredStories} columns={{ base: 1, md: 3 }} noStoriesText="No featured stories." />

          <StoryGrid title="Trending Right Now" stories={trendingStories} columns={{ base: 1, md: 2, lg: 3 }} noStoriesText="No trending stories." />

          <PaginatedStoryList
            title={`All Stories (${stats.totalStories})`}
            stories={stories}
            page={page}
            totalPages={stats.totalPages}
            onPageChange={setPage}
            noStoriesText="No stories found for all stories."
          />

          <Box>
            <Heading id="top-authors" size="md" mb={3}>
              Authors on this page
            </Heading>
            <HStack wrap="wrap" spacing={2}>
              {topAuthors.map(([author, count]) => (
                <Tag key={author} size="md" colorScheme="teal" borderRadius="full">
                  {author} ({count})
                </Tag>
              ))}
            </HStack>
          </Box>
        </VStack>
      )}
    </Box>
  );
}
