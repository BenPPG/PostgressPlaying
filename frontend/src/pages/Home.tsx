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
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
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
  const [feedPage, setFeedPage] = useState(1);
  const [activeSection, setActiveSection] = useState<"discover" | "following">("discover");

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

  const { data: feedData, isLoading: feedLoading } = useQuery<StoriesResponse>({
    queryKey: ["feed", feedPage],
    queryFn: () =>
      api.get<StoriesResponse>("/stories/feed", { params: { page: feedPage, limit: 12 } }).then((r) => r.data),
    enabled: !!user && activeSection === "following",
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
        bgGradient="linear(to-br, purple.700, purple.500, pink.400)"
        borderRadius="2xl"
        color="white"
        p={{ base: 8, md: 12 }}
        mb={6}
        position="relative"
        overflow="hidden"
      >
        {/* Decorative background blobs */}
        <Box
          position="absolute"
          top="-60px"
          right="-60px"
          w="260px"
          h="260px"
          borderRadius="full"
          bg="whiteAlpha.100"
          pointerEvents="none"
        />
        <Box
          position="absolute"
          bottom="-80px"
          left="38%"
          w="340px"
          h="340px"
          borderRadius="full"
          bg="whiteAlpha.50"
          pointerEvents="none"
        />

        <Stack
          direction={{ base: "column", md: "row" }}
          align="center"
          justify="space-between"
          spacing={8}
          position="relative"
        >
          <Box maxW="xl">
            <Text
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="widest"
              textTransform="uppercase"
              color="whiteAlpha.800"
              mb={3}
            >
              ✦ Storytelling Community
            </Text>
            <Heading size="2xl" mb={4} fontWeight="extrabold" lineHeight="1.15">
              Discover captivating short stories
            </Heading>
            <Text fontSize="md" color="whiteAlpha.900" lineHeight="tall">
              Browse trending content, explore tags, and get inspired by top authors from our storytelling community.
            </Text>
          </Box>

          <VStack spacing={3} align="stretch" minW="168px">
            <Button
              as="a"
              href="#stories"
              size="lg"
              variant="outline"
              borderColor="whiteAlpha.600"
              color="white"
              _hover={{ bg: "whiteAlpha.200", borderColor: "white" }}
            >
              Start Browsing
            </Button>
            {user && (
              <Button
                as="a"
                href="/stories/new"
                size="lg"
                bg={c.ctaBg}
                color="white"
                fontWeight="bold"
                _hover={{ bg: c.ctaBgHover, transform: "translateY(-1px)" }}
                transition="all 0.2s"
              >
                Write a Story
              </Button>
            )}
          </VStack>
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
          <Text fontSize="sm" fontWeight="semibold" color={c.accent} mb={3}>
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
          <Text fontSize="sm" fontWeight="semibold" color={c.accent} mb={3}>
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
          <Text fontSize="sm" fontWeight="semibold" color={c.accent} mb={3}>
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

      <Tabs
        colorScheme="purple"
        index={user && activeSection === "following" ? 1 : 0}
        onChange={(i) => {
          if (!user) return;
          setActiveSection(i === 1 ? "following" : "discover");
        }}
      >
        {user && (
          <TabList mb={4}>
            <Tab>Discover</Tab>
            <Tab>Following</Tab>
          </TabList>
        )}
        <TabPanels>
          {/* Discover tab */}
          <TabPanel px={0} py={0}>
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
                <Spinner size="xl" color={c.accent} />
              </Center>
            ) : isError ? (
              <Center py={12}>
                <Text color={c.error}>Failed to load stories. Please refresh.</Text>
              </Center>
            ) : stories.length === 0 ? (
              <Center py={12}>
                <Text color={c.subtext}>No stories found for current filters.</Text>
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
          </TabPanel>

          {/* Following tab */}
          <TabPanel px={0} py={0}>
            {feedLoading ? (
              <Center py={12}>
                <Spinner size="xl" color={c.accent} />
              </Center>
            ) : !feedData || feedData.stories.length === 0 ? (
              <Center py={12}>
                <VStack spacing={3}>
                  <Text color={c.subtext} fontSize="lg">
                    Your following feed is empty.
                  </Text>
                  <Text color={c.meta} fontSize="sm">
                    Visit an author's profile and hit Follow to see their stories here.
                  </Text>
                </VStack>
              </Center>
            ) : (
              <PaginatedStoryList
                title={`Stories from people you follow (${feedData.total})`}
                stories={feedData.stories}
                page={feedPage}
                totalPages={feedData.totalPages}
                onPageChange={setFeedPage}
                noStoriesText="No stories in your feed."
              />
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
}
