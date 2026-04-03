import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Select,
  VStack,
  Alert,
  AlertIcon,
  HStack,
  Tag,
  TagLabel,
  TagCloseButton,
  Center,
  Spinner,
} from "@chakra-ui/react";
import { toast } from "sonner";
import api from "../api/client";
import { useColors } from "../hooks/useColors";

export default function StoryEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const c = useColors();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tagSearch, setTagSearch] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: tags } = useQuery({
    queryKey: ["tags"],
    queryFn: () => api.get("/tags").then((r) => r.data),
  });

  const { data: existingStory, isLoading } = useQuery({
    queryKey: ["story-edit", id],
    queryFn: () => api.get(`/stories/${id}`).then((r) => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingStory) {
      setTitle(existingStory.title);
      setSummary(existingStory.summary || "");
      setContent(existingStory.content);
      setStatus(existingStory.status);
      setSelectedTagIds(existingStory.tags?.map((t: any) => t.id) || []);
    }
  }, [existingStory]);

  const selectedTags = tags?.filter((t: any) => selectedTagIds.includes(t.id)) || [];
  const filteredTags = tags?.filter((t: any) =>
    t.name.toLowerCase().includes(tagSearch.trim().toLowerCase())
  ) || [];
  const selectedPreview = selectedTags.slice(0, 4);
  const hiddenCount = Math.max(0, selectedTags.length - 4);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || undefined,
        status,
        tagIds: selectedTagIds,
      };
      if (isEdit) {
        await api.put(`/stories/${id}`, payload);
        toast.success("Story updated!");
        navigate(`/stories/${id}`);
      } else {
        const { data } = await api.post("/stories", payload);
        toast.success("Story created!");
        navigate(`/stories/${data.id}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save story");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((t) => t !== tagId);
      }
      if (prev.length >= 4) {
        toast.error("You can select up to 4 tags");
        return prev;
      }
      return [...prev, tagId];
    });
  };

  const addTagFromInput = async () => {
    const name = tagSearch.trim();
    if (!name) {
      toast.error("Tag name cannot be empty");
      return;
    }

    try {
      const existing = tags?.find((t: any) => t.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        if (!selectedTagIds.includes(existing.id)) {
          toggleTag(existing.id);
        }
        setTagSearch("");
        return;
      }

      const { data: createdTag } = await api.post("/tags", { name });
      queryClient.invalidateQueries({ queryKey: ["tags"] });

      if (!selectedTagIds.includes(createdTag.id)) {
        toggleTag(createdTag.id);
      }
      setTagSearch("");
      toast.success("New tag added");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create tag");
    }
  };

  if (isEdit && isLoading) {
    return (
      <Center py={12}>
        <Spinner size="xl" color="purple.500" />
      </Center>
    );
  }

  const bgColor = c.cardBg;
  const borderColorMd = c.border;
  const headingColor = c.heading;

  return (
    <Box maxW="3xl" mx="auto">
      <Heading size="lg" mb={6} color={headingColor}>
        {isEdit ? "Edit Story" : "Write a New Story"}
      </Heading>

      <Box bg={bgColor} p={8} rounded="lg" borderWidth="1px" borderColor={borderColorMd} shadow="sm">
        {error && (
          <Alert status="error" mb={4} rounded="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <VStack spacing={5} align="stretch">
            <FormControl isRequired>
              <FormLabel>Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your story title"
                maxLength={200}
                bg={c.inputBg}
                borderColor={c.border}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Summary</FormLabel>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="A short summary (optional)"
                maxLength={500}
                rows={2}
                bg={c.inputBg}
                borderColor={c.border}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Content</FormLabel>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your story here..."
                rows={16}
                resize="vertical"
                bg={c.inputBg}
                borderColor={c.border}
              />
            </FormControl>

            <FormControl>
              <FormLabel>Status</FormLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                maxW="xs"
                bg={c.inputBg}
                borderColor={c.border}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>Tags</FormLabel>

              <HStack spacing={2} mb={3} alignItems="center">
                <Input
                  placeholder="Search existing tags or type to add"
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  maxW="md"
                  bg={c.inputBg}
                  borderColor={c.border}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTagFromInput();
                    }
                  }}
                />
                <Button
                  colorScheme="purple"
                  onClick={addTagFromInput}
                  isDisabled={!tagSearch.trim()}
                >
                  +
                </Button>
              </HStack>

              <HStack flexWrap="wrap" spacing={2} mb={2}>
                {selectedPreview.map((t: any) => (
                  <Tag key={t.id} size="md" colorScheme="purple">
                    <TagLabel>{t.name}</TagLabel>
                    <TagCloseButton
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTag(t.id);
                      }}
                    />
                  </Tag>
                ))}
                {hiddenCount > 0 && (
                  <Tag size="md" variant="outline" colorScheme="purple">
                    +{hiddenCount} more
                  </Tag>
                )}
              </HStack>

              <HStack flexWrap="wrap" spacing={2}>
                {filteredTags.length === 0 ? (
                  <Tag variant="subtle" colorScheme="gray">
                    No tags found
                  </Tag>
                ) : (
                  filteredTags.map((t: any) => (
                    <Tag
                      key={t.id}
                      size="md"
                      variant={selectedTagIds.includes(t.id) ? "solid" : "outline"}
                      colorScheme="purple"
                      cursor="pointer"
                      onClick={() => toggleTag(t.id)}
                    >
                      <TagLabel>{t.name}</TagLabel>
                      {selectedTagIds.includes(t.id) && (
                        <TagCloseButton
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTag(t.id);
                          }}
                        />
                      )}
                    </Tag>
                  ))
                )}
              </HStack>
            </FormControl>

            <Button type="submit" colorScheme="purple" size="lg" isLoading={submitting}>
              {isEdit ? "Update Story" : "Publish Story"}
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
}
