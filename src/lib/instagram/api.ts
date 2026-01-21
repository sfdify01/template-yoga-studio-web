// Instagram Graph API client

import { InstagramPost, InstagramResponse } from './types';
import { instagramCache } from './cache';

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Fetch recent Instagram posts from Graph API
 * In production, this would be a server-side endpoint to keep tokens secure
 */
async function fetchFromInstagramAPI(
  userId: string,
  token: string,
  limit: number = 6
): Promise<InstagramPost[]> {
  const fields = [
    'id',
    'media_type',
    'media_url',
    'thumbnail_url',
    'permalink',
    'caption',
    'timestamp',
  ].join(',');

  const url = `${GRAPH_API_BASE}/${userId}/media?fields=${fields}&limit=${limit}&access_token=${token}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status}`);
    }

    const data = await response.json();

    // Map to our simpler format
    return data.data.map((item: any) => ({
      id: item.id,
      type: item.media_type,
      url: item.media_url,
      thumb: item.thumbnail_url || item.media_url,
      link: item.permalink,
      caption: item.caption || '',
      timestamp: item.timestamp,
    }));
  } catch (error) {
    console.error('Instagram API fetch error:', error);
    throw error;
  }
}

/**
 * Get recent Instagram posts with caching
 * @param userId Instagram user ID
 * @param token Long-lived access token
 * @param limit Number of posts to fetch (default: 6)
 */
export async function getRecentPosts(
  userId: string,
  token: string,
  limit: number = 6
): Promise<InstagramResponse> {
  const cacheKey = `instagram:recent:${userId}`;

  try {
    // Check cache first
    const cached = instagramCache.get<InstagramResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from API
    const posts = await fetchFromInstagramAPI(userId, token, limit);

    const response: InstagramResponse = {
      ok: true,
      posts,
      fetchedAt: Date.now(),
    };

    // Cache for 10 minutes
    instagramCache.set(cacheKey, response);

    return response;
  } catch (error) {
    // Try to return stale cache on error
    const stale = instagramCache.getStale<InstagramResponse>(cacheKey);
    if (stale) {
      return stale;
    }

    // Return error response
    return {
      ok: false,
      posts: [],
      fetchedAt: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate mock Instagram posts for demo/testing
 */
export function generateMockPosts(handle: string = 'samplebistro'): InstagramPost[] {
  const mockCaptions = [
    'Fresh from our kitchen! 🍝 Our signature pasta with truffle cream sauce is back by popular demand. Come taste the magic! ✨',
    'Weekend vibes at the bistro 🌿 Nothing beats a sunny Saturday brunch with friends and family. Join us! ☀️',
    'Behind the scenes 👨‍🍳 Chef Marco preparing tonight\'s special: Pan-seared salmon with seasonal vegetables. Perfection on a plate! 🐟',
    'Happy hour is HERE! 🍹 Join us 4-6pm for $5 cocktails and half-price appetizers. Cheers to good times! 🥂',
    'Our new dessert menu is 🔥 Featuring this decadent chocolate lava cake with vanilla bean ice cream. Pure indulgence! 🍫',
    'Farm-to-table freshness 🌱 We source locally whenever possible. This week\'s harvest includes organic tomatoes, basil, and more! 🍅',
  ];

  const mockImages = [
    'restaurant pasta truffle',
    'restaurant brunch outdoor',
    'chef cooking kitchen',
    'cocktails happy hour',
    'chocolate lava cake dessert',
    'fresh vegetables farm market',
  ];

  return Array.from({ length: 6 }, (_, i) => ({
    id: `mock_post_${i + 1}`,
    type: i === 3 ? 'VIDEO' : 'IMAGE' as 'IMAGE' | 'VIDEO',
    url: mockImages[i],
    thumb: mockImages[i],
    link: `https://instagram.com/p/mock_${i + 1}/`,
    caption: mockCaptions[i],
    timestamp: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}
