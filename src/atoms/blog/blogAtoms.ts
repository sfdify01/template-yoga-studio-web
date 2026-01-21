import { atom } from 'jotai';
import type { BlogPost } from '../../components/blog/BlogPostCard';

export const blogPostsAtom = atom<BlogPost[]>([]);

export const setBlogPostsAtom = atom(
  null,
  (_get, set, posts: BlogPost[] = []) => {
    set(blogPostsAtom, posts);
  }
);

export const blogSearchQueryAtom = atom<string>('');
export const setBlogSearchQueryAtom = atom(
  null,
  (_get, set, query: string) => set(blogSearchQueryAtom, query)
);

export const blogSelectedCategoryAtom = atom<string | null>(null);
export const setBlogSelectedCategoryAtom = atom(
  null,
  (_get, set, category: string | null) => set(blogSelectedCategoryAtom, category)
);

export const filteredBlogPostsAtom = atom<BlogPost[]>((get) => {
  const posts = get(blogPostsAtom);
  const search = get(blogSearchQueryAtom).trim().toLowerCase();
  const selectedCategory = get(blogSelectedCategoryAtom);

  return posts.filter((post) => {
    const title = post.title?.toLowerCase() || '';
    const excerpt = post.excerpt?.toLowerCase() || '';
    const subtitle = post.subtitle?.toLowerCase() || '';
    const category = post.category?.toLowerCase() || '';

    const matchesSearch =
      !search ||
      title.includes(search) ||
      excerpt.includes(search) ||
      subtitle.includes(search);

    const matchesCategory =
      !selectedCategory ||
      category === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });
});

export const featuredBlogPostAtom = atom<BlogPost | undefined>((get) =>
  get(blogPostsAtom).find((post) => post.featured)
);
