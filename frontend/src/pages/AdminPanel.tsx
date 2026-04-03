import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  IconButton,
  Badge,
  Center,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { toast } from "sonner";
import api from "../api/client";
import { useColors } from "../hooks/useColors";

const statusColors: Record<string, string> = {
  DRAFT: "yellow",
  PUBLISHED: "green",
  ARCHIVED: "gray",
};

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const c = useColors();

  const { data: stories, isLoading } = useQuery({
    queryKey: ["admin-stories"],
    queryFn: () => api.get("/admin/stories").then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/admin/stories/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success("Status updated");
    },
  });

  const deleteStory = useMutation({
    mutationFn: (id: number) => api.delete(`/stories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success("Story deleted");
    },
  });

  if (isLoading) {
    return (
      <Center py={12}>
        <Spinner size="xl" color="purple.500" />
      </Center>
    );
  }

  const containerBg = c.cardBg;
  const containerBorder = c.border;
  const textColor = c.heading;
  const secondaryTextColor = c.subtext;

  return (
    <Box>
      <Heading size="lg" mb={6} color={textColor}>
        Admin Panel
      </Heading>

      {!stories || stories.length === 0 ? (
        <Text color={secondaryTextColor}>No stories to manage.</Text>
      ) : (
        <Box overflowX="auto" bg={containerBg} rounded="lg" borderWidth="1px" borderColor={containerBorder}>
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Title</Th>
                <Th>Author</Th>
                <Th>Status</Th>
                <Th>Likes</Th>
                <Th>Comments</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {stories.map((s: any) => (
                <Tr key={s.id}>
                  <Td>{s.id}</Td>
                  <Td maxW="250px" isTruncated fontWeight="medium">
                    {s.title}
                  </Td>
                  <Td>{s.author?.username}</Td>
                  <Td>
                    <Select
                      size="xs"
                      value={s.status}
                      onChange={(e) =>
                        updateStatus.mutate({ id: s.id, status: e.target.value })
                      }
                      w="130px"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </Select>
                  </Td>
                  <Td>
                    <Badge colorScheme="pink">{s._count?.likes ?? 0}</Badge>
                  </Td>
                  <Td>
                    <Badge colorScheme="blue">{s._count?.comments ?? 0}</Badge>
                  </Td>
                  <Td>
                    <IconButton
                      aria-label="Delete story"
                      icon={<DeleteIcon />}
                      size="xs"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => {
                        if (window.confirm("Delete this story?")) {
                          deleteStory.mutate(s.id);
                        }
                      }}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Box>
  );
}
