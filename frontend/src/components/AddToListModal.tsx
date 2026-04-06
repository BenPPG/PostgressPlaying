import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Checkbox,
  Divider,
  Input,
  Textarea,
  Switch,
  FormControl,
  FormLabel,
  Spinner,
  Center,
  useToast,
  Badge,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { FaLock, FaGlobeAmericas } from "react-icons/fa";
import api from "../api/client";
import { useColors } from "../hooks/useColors";

interface StoryList {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  isDefault: boolean;
  _count: { items: number };
}

interface AddToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: number;
  storyTitle: string;
}

export default function AddToListModal({ isOpen, onClose, storyId, storyTitle }: AddToListModalProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const c = useColors();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPublic, setNewPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch user's lists
  const { data: lists = [], isLoading: listsLoading } = useQuery<StoryList[]>({
    queryKey: ["my-lists"],
    queryFn: () => api.get("/lists/my").then((r) => r.data),
    enabled: isOpen,
  });

  // Fetch which lists already contain this story
  const { data: checkedIds = [], isLoading: checkedLoading } = useQuery<number[]>({
    queryKey: ["my-lists-story", storyId],
    queryFn: () => api.get(`/lists/my/story/${storyId}`).then((r) => r.data),
    enabled: isOpen,
  });

  const addToList = useMutation({
    mutationFn: (listId: number) => api.post(`/lists/${listId}/stories`, { storyId }),
    onSuccess: (_, listId) => {
      queryClient.setQueryData<number[]>(["my-lists-story", storyId], (prev = []) =>
        prev.includes(listId) ? prev : [...prev, listId]
      );
    },
  });

  const removeFromList = useMutation({
    mutationFn: (listId: number) => api.delete(`/lists/${listId}/stories/${storyId}`),
    onSuccess: (_, listId) => {
      queryClient.setQueryData<number[]>(["my-lists-story", storyId], (prev = []) =>
        prev.filter((id) => id !== listId)
      );
    },
  });

  const createList = useMutation({
    mutationFn: (data: { name: string; description: string; isPublic: boolean }) =>
      api.post("/lists", data).then((r) => r.data as StoryList),
    onSuccess: async (newList) => {
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      // Auto-add the story to the newly created list
      await addToList.mutateAsync(newList.id);
      setShowCreate(false);
      setNewName("");
      setNewDesc("");
      setNewPublic(false);
      toast({ title: `Added to "${newList.name}"`, status: "success", duration: 2000 });
    },
    onError: () => toast({ title: "Failed to create list", status: "error" }),
  });

  async function handleToggle(listId: number, currentlyChecked: boolean) {
    if (currentlyChecked) {
      await removeFromList.mutateAsync(listId);
    } else {
      await addToList.mutateAsync(listId);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createList.mutateAsync({ name: newName.trim(), description: newDesc.trim(), isPublic: newPublic });
    } finally {
      setSaving(false);
    }
  }

  const isLoading = listsLoading || checkedLoading;
  const isMutating = addToList.isPending || removeFromList.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">Save "{storyTitle}" to a list</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {isLoading ? (
            <Center py={6}>
              <Spinner color={c.accent} />
            </Center>
          ) : (
            <VStack align="stretch" spacing={0}>
              {lists.map((list) => {
                const checked = checkedIds.includes(list.id);
                return (
                  <HStack
                    key={list.id}
                    py={2}
                    px={1}
                    spacing={3}
                    _hover={{ bg: c.hoverBg }}
                    rounded="md"
                    cursor="pointer"
                    onClick={() => !isMutating && handleToggle(list.id, checked)}
                  >
                    <Checkbox
                      isChecked={checked}
                      onChange={() => !isMutating && handleToggle(list.id, checked)}
                      colorScheme="purple"
                      pointerEvents="none"
                    />
                    <VStack align="start" spacing={0} flex={1} minW={0}>
                      <HStack spacing={2}>
                        <Text fontSize="sm" fontWeight="medium" color={c.text} noOfLines={1}>
                          {list.name}
                        </Text>
                        {list.isDefault && (
                          <Badge colorScheme="purple" variant="subtle" fontSize="2xs">
                            Default
                          </Badge>
                        )}
                      </HStack>
                      <HStack spacing={1} color={c.meta} fontSize="xs">
                        {list.isPublic ? <FaGlobeAmericas size={10} /> : <FaLock size={10} />}
                        <Text>{list._count.items} {list._count.items === 1 ? "story" : "stories"}</Text>
                      </HStack>
                    </VStack>
                  </HStack>
                );
              })}

              <Divider my={3} />

              {showCreate ? (
                <VStack align="stretch" spacing={3} pt={1}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">List name</FormLabel>
                    <Input
                      size="sm"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Weekend reads"
                      maxLength={100}
                      autoFocus
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Description (optional)</FormLabel>
                    <Textarea
                      size="sm"
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="What's this list for?"
                      maxLength={500}
                      rows={2}
                    />
                  </FormControl>
                  <FormControl display="flex" alignItems="center">
                    <FormLabel fontSize="sm" mb={0}>
                      Public list
                    </FormLabel>
                    <Switch
                      size="sm"
                      isChecked={newPublic}
                      onChange={(e) => setNewPublic(e.target.checked)}
                      colorScheme="purple"
                    />
                  </FormControl>
                  <HStack>
                    <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      colorScheme="purple"
                      isDisabled={!newName.trim()}
                      isLoading={saving}
                      onClick={handleCreate}
                    >
                      Create &amp; Add
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<AddIcon />}
                  colorScheme="purple"
                  onClick={() => setShowCreate(true)}
                  justifyContent="flex-start"
                >
                  Create new list
                </Button>
              )}
            </VStack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
