import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Center,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import api from "../api/client";
import PaginatedStoryList from "../components/PaginatedStoryList";
import { useColors } from "../hooks/useColors";
import type { StoryType, StoriesResponse } from "../types/story";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get("q") ?? "";
  const initialPage = Number(searchParams.get("page") ?? "1");
  const initialTag = searchParams.get("tag") ?? "";
  const initialAuthor = searchParams.get("author") ?? "";
  const initialSort = searchParams.get("sort") === "popular" ? "popular" : "recent";

  const [page, setPage] = useState(initialPage >= 1 ? initialPage : 1);
  const [searchText, setSearchText] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [tag, setTag] = useState(initialTag);
  const [authorText, setAuthorText] = useState(initialAuthor);
  const [author, setAuthor] = useState(initialAuthor);
  const [sortBy, setSortBy] = useState<"recent" | "popular">(initialSort);
  const c = useColors();

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const pageParam = Number(searchParams.get("page") ?? "1");
    const tagParam = searchParams.get("tag") ?? "";
    const authorParam = searchParams.get("author") ?? "";
    const sortParam = searchParams.get("sort") === "popular" ? "popular" : "recent";

    setSearchText(q);
    setSearch(q);
    setPage(!Number.isNaN(pageParam) && pageParam >= 1 ? pageParam : 1);
    setTag(tagParam);
    setAuthorText(authorParam);
    setAuthor(authorParam);
    setSortBy(sortParam);
  }, [searchParams]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchText);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setAuthor(authorText);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [authorText]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (page > 1) params.set("page", String(page));
    if (tag) params.set("tag", tag);
    if (author) params.set("author", author);
    if (sortBy !== "recent") params.set("sort", sortBy);
    setSearchParams(params, { replace: true });
  }, [page, search, tag, author, sortBy, setSearchParams]);

  const { data, isLoading, isError } = useQuery<StoriesResponse, unknown, StoriesResponse>({
    queryKey: ["stories", page, search, tag, author],
    queryFn: async () => {
      const response = await api.get<StoriesResponse>("/stories", {
        params: {
          page,
          limit: 12,
          search: search || undefined,
          tag: tag || undefined,
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

      <Stack direction={{ base: "column", md: "row" }} align="center" spacing={3} mb={6}>
        <InputGroup maxW="xl">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="Search stories..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
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

      <Stack direction={{ base: "column", md: "row" }} align="center" spacing={3} mb={6}>
        <Select
          maxW="xs"
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            setPage(1);
          }}
          bg={c.inputBg}
          borderColor={c.border}
        >
          <option value="">All tags</option>
          {tagsData?.map((tagItem: { id: number; name: string; slug: string }) => (
            <option key={tagItem.id} value={tagItem.slug}>
              {tagItem.name}
            </option>
          ))}
        </Select>

        <Input
          placeholder="Filter by author"
          value={authorText}
          onChange={(e) => {
            setAuthorText(e.target.value);
            setPage(1);
          }}
          bg={c.inputBg}
          maxW="xl"
        />
      </Stack>

      {isLoading ? (
        <Center py={12}>
          <Spinner size="xl" color="purple.500" />
        </Center>
      ) : isError ? (
        <Center py={12}>
          <Text color="red.500">Unable to load search results. Please try again.</Text>
        </Center>
      ) : (
        <PaginatedStoryList
          title={search ? `Search results for "${search}"` : "Search results"}
          stories={sortedStories}
          page={data?.page ?? page}
          totalPages={data?.totalPages ?? 1}
          onPageChange={setPage}
          noStoriesText={search ? "No stories matched your search." : "Enter a search term to begin."}
        />
      )}
    </Box>
  );
}
