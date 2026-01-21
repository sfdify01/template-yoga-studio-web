import { BlogPost } from '../components/blog/BlogPostCard';

/**
 * SEO utilities for blog posts
 */

export interface BlogPostSEO {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  articlePublishedTime: string;
  articleAuthor: string;
  articleSection: string;
}

/**
 * Generate SEO metadata for a blog post
 */
export function generateBlogPostSEO(
  post: BlogPost,
  brandName: string,
  baseUrl: string = 'https://tabsybistro.com'
): BlogPostSEO {
  return {
    title: `${post.title} | ${brandName} Blog`,
    description: post.excerpt,
    keywords: [
      post.category.toLowerCase(),
      'restaurant',
      'recipe',
      brandName.toLowerCase(),
      ...post.title.toLowerCase().split(' ').filter(word => word.length > 3)
    ],
    ogTitle: post.title,
    ogDescription: post.subtitle,
    ogImage: post.image,
    ogUrl: `${baseUrl}/blog/${post.slug}`,
    articlePublishedTime: post.date,
    articleAuthor: post.author,
    articleSection: post.category,
  };
}

/**
 * Generate Schema.org Article markup
 */
export function generateArticleSchema(
  post: BlogPost,
  brandName: string,
  baseUrl: string = 'https://tabsybistro.com'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    alternativeHeadline: post.subtitle,
    image: post.image,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Restaurant',
      name: brandName,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    datePublished: post.date,
    dateModified: post.date,
    articleSection: post.category,
    description: post.excerpt,
    url: `${baseUrl}/blog/${post.slug}`,
  };
}

/**
 * Generate Schema.org BlogPosting markup
 */
export function generateBlogPostingSchema(
  post: BlogPost,
  brandName: string,
  baseUrl: string = 'https://tabsybistro.com'
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    alternativeHeadline: post.subtitle,
    image: post.image,
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: brandName,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    datePublished: post.date,
    description: post.excerpt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/blog/${post.slug}`,
    },
  };
}

/**
 * Get related posts based on category
 */
export function getRelatedPosts(
  currentPost: BlogPost,
  allPosts: BlogPost[],
  limit: number = 3
): BlogPost[] {
  return allPosts
    .filter(post => 
      post.id !== currentPost.id && 
      post.category === currentPost.category
    )
    .slice(0, limit);
}

/**
 * Generate sitemap entries for blog posts
 */
export function generateBlogSitemap(
  posts: BlogPost[],
  baseUrl: string = 'https://tabsybistro.com'
): Array<{ url: string; lastmod: string; changefreq: string; priority: number }> {
  return posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastmod: post.date,
    changefreq: 'weekly',
    priority: post.featured ? 0.8 : 0.6,
  }));
}

/**
 * Format date for display
 */
export function formatBlogDate(dateString: string, format: 'short' | 'long' = 'long'): string {
  const date = new Date(dateString);
  
  if (format === 'short') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}
