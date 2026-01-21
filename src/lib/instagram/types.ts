// Instagram API types

export interface InstagramPost {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  url: string;
  thumb?: string;
  link: string;
  caption: string;
  timestamp: string;
}

export interface InstagramResponse {
  ok: boolean;
  posts: InstagramPost[];
  fetchedAt: number;
  error?: string;
}

export interface InstagramConfig {
  enabled: boolean;
  handle: string;
  userId?: string;
  token?: string;
}
