import { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Heading,
  VStack,
  HStack,
  Button,
  Input,
  Textarea,
  Text,
  IconButton,
  Divider,
  Collapse,
  FormControl,
  FormLabel,
  Select,
  Badge,
  Center,
  Spinner,
  Link,
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon, ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import { FaGripVertical } from "react-icons/fa";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import api from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";
import type { SeriesType, StoryType } from "../types/story";

// ------------ Sortable story row inside a series ------------ //
interface SortableStoryRowProps {
  story: StoryType & { order: number };
  seriesId: number;
  onRemove: (storyId: number) => void;
}

function SortableStoryRow({ story, seriesId: _seriesId, onRemove }: SortableStoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: story.id,
  });
  const c = useColors();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <HStack
      ref={setNodeRef}
      style={style}
      bg={c.cardBg}
      borderWidth="1px"
      borderColor={c.border}
      rounded="md"
      px={3}
      py={2}
      spacing={3}
    >
      <Box color={c.subtext} cursor="grab" {...attributes} {...listeners}>
        <FaGripVertical />
      </Box>
      <Text flex={1} fontSize="sm" fontWeight="medium" color={c.heading} noOfLines={1}>
        <Link as={RouterLink} to={`/stories/${story.id}`} color={c.accent}>
          {story.title}
        </Link>
      </Text>
      <Badge colorScheme="purple" fontSize="xs">#{story.order + 1}</Badge>
      <IconButton
        aria-label="Remove from series"
        icon={<DeleteIcon />}
        size="xs"
        variant="ghost"
        colorScheme="red"
        onClick={() => onRemove(story.id)}
      />
    </HStack>
  );
}

// ------------ Single series card ------------ //
interface SeriesCardProps {
  series: SeriesType & { stories?: (StoryType & { order: number })[] };
  authorStories: StoryType[];
}

function SeriesCard({ series, authorStories }: SeriesCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(series.title);
  const [editDesc, setEditDesc] = useState(series.description ?? "");
  const [addStoryId, setAddStoryId] = useState<string>("");
  const [localStories, setLocalStories] = useState<(StoryType & { order: number })[]>([]);
  const [storiesLoaded, setStoriesLoaded] = useState(false);
  const queryClient = useQueryClient();
  const c = useColors();

  const sensors = useSensors(useSensor(PointerSensor));

  // Fetch full series detail (with stories) when expanded
  const { isLoading: loadingDetail, data: seriesDetail } = useQuery({
    queryKey: ["series-detail", series.id],
    queryFn: () => api.get(`/series/${series.id}`).then((r) => r.data),
    enabled: expanded,
  });

  useEffect(() => {
    if (seriesDetail) {
      setLocalStories((seriesDetail as any).stories ?? []);
      setStoriesLoaded(true);
    }
  }, [seriesDetail]);

  const updateMutation = useMutation({
    mutationFn: (body: { title?: string; description?: string }) =>
      api.put(`/series/${series.id}`, body),
    onSuccess: () => {
      toast.success("Series updated");
      queryClient.invalidateQueries({ queryKey: ["my-series"] });
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/series/${series.id}`),
    onSuccess: () => {
      toast.success("Series deleted");
      queryClient.invalidateQueries({ queryKey: ["my-series"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to delete"),
  });

  const addStoryMutation = useMutation({
    mutationFn: (storyId: number) => api.post(`/series/${series.id}/stories`, { storyId }),
    onSuccess: () => {
      toast.success("Story added to series");
      queryClient.invalidateQueries({ queryKey: ["series-detail", series.id] });
      queryClient.invalidateQueries({ queryKey: ["my-series"] });
      setStoriesLoaded(false);
      setAddStoryId("");
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to add story"),
  });

  const removeStoryMutation = useMutation({
    mutationFn: (storyId: number) =>
      api.delete(`/series/${series.id}/stories/${storyId}`),
    onSuccess: () => {
      toast.success("Story removed");
      queryClient.invalidateQueries({ queryKey: ["series-detail", series.id] });
      queryClient.invalidateQueries({ queryKey: ["my-series"] });
      setStoriesLoaded(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to remove story"),
  });

  const reorderMutation = useMutation({
    mutationFn: (items: { storyId: number; order: number }[]) =>
      api.put(`/series/${series.id}/stories/reorder`, items),
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to save order"),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalStories((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
      reorderMutation.mutate(reordered.map((s) => ({ storyId: s.id, order: s.order })));
      return reordered;
    });
  };

  // Stories already in this series (by id)
  const inSeriesIds = new Set(localStories.map((s) => s.id));
  const availableToAdd = authorStories.filter((s) => !inSeriesIds.has(s.id));

  return (
    <Box borderWidth="1px" borderColor={c.border} rounded="lg" overflow="hidden">
      {/* Series header */}
      <HStack
        px={4}
        py={3}
        bg={c.cardBg}
        justify="space-between"
        cursor="pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <VStack align="start" spacing={0} flex={1}>
          <Text fontWeight="semibold" color={c.heading}>
            {series.title}
          </Text>
          {series.description && (
            <Text fontSize="xs" color={c.subtext} noOfLines={1}>
              {series.description}
            </Text>
          )}
        </VStack>
        <HStack spacing={2}>
          <Badge colorScheme="purple">{series._count?.stories ?? 0} stories</Badge>
          <IconButton
            aria-label="Edit series"
            icon={<EditIcon />}
            size="xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
              setEditing(true);
            }}
          />
          <IconButton
            aria-label="Delete series"
            icon={<DeleteIcon />}
            size="xs"
            variant="ghost"
            colorScheme="red"
            isLoading={deleteMutation.isPending}
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete series "${series.title}"?`)) deleteMutation.mutate();
            }}
          />
          {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </HStack>
      </HStack>

      <Collapse in={expanded} animateOpacity>
        <Box px={4} pb={4} pt={2} bg={c.pageBg}>
          {/* Edit form */}
          {editing && (
            <Box mb={4}>
              <FormControl mb={2}>
                <FormLabel fontSize="sm">Title</FormLabel>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  size="sm"
                  bg={c.inputBg}
                  borderColor={c.border}
                />
              </FormControl>
              <FormControl mb={3}>
                <FormLabel fontSize="sm">Description</FormLabel>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  size="sm"
                  rows={2}
                  bg={c.inputBg}
                  borderColor={c.border}
                />
              </FormControl>
              <HStack>
                <Button
                  size="sm"
                  colorScheme="purple"
                  isLoading={updateMutation.isPending}
                  onClick={() =>
                    updateMutation.mutate({ title: editTitle, description: editDesc })
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </HStack>
              <Divider my={3} />
            </Box>
          )}

          {/* Story list */}
          {loadingDetail && !storiesLoaded ? (
            <Center py={4}>
              <Spinner size="sm" color={c.accent} />
            </Center>
          ) : localStories.length === 0 ? (
            <Text fontSize="sm" color={c.subtext} mb={3}>
              No stories yet. Add one below.
            </Text>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={localStories.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <VStack spacing={2} mb={3} align="stretch">
                  {localStories.map((s) => (
                    <SortableStoryRow
                      key={s.id}
                      story={s}
                      seriesId={series.id}
                      onRemove={(storyId) => removeStoryMutation.mutate(storyId)}
                    />
                  ))}
                </VStack>
              </SortableContext>
            </DndContext>
          )}

          {/* Add story */}
          {availableToAdd.length > 0 && (
            <HStack mt={2}>
              <Select
                size="sm"
                placeholder="Add a story…"
                value={addStoryId}
                onChange={(e) => setAddStoryId(e.target.value)}
                bg={c.inputBg}
                borderColor={c.border}
                flex={1}
              >
                {availableToAdd.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                colorScheme="purple"
                isDisabled={!addStoryId}
                isLoading={addStoryMutation.isPending}
                onClick={() => addStoryMutation.mutate(Number(addStoryId))}
              >
                Add
              </Button>
            </HStack>
          )}
          {availableToAdd.length === 0 && storiesLoaded && (
            <Text fontSize="xs" color={c.subtext} mt={2}>
              All your stories are in this series.
            </Text>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

// ------------ Main Page ------------ //
export default function SeriesManage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const c = useColors();

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: mySeries, isLoading } = useQuery<SeriesType[]>({
    queryKey: ["my-series"],
    queryFn: () => api.get(`/series?authorId=${user?.id}`).then((r) => r.data),
    enabled: !!user,
  });

  // Fetch author's stories for the "add story" dropdown
  const { data: authorStoriesData } = useQuery({
    queryKey: ["author-stories-for-series", user?.id],
    queryFn: () =>
      api.get(`/stories?author=${user?.username}&limit=50`).then((r) => r.data),
    enabled: !!user,
  });
  const authorStories: StoryType[] = authorStoriesData?.stories ?? [];

  const createMutation = useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      api.post("/series", body),
    onSuccess: () => {
      toast.success("Series created!");
      queryClient.invalidateQueries({ queryKey: ["my-series"] });
      setNewTitle("");
      setNewDesc("");
      setCreating(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.error || "Failed to create series"),
  });

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle.trim(), description: newDesc.trim() || undefined });
  };

  return (
    <Box maxW="2xl" mx="auto">
      <HStack justify="space-between" mb={6}>
        <Heading size="lg" color={c.heading}>
          My Series
        </Heading>
        <Button
          size="sm"
          colorScheme="purple"
          onClick={() => setCreating((v) => !v)}
        >
          {creating ? "Cancel" : "+ New Series"}
        </Button>
      </HStack>

      <Collapse in={creating} animateOpacity>
        <Box bg={c.cardBg} p={4} rounded="lg" borderWidth="1px" borderColor={c.border} mb={6}>
          <Heading size="sm" mb={3} color={c.heading}>
            Create New Series
          </Heading>
          <FormControl mb={3} isRequired>
            <FormLabel fontSize="sm">Title</FormLabel>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Series title"
              bg={c.inputBg}
              borderColor={c.border}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </FormControl>
          <FormControl mb={3}>
            <FormLabel fontSize="sm">Description (optional)</FormLabel>
            <Textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="A short description of the series"
              rows={2}
              bg={c.inputBg}
              borderColor={c.border}
            />
          </FormControl>
          <Button
            colorScheme="purple"
            isLoading={createMutation.isPending}
            isDisabled={!newTitle.trim()}
            onClick={handleCreate}
          >
            Create
          </Button>
        </Box>
      </Collapse>

      {isLoading ? (
        <Center py={12}>
          <Spinner size="xl" color={c.accent} />
        </Center>
      ) : mySeries?.length === 0 ? (
        <Center py={12}>
          <VStack spacing={2}>
            <Text color={c.subtext}>You haven't created any series yet.</Text>
            <Button size="sm" colorScheme="purple" onClick={() => setCreating(true)}>
              Create your first series
            </Button>
          </VStack>
        </Center>
      ) : (
        <VStack spacing={4} align="stretch">
          {mySeries?.map((s) => (
            <SeriesCard key={s.id} series={s} authorStories={authorStories} />
          ))}
        </VStack>
      )}
    </Box>
  );
}
