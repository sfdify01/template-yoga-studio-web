import * as kv from "./kv_store.ts";
import { nowIso, slugify } from "./utils.ts";

type DuplicateDetail = {
  duplicateKey: string;
  keepId: string;
  keepTitle: string;
  keepUpdated: string;
  removedIds: string[];
  removedCount: number;
};

export type BlogCategory = { id: string; name: string; icon: string };
export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  category: string;
  author: string;
  date: string;
  image: string;
  tags: string[];
  excerpt: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  keywords: string[];
  featured: boolean;
  readTime: number;
  createdAt: string;
  updatedAt: string;
};

export type BlogStore = {
  posts: BlogPost[];
  categories: BlogCategory[];
};

export const DEFAULT_BLOG_CATEGORIES: BlogCategory[] = [
  { id: "recipe", name: "Recipe", icon: "🍲" },
  { id: "guide", name: "Guide", icon: "📖" },
  { id: "news", name: "News", icon: "📰" },
  { id: "event", name: "Event", icon: "🎉" },
];

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const encoder = new TextEncoder();

function calculateReadTime(content: string) {
  const words = content?.split(/\s+/)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 200));
}

async function sha256(text: string) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getBlogStore(): Promise<BlogStore> {
  const data = await kv.get("blog_posts");
  const legacyArray = Array.isArray(data) ? data : [];
  const posts = Array.isArray(data?.posts) ? data.posts : legacyArray;
  return {
    posts,
    categories: Array.isArray(data?.categories) && data.categories.length
      ? data.categories
      : DEFAULT_BLOG_CATEGORIES,
  };
}

export async function saveBlogStore(store: BlogStore) {
  await kv.set("blog_posts", store);
}

export function normalizePostInput(input: any) {
  if (!input) throw new Error("Missing post payload");
  const title = input.title?.toString().trim();
  const slugSource = input.slug?.toString().trim() || title;
  if (!title) throw new Error("Title is required");
  if (!slugSource) throw new Error("Slug is required");
  const slug = slugify(slugSource);
  if (!slug) throw new Error("Slug is invalid");
  const content = input.content?.toString() ?? "";
  if (!content.trim()) throw new Error("Content is required");
  const excerpt = input.excerpt?.toString() ?? "";
  if (!excerpt.trim()) throw new Error("Excerpt is required");
  const subtitle = input.subtitle?.toString() ?? "";
  const category = input.category?.toString() ?? "Recipe";
  const author = input.author?.toString() ?? "Team Shahirzada";
  const date = DATE_ONLY_REGEX.test(input.date) ? input.date : nowIso().slice(0, 10);
  const image = input.image?.toString() ?? "";
  const tags = Array.isArray(input.tags)
    ? input.tags.filter((tag: any) => typeof tag === "string" && tag.trim()).map((tag: string) => tag.trim())
    : [];
  const keywords = Array.isArray(input.keywords)
    ? input.keywords.filter((tag: any) => typeof tag === "string" && tag.trim()).map((tag: string) => tag.trim())
    : [];
  const featured = Boolean(input.featured);
  const readTime = input.readTime && Number.isFinite(Number(input.readTime))
    ? Math.max(1, Math.round(Number(input.readTime)))
    : calculateReadTime(content);
  return {
    slug,
    title,
    subtitle,
    category,
    author,
    date,
    image,
    tags,
    excerpt,
    content,
    meta_title: input.meta_title?.toString() ?? "",
    meta_description: input.meta_description?.toString() ?? "",
    keywords,
    featured,
    readTime,
  };
}

export async function dedupeBlogPosts(posts: BlogPost[], dryRun: boolean) {
  const groups = new Map<string, BlogPost[]>();
  for (const post of posts) {
    const titleKey = post.title?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
    const hash = await sha256(post.content ?? "");
    const key = `${titleKey}|${hash}|${post.slug}|${post.image}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(post);
  }

  const details: DuplicateDetail[] = [];
  let removed = 0;

  groups.forEach((group, duplicateKey) => {
    if (group.length <= 1) return;
    const sorted = [...group].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt).getTime();
      const bTime = new Date(b.updatedAt ?? b.createdAt).getTime();
      if (aTime !== bTime) return bTime - aTime;
      return a.id.localeCompare(b.id);
    });
    const keeper = sorted[0];
    const removedItems = sorted.slice(1);
    removed += removedItems.length;
    details.push({
      duplicateKey,
      keepId: keeper.id,
      keepTitle: keeper.title,
      keepUpdated: keeper.updatedAt,
      removedIds: removedItems.map((p) => p.id),
      removedCount: removedItems.length,
    });
    if (!dryRun) {
      removedItems.forEach((item) => {
        const index = posts.findIndex((post) => post.id === item.id);
        if (index >= 0) posts.splice(index, 1);
      });
    }
  });

  const log = {
    timestamp: nowIso(),
    dryRun,
    totalPosts: posts.length,
    duplicateGroups: details.length,
    removed,
    kept: posts.length,
    details,
  };

  await kv.set(`blog_dedupe_log:${Date.now()}`, log);
  return log;
}
