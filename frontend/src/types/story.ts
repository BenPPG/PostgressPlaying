export type TagType = {
  id: number;
  name: string;
  slug: string;
};

export type StoryType = {
  id: number;
  title: string;
  summary?: string | null;
  createdAt: string;
  viewsCount: number;
  author?: { id: number; username: string };
  authorId?: number;
  authorUsername?: string;
  tags: TagType[];
  _count: { comments: number; likes: number };
};

export type StoriesResponse = {
  stories: StoryType[];
  total: number;
  page: number;
  totalPages: number;
};
