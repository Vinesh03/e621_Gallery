// E621 API Types

export interface E621Post {
  id: number;
  created_at: string;
  updated_at: string;
  file: {
    width: number;
    height: number;
    ext: string;
    size: number;
    md5: string;
    url: string | null;
  };
  preview: {
    width: number;
    height: number;
    url: string | null;
  };
  sample: {
    has: boolean;
    width: number;
    height: number;
    url: string | null;
    alternates?: Record<string, {
      type: string;
      height: number;
      width: number;
      urls: (string | null)[];
    }>;
  };
  score: {
    up: number;
    down: number;
    total: number;
  };
  tags: {
    general: string[];
    species: string[];
    character: string[];
    copyright: string[];
    artist: string[];
    invalid: string[];
    lore: string[];
    meta: string[];
  };
  locked_tags: string[];
  change_seq: number;
  flags: {
    pending: boolean;
    flagged: boolean;
    note_locked: boolean;
    status_locked: boolean;
    rating_locked: boolean;
    deleted: boolean;
  };
  rating: 's' | 'q' | 'e';
  fav_count: number;
  sources: string[];
  pools: number[];
  relationships: {
    parent_id: number | null;
    has_children: boolean;
    has_active_children: boolean;
    children: number[];
  };
  approver_id: number | null;
  uploader_id: number;
  description: string;
  comment_count: number;
  is_favorited: boolean;
  has_notes: boolean;
  duration: number | null;
}

export interface E621PostsResponse {
  posts: E621Post[];
}

export interface E621User {
  id: number;
  name: string;
  level: number;
  level_string: string;
  is_banned: boolean;
  avatar_id: number | null;
  base_upload_limit: number;
  can_approve_posts: boolean;
  can_upload_free: boolean;
  created_at: string;
  favorite_count: number;
  post_update_count: number;
  post_upload_count: number;
  statement_timeout: number;
}

export type RatingFilter = 's' | 'q' | 'e' | 'sq' | 'se' | 'qe' | 'sqe';
export type MediaFilter = 'all' | 'image' | 'video';

export interface SearchParams {
  tags?: string;
  limit?: number;
  page?: number | string;
  rating?: RatingFilter;
  mediaType?: MediaFilter;
}

export interface AuthCredentials {
  username: string;
  apiKey: string;
}

export interface E621Tag {
  id: number;
  name: string;
  post_count: number;
  category: number;
}
