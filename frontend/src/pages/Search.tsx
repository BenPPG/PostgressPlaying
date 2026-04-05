import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Center,
  Divider,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Spinner,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { FiTag } from "react-icons/fi";
import api from "../api/client";
import StoryCard from "../components/StoryCard";
import { useColors } from "../hooks/useColors";
import type { StoryType, CursorStoriesResponse } from "../types/story";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const initialTags = searchParams.get("tag")?.split(",").filter(Boolean) ?? [];
  const initialAuthor = searchParams.get("author") ?? "";
  const initialSort = searchParams.get("sort") === "popular" ? "popular" : "recent";

  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [searchText, setSearchText] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [tagSearch, setTagSearch] = useState("");
  const [authorText, setAuthorText] = useState(initialAuthor);
  const [author, setAuthor] = useState(initialAuthor);
  const [sortBy, setSortBy] = useState<"recent" | "popular">(initialSort);
  const c = useColors();

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const tagParam = searchParams.get("tag")?.split(",").filter(Boolean) ?? [];
    const authorParam = searchParams.get("author") ?? "";
    const sortParam = searchParams.get("sort") === "popular" ? "popular" : "recent";

    setSearchText(q);
    setSearch(q);
    setSelectedTags(tagParam);
    setAuthorText(authorParam);
    setAuthor(authorParam);
    setSortBy(sortParam);
    setCursor(null);
    setCursorStack([]);
  }, [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchText);
      setCursor(null);
      setCursorStack([]);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAuthor(authorText);
      setCursor(null);
      setCursorStack([]);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [authorText]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (selectedTags.length > 0) params.set("tag", selectedTags.join(","));
    if (author) params.set("author", author);
    if (sortBy !== "recent") params.set("sort", sortBy);
    setSearchParams(params, { replace: true });
  }, [search, selectedTags, author, sortBy, setSearchParams]);

  const { data, isLoading, isError } = useQuery<CursorStoriesResponse>({
    queryKey: ["stories-cursor", cursor, search, selectedTags, author],
    queryFn: async () => {
      const response = await api.get<CursorStoriesResponse>("/stories", {
        params: {
          cursor: cursor ?? "",
          limit: 12,
          search: search || undefined,
          tag: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
          author: author || undefined,
        },
      });
      return response.data;
    },
    placeholderData: keepPreviousData,
  });

  const { data: tagsData } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags").then((r) => r.data),
  });

  const stories = useMemo<StoryType[]>(() => data?.stories ?? [], [data?.stories]);

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

  return (
    <Box>
      <Box bgGradient="linear(to-r, purple.500, purple.600)" borderRadius="xl" color="white" p={8} mb={6}>
        <Stack direction={{ base: "column", md: "row" }} align="center" justify="space-between" spacing={4}>
          <Box>
            <Heading size="xl" mb={2}>
              Search Novara stories
            </Heading>
            <Text fontSize="lg" maxW="2xl" color="gray.100">
              Find stories by keyword, author, tag, or mood across the entire library.
            </Text>
          </Box>
        </Stack>
      </Box>

      <Box
        bg={c.cardBg}
        border="1px solid"
        borderColor={c.border}
        borderRadius="xl"
        boxShadow="sm"
        p={5}
        mb={6}
      >
        <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4}>
          <InputGroup flex={1}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Search stories..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              bg={c.inputBg}
              borderColor={c.border}
              _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px var(--chakra-colors-purple-400)" }}
            />
          </InputGroup>

          <Input
            placeholder="Filter by author..."
            value={authorText}
            onChange={(e) => setAuthorText(e.target.value)}
            bg={c.inputBg}
            borderColor={c.border}
            maxW={{ base: "full", md: "56" }}
            _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px var(--chakra-colors-purple-400)" }}
          />

          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "recent" | "popular")}
            bg={c.inputBg}
            borderColor={c.border}
            maxW={{ base: "full", md: "44" }}
          >
            <option value="recent">Newest</option>
            <option value="popular">Most Popular</option>
          </Select>
        </Stack>

        <Divider borderColor={c.borderSubtle} mb={4} />

        <HStack mb={3} spacing={2}>
          <Icon as={FiTag} color="purple.400" boxSize={4} />
          <Text
            fontWeight="semibold"
            fontSize="xs"
            color={c.subtext}
            letterSpacing="wider"
            textTransform="uppercase"
          >
            Filter by Tag
          </Text>
        </HStack>

        <InputGroup maxW="sm" mb={3}>
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search tags..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            bg={c.inputBg}
            borderColor={c.border}
            size="sm"
            borderRadius="md"
          />
        </InputGroup>

        {selectedTags.length > 0 && (
          <HStack flexWrap="wrap" spacing={2} mb={3}>
            {selectedTags.map((slug) => {
              const tagItem = tagsData?.find((t: any) => t.slug === slug);
              return tagItem ? (
                <Tag key={slug} size="md" colorScheme="purple" borderRadius="full">
                  <TagLabel>{tagItem.name}</TagLabel>
                  <TagCloseButton
                    onClick={() => {
                      setSelectedTags((prev) => prev.filter((s) => s !== slug));
                      setCursor(null);
                      setCursorStack([]);
                    }}
                  />
                </Tag>
              ) : null;
            })}
          </HStack>
        )}

        <Wrap spacing={2}>
          {(tagsData ?? [])
            .filter((t: any) =>
              t.name.toLowerCase().includes(tagSearch.toLowerCase())
            )
            .map((t: any) => (
              <WrapItem key={t.id}>
                <Tag
                  size="sm"
                  variant={selectedTags.includes(t.slug) ? "solid" : "subtle"}
                  colorScheme="purple"
                  cursor="pointer"
                  borderRadius="full"
                  transition="all 0.15s"
                  _hover={{ opacity: 0.85 }}
                  onClick={() => {
                    setSelectedTags((prev) =>
                      prev.includes(t.slug)
                        ? prev.filter((s) => s !== t.slug)
                        : [...prev, t.slug]
                    );
                    setCursor(null);
                    setCursorStack([]);
                  }}
                >
                  <TagLabel>{t.name}</TagLabel>
                  {selectedTags.includes(t.slug) && (
                    <TagCloseButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTags((prev) => prev.filter((s) => s !== t.slug));
                        setCursor(null);
                        setCursorStack([]);
                      }}
                    />
                  )}
                </Tag>
              </WrapItem>
            ))}
        </Wrap>
      </Box>

      {isLoading ? (
        <Center py={12}>
          <Spinner size="xl" color="purple.500" />
        </Center>
      ) : isError ? (
        <Center py={12}>
          <Text color="red.500">Unable to load search results. Please try again.</Text>
        </Center>
      ) : (
        <VStack align="stretch" spacing={4}>
          <Heading size="md" color={c.heading}>
            {search ? `Search results for "${search}"` : "Browse stories"}
          </Heading>
          {sortedStories.length === 0 ? (
            <Text color={c.subtext}>
              {search ? "No stories matched your search." : "Enter a search term to begin."}
            </Text>
          ) : (
            <VStack align="stretch" spacing={3}>
              {sortedStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </VStack>
          )}
          <HStack justify="center" spacing={2} pt={2}>
            <Button
              size="sm"
              onClick={() => {
                const prevCursor = cursorStack[cursorStack.length - 1] ?? null;
                setCursor(prevCursor || null);
                setCursorStack((prev) => prev.slice(0, -1));
              }}
              isDisabled={cursorStack.length === 0}
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (data?.nextCursor) {
                  setCursorStack((prev) => [...prev, cursor ?? ""]);
                  setCursor(data.nextCursor);
                }
              }}
              isDisabled={!data?.hasMore}
            >
              Next
            </Button>
          </HStack>
        </VStack>
      )}
    </Box>
  );
}
