export type TagType = {
  id: number;
  name: string;
  slug: string;
};

export type SeriesType = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  authorId: number;
  author?: { id: number; username: string };
  _count?: { stories: number };
};

export type SeriesEntryType = {
  order: number;
  series: { id: number; title: string; slug: string };
};

export type StoryType = {
  id: number;
  title: string;
  summary?: string | null;
  createdAt: string;
  viewsCount: number;
  author?: { id: number; username: string; avatarUrl?: string | null };
  authorId?: number;
  authorUsername?: string;
  tags: TagType[];
  series?: SeriesEntryType[];
  _count: { comments: number; likes: number };
};

export type UserProfileType = {
  id: number;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  _count: { stories: number };
  stories: StoryType[];
};

export type FollowingUser = {
  id: number;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  isFollowing: boolean;
  _count: { stories: number; followers: number };
};

export type StoriesResponse = {
  stories: StoryType[];
  total: number;
  page: number;
  totalPages: number;
};

export type CursorStoriesResponse = {
  stories: StoryType[];
  nextCursor: string | null;
  hasMore: boolean;
};

