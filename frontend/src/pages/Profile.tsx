import { useRef, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Box,
  Heading,
  Text,
  Avatar,
  HStack,
  VStack,
  SimpleGrid,
  Center,
  Spinner,
  Divider,
  IconButton,
  Tooltip,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Badge,
  Button,
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
  Link,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from "@chakra-ui/react";
import { EditIcon, DeleteIcon, AddIcon } from "@chakra-ui/icons";
import { FaLock, FaGlobeAmericas } from "react-icons/fa";
import api from "../api/client";
import StoryCard from "../components/StoryCard";
import { useAuth } from "../hooks/useAuth";
import { useColors } from "../hooks/useColors";

interface StoryList {
  id: number;
  name: string;
  description?: string;
  isPublic: boolean;
  isDefault: boolean;
  _count: { items: number };
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user, setUser } = useAuth();
  const profileId = id ?? user?.id?.toString();
  const isOwnProfile = !id || id === user?.id?.toString();
  const c = useColors();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // List management state
  const createListModal = useDisclosure();
  const deleteDialog = useDisclosure();
  const editListModal = useDisclosure();
  const deleteRef = useRef<HTMLButtonElement>(null);
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [newListPublic, setNewListPublic] = useState(false);
  const [editingList, setEditingList] = useState<StoryList | null>(null);
  const [deletingListId, setDeletingListId] = useState<number | null>(null);
  const [deletingListName, setDeletingListName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["profile", profileId],
    queryFn: () => api.get(`/users/${profileId}`).then((r) => r.data),
    enabled: !!profileId,
  });

  const { data: listsData = [] } = useQuery<StoryList[]>({
    queryKey: isOwnProfile ? ["my-lists"] : ["user-lists", profileId],
    queryFn: () =>
      isOwnProfile
        ? api.get("/lists/my").then((r) => r.data)
        : api.get(`/lists/user/${profileId}`).then((r) => r.data),
    enabled: !!profileId,
  });

  const createListMutation = useMutation({
    mutationFn: (data: { name: string; description: string; isPublic: boolean }) =>
      api.post("/lists", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      toast({ title: "List created", status: "success", duration: 2000 });
      createListModal.onClose();
      setNewListName("");
      setNewListDesc("");
      setNewListPublic(false);
    },
    onError: () => toast({ title: "Failed to create list", status: "error" }),
  });

  const updateListMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; description: string; isPublic: boolean } }) =>
      api.put(`/lists/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      toast({ title: "List updated", status: "success", duration: 2000 });
      editListModal.onClose();
    },
    onError: () => toast({ title: "Failed to update list", status: "error" }),
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-lists"] });
      toast({ title: "List deleted", status: "success", duration: 2000 });
      deleteDialog.onClose();
    },
    onError: () => toast({ title: "Failed to delete list", status: "error" }),
  });

  function openEditList(list: StoryList) {
    setEditingList(list);
    editListModal.onOpen();
  }

  function openDeleteList(list: StoryList) {
    setDeletingListId(list.id);
    setDeletingListName(list.name);
    deleteDialog.onOpen();
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", status: "error" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be smaller than 5 MB", status: "error" });
      return;
    }

    try {
      // 1. Get a presigned upload URL from our backend
      const { data: presigned } = await api.post("/users/me/avatar-upload-url", {
        contentType: file.type,
      });

      // 2. Upload directly to R2 — no auth header, just the presigned URL
      const upload = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!upload.ok) throw new Error("Upload failed");

      // 3. Save the public object URL on the user profile
      const { data: updated } = await api.put("/users/me", {
        avatarUrl: presigned.objectUrl,
      });

      setUser(updated);
      await queryClient.invalidateQueries({ queryKey: ["profile", profileId] });
      toast({ title: "Avatar updated", status: "success" });
    } catch {
      toast({ title: "Failed to upload avatar", status: "error" });
    }
  }

  if (!profileId) {
    return (
      <Center py={12}>
        <Text color={c.subtext}>Please login to view your profile.</Text>
      </Center>
    );
  }

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="xl" color={c.accent} />
      </Center>
    );
  }

  if (!data) {
    return (
      <Center py={12}>
        <Text color={c.subtext}>User not found.</Text>
      </Center>
    );
  }

  return (
    <Box maxW="4xl" mx="auto">
      <VStack spacing={4} align="center" mb={8}>
        <Box position="relative">
          <Avatar size="xl" name={data.username} src={data.avatarUrl || undefined} />
          {isOwnProfile && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
              <Tooltip label="Change avatar">
                <IconButton
                  aria-label="Change avatar"
                  icon={<EditIcon />}
                  size="xs"
                  borderRadius="full"
                  position="absolute"
                  bottom={0}
                  right={0}
                  onClick={() => fileInputRef.current?.click()}
                />
              </Tooltip>
            </>
          )}
        </Box>
        <Heading size="lg" color={c.heading}>{data.username}</Heading>
        {data.bio && (
          <Text color={c.subtext} textAlign="center" maxW="lg">
            {data.bio}
          </Text>
        )}
        <HStack spacing={6} fontSize="sm" color={c.meta}>
          <Text>Joined {new Date(data.createdAt).toLocaleDateString()}</Text>
          <Text>{data._count?.stories ?? 0} stories</Text>
        </HStack>
      </VStack>

      <Divider mb={6} />

      <Tabs colorScheme="purple">
        <TabList>
          <Tab>Stories</Tab>
          <Tab>Lists</Tab>
        </TabList>
        <TabPanels>
          {/* Stories tab */}
          <TabPanel px={0}>
            {data.stories?.length === 0 ? (
              <Text color={c.meta}>No published stories yet.</Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {data.stories?.map((story: any) => (
                  <StoryCard
                    key={story.id}
                    story={{
                      ...story,
                      authorId: data.id,
                      authorUsername: data.username,
                    }}
                  />
                ))}
              </SimpleGrid>
            )}
          </TabPanel>

          {/* Lists tab */}
          <TabPanel px={0}>
            {isOwnProfile && (
              <HStack justify="flex-end" mb={4}>
                <Button
                  size="sm"
                  leftIcon={<AddIcon />}
                  colorScheme="purple"
                  variant="outline"
                  onClick={createListModal.onOpen}
                >
                  New List
                </Button>
              </HStack>
            )}
            {listsData.length === 0 ? (
              <Text color={c.meta}>
                {isOwnProfile ? "You haven't created any lists yet." : "No public lists."}
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {listsData.map((list) => (
                  <Box
                    key={list.id}
                    bg={c.cardBg}
                    borderWidth="1px"
                    borderColor={c.border}
                    rounded="lg"
                    p={4}
                    position="relative"
                  >
                    <VStack align="start" spacing={2}>
                      <HStack spacing={2} flexWrap="wrap">
                        <Link
                          as={RouterLink}
                          to={`/lists/${list.id}`}
                          fontWeight="semibold"
                          color={c.heading}
                          _hover={{ color: c.accent }}
                        >
                          {list.name}
                        </Link>
                        {list.isDefault && (
                          <Badge colorScheme="purple" variant="subtle" fontSize="xs">
                            Default
                          </Badge>
                        )}
                        <Badge
                          colorScheme={list.isPublic ? "green" : "gray"}
                          fontSize="xs"
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          {list.isPublic ? <FaGlobeAmericas size={9} /> : <FaLock size={9} />}
                          {list.isPublic ? "Public" : "Private"}
                        </Badge>
                      </HStack>
                      {list.description && (
                        <Text fontSize="sm" color={c.subtext} noOfLines={2}>
                          {list.description}
                        </Text>
                      )}
                      <Text fontSize="xs" color={c.meta}>
                        {list._count.items} {list._count.items === 1 ? "story" : "stories"}
                      </Text>
                    </VStack>

                    {isOwnProfile && (
                      <HStack position="absolute" top={3} right={3} spacing={1}>
                        {!list.isDefault && (
                          <Tooltip label="Edit list">
                            <IconButton
                              aria-label="Edit list"
                              icon={<EditIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() => openEditList(list)}
                            />
                          </Tooltip>
                        )}
                        {!list.isDefault && (
                          <Tooltip label="Delete list">
                            <IconButton
                              aria-label="Delete list"
                              icon={<DeleteIcon />}
                              size="xs"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => openDeleteList(list)}
                            />
                          </Tooltip>
                        )}
                      </HStack>
                    )}
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Create List Modal */}
      <Modal isOpen={createListModal.isOpen} onClose={createListModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New List</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g. Weekend reads"
                  maxLength={100}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  placeholder="What's this list for?"
                  maxLength={500}
                  rows={3}
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Public list</FormLabel>
                <Switch
                  isChecked={newListPublic}
                  onChange={(e) => setNewListPublic(e.target.checked)}
                  colorScheme="purple"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={createListModal.onClose}>Cancel</Button>
            <Button
              colorScheme="purple"
              isDisabled={!newListName.trim()}
              isLoading={createListMutation.isPending}
              onClick={() =>
                createListMutation.mutate({
                  name: newListName.trim(),
                  description: newListDesc.trim(),
                  isPublic: newListPublic,
                })
              }
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit List Modal */}
      <Modal isOpen={editListModal.isOpen} onClose={editListModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit List</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  defaultValue={editingList?.name ?? ""}
                  key={editingList?.id}
                  id="edit-list-name"
                  maxLength={100}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  defaultValue={editingList?.description ?? ""}
                  key={`desc-${editingList?.id}`}
                  id="edit-list-desc"
                  maxLength={500}
                  rows={3}
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>Public list</FormLabel>
                <Switch
                  defaultChecked={editingList?.isPublic}
                  key={`pub-${editingList?.id}`}
                  id="edit-list-public"
                  colorScheme="purple"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={editListModal.onClose}>Cancel</Button>
            <Button
              colorScheme="purple"
              isLoading={updateListMutation.isPending}
              onClick={() => {
                if (!editingList) return;
                const name = (document.getElementById("edit-list-name") as HTMLInputElement)?.value ?? "";
                const description = (document.getElementById("edit-list-desc") as HTMLTextAreaElement)?.value ?? "";
                const isPublic = (document.getElementById("edit-list-public") as HTMLInputElement)?.checked ?? false;
                if (!name.trim()) return;
                updateListMutation.mutate({ id: editingList.id, data: { name: name.trim(), description: description.trim(), isPublic } });
              }}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete List Dialog */}
      <AlertDialog isOpen={deleteDialog.isOpen} leastDestructiveRef={deleteRef} onClose={deleteDialog.onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Delete List</AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete <strong>{deletingListName}</strong>? This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter gap={2}>
              <Button ref={deleteRef} onClick={deleteDialog.onClose}>Cancel</Button>
              <Button
                colorScheme="red"
                isLoading={deleteListMutation.isPending}
                onClick={() => deletingListId !== null && deleteListMutation.mutate(deletingListId)}
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
