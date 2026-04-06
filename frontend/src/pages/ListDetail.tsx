import { useState } from "react";
import { useParams, Link as RouterLink, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Heading,
  Text,
  HStack,
  VStack,
  Badge,
  Button,
  Center,
  Spinner,
  Avatar,
  Link,
  SimpleGrid,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Switch,
  useDisclosure,
  useToast,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon, CloseIcon } from "@chakra-ui/icons";
import { FaLock, FaGlobeAmericas } from "react-icons/fa";
import { useRef } from "react";
import api from "../api/client";
import StoryCard from "../components/StoryCard";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";

interface ListStory {
  id: number;
  title: string;
  summary?: string;
  status: string;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  authorUsername: string;
  author: { id: number; username: string; avatarUrl?: string };
  tags: { id: number; name: string; slug: string }[];
  _count: { comments: number; likes: number };
}

interface StoryList {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  isDefault: boolean;
  createdAt: string;
  ownerId: number;
  owner: { id: number; username: string; avatarUrl?: string };
  items: { addedAt: string; story: ListStory }[];
  _count: { items: number };
}

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const c = useColors();

  const editModal = useDisclosure();
  const deleteDialog = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPublic, setEditPublic] = useState(false);

  const { data: list, isLoading, isError } = useQuery<StoryList>({
    queryKey: ["list", id],
    queryFn: () => api.get(`/lists/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const updateList = useMutation({
    mutationFn: (data: { name: string; description: string; isPublic: boolean }) =>
      api.put(`/lists/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", id] });
      toast({ title: "List updated", status: "success", duration: 2000 });
      editModal.onClose();
    },
    onError: () => toast({ title: "Failed to update list", status: "error" }),
  });

  const deleteList = useMutation({
    mutationFn: () => api.delete(`/lists/${id}`),
    onSuccess: () => {
      toast({ title: "List deleted", status: "success", duration: 2000 });
      navigate(`/profile`);
    },
    onError: () => toast({ title: "Failed to delete list", status: "error" }),
  });

  const removeStory = useMutation({
    mutationFn: (storyId: number) => api.delete(`/lists/${id}/stories/${storyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["list", id] });
      toast({ title: "Story removed from list", status: "success", duration: 2000 });
    },
    onError: () => toast({ title: "Failed to remove story", status: "error" }),
  });

  function openEdit() {
    if (!list) return;
    setEditName(list.name);
    setEditDesc(list.description ?? "");
    setEditPublic(list.isPublic);
    editModal.onOpen();
  }

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="xl" color={c.accent} />
      </Center>
    );
  }

  if (isError || !list) {
    return (
      <Center py={12}>
        <VStack>
          <Text color={c.subtext}>List not found or is private.</Text>
          <Button as={RouterLink} to="/" size="sm" variant="outline" colorScheme="purple" mt={2}>
            Go Home
          </Button>
        </VStack>
      </Center>
    );
  }

  const isOwner = user?.id === list.ownerId;

  return (
    <Box maxW="4xl" mx="auto">
      {/* Header */}
      <Box
        bg={c.cardBg}
        borderWidth="1px"
        borderColor={c.border}
        rounded="lg"
        p={6}
        mb={6}
      >
        <HStack justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
          <VStack align="start" spacing={1} flex={1} minW={0}>
            <HStack spacing={2} flexWrap="wrap">
              <Heading size="lg" color={c.heading}>
                {list.name}
              </Heading>
              {list.isDefault && (
                <Badge colorScheme="purple" variant="subtle">
                  Default
                </Badge>
              )}
              <Badge
                colorScheme={list.isPublic ? "green" : "gray"}
                display="flex"
                alignItems="center"
                gap={1}
              >
                {list.isPublic ? <FaGlobeAmericas /> : <FaLock />}
                {list.isPublic ? "Public" : "Private"}
              </Badge>
            </HStack>
            {list.description && (
              <Text color={c.subtext} fontSize="sm">
                {list.description}
              </Text>
            )}
            <HStack spacing={4} fontSize="sm" color={c.meta} mt={1}>
              <HStack spacing={1}>
                <Avatar
                  size="xs"
                  name={list.owner.username}
                  src={list.owner.avatarUrl ?? undefined}
                />
                <Link as={RouterLink} to={`/profile/${list.owner.id}`} color={c.accent}>
                  {list.owner.username}
                </Link>
              </HStack>
              <Text>{list._count.items} {list._count.items === 1 ? "story" : "stories"}</Text>
            </HStack>
          </VStack>

          {isOwner && (
            <HStack spacing={2}>
              {!list.isDefault && (
                <Tooltip label="Edit list">
                  <IconButton
                    aria-label="Edit list"
                    icon={<EditIcon />}
                    size="sm"
                    variant="outline"
                    onClick={openEdit}
                  />
                </Tooltip>
              )}
              {/* Owner can always toggle visibility, even on default lists */}
              {list.isDefault && (
                <Tooltip label={list.isPublic ? "Make private" : "Make public"}>
                  <IconButton
                    aria-label="Toggle visibility"
                    icon={list.isPublic ? <FaLock /> : <FaGlobeAmericas />}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateList.mutate({
                        name: list.name,
                        description: list.description ?? "",
                        isPublic: !list.isPublic,
                      })
                    }
                    isLoading={updateList.isPending}
                  />
                </Tooltip>
              )}
              {!list.isDefault && (
                <Tooltip label="Delete list">
                  <IconButton
                    aria-label="Delete list"
                    icon={<DeleteIcon />}
                    size="sm"
                    variant="outline"
                    colorScheme="red"
                    onClick={deleteDialog.onOpen}
                  />
                </Tooltip>
              )}
            </HStack>
          )}
        </HStack>
      </Box>

      <Divider mb={6} />

      {/* Stories grid */}
      {list.items.length === 0 ? (
        <Center py={12}>
          <VStack spacing={2}>
            <Text color={c.subtext} fontSize="lg">
              This list is empty.
            </Text>
            {isOwner && (
              <Text color={c.meta} fontSize="sm">
                Add stories using the bookmark button on any story page.
              </Text>
            )}
          </VStack>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          {list.items.map(({ story }) => (
            <Box key={story.id} position="relative">
              <StoryCard
                story={{
                  ...story,
                  authorId: story.author.id,
                  authorUsername: story.author.username,
                }}
              />
              {isOwner && (
                <Tooltip label="Remove from list">
                  <IconButton
                    aria-label="Remove from list"
                    icon={<CloseIcon boxSize={2.5} />}
                    size="xs"
                    colorScheme="red"
                    variant="solid"
                    position="absolute"
                    top={2}
                    right={2}
                    onClick={() => removeStory.mutate(story.id)}
                    isLoading={removeStory.isPending}
                  />
                </Tooltip>
              )}
            </Box>
          ))}
        </SimpleGrid>
      )}

      {/* Edit modal (not shown for default lists) */}
      <Modal isOpen={editModal.isOpen} onClose={editModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit List</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Public list</FormLabel>
                <Switch
                  isChecked={editPublic}
                  onChange={(e) => setEditPublic(e.target.checked)}
                  colorScheme="purple"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={editModal.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              isLoading={updateList.isPending}
              isDisabled={!editName.trim()}
              onClick={() =>
                updateList.mutate({ name: editName.trim(), description: editDesc.trim(), isPublic: editPublic })
              }
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete confirm dialog */}
      <AlertDialog
        isOpen={deleteDialog.isOpen}
        leastDestructiveRef={cancelRef}
        onClose={deleteDialog.onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete List</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete <strong>{list.name}</strong>? This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={cancelRef} onClick={deleteDialog.onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                isLoading={deleteList.isPending}
                onClick={() => deleteList.mutate()}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
