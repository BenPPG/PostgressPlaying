import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Center,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Tag,
  Text,
  VStack,
  Spinner,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import api from "../api/client";
import StoryGrid from "../components/StoryGrid";
import PaginatedStoryList from "../components/PaginatedStoryList";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";
import type { TagType, StoryType, StoriesResponse } from "../types/story";

export default function Home() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "popular">("recent");

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags").then((r) => r.data),
  });

  const { data, isLoading, isError } = useQuery<StoriesResponse, unknown, StoriesResponse>({
    queryKey: ["stories", page, search, activeTag],
    queryFn: async () => {
      const response = await api.get<StoriesResponse>("/stories", {
        params: {
          page,
          limit: 12,
          search: search || undefined,
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

  const sortedStories = useMemo(() => {
    if (sortBy === "popular") {
      return [...stories].sort(
        (a, b) =>
          b.viewsCount + b._count.likes + b._count.comments -
          (a.viewsCount + a._count.likes + a._count.comments)
      );
    }
    return stories;
  }, [stories, sortBy]);

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
        <Stat bg={c.cardBg} borderRadius="lg" p={4} shadow="sm" borderWidth="1px" borderColor={c.borderSubtle}>
          <StatLabel>Total stories</StatLabel>
          <StatNumber>{stats.totalStories}</StatNumber>
          <StatHelpText>Published stories in the current filter</StatHelpText>
        </Stat>
        <Stat bg={c.cardBg} borderRadius="lg" p={4} shadow="sm" borderWidth="1px" borderColor={c.borderSubtle}>
          <StatLabel>Tags</StatLabel>
          <StatNumber>{stats.totalTags}</StatNumber>
          <StatHelpText>Choose a category</StatHelpText>
        </Stat>
        <Stat bg={c.cardBg} borderRadius="lg" p={4} shadow="sm" borderWidth="1px" borderColor={c.borderSubtle}>
          <StatLabel>Top authors</StatLabel>
          <StatNumber>{stats.totalAuthors}</StatNumber>
          <StatHelpText>Active in this page set</StatHelpText>
        </Stat>
      </SimpleGrid>

      <Stack direction={{ base: "column", md: "row" }} align="center" spacing={3} mb={4}>
        <InputGroup maxW="xl">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search stories..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            bg={c.inputBg}
          />
        </InputGroup>
        <Select
          maxW="xs"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "recent" | "popular")}
          bg={c.inputBg}
          borderColor={c.border}
        >
          <option value="recent">Newest</option>
          <option value="popular">Most Popular</option>
        </Select>
      </Stack>

      {tagsData && tagsData.length > 0 && (
        <HStack mb={6} flexWrap="wrap" spacing={2}>
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
            stories={sortedStories}
            page={page}
            totalPages={stats.totalPages}
            onPageChange={setPage}
            noStoriesText="No stories found for all stories."
          />

          <Box>
            <Heading size="md" mb={3}>
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
