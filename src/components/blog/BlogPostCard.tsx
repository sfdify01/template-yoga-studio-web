import { motion } from 'motion/react';
import { Calendar, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  author: string;
  date: string;
  image: string;
  excerpt: string;
  featured?: boolean;
  content?: string[] | string;
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  tags?: string[];
  readTime?: number;
};

interface BlogPostCardProps {
  post: BlogPost;
  index?: number;
  onClick: () => void;
  brandColor?: string;
}

export const BlogPostCard = ({ 
  post, 
  index = 0, 
  onClick,
  brandColor = '#6B0F1A'
}: BlogPostCardProps) => {
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get category icon
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Recipe': '🍝',
      'Event': '🎉',
      'News': '📰',
      'Guide': '📖',
      'Behind the Scenes': '👨‍🍳',
    };
    return icons[category] || '📝';
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-[16/10] overflow-hidden bg-gray-100 relative">
        <ImageWithFallback
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Category badge */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4">
          <span 
            className="px-2 sm:px-3 py-1 rounded-full text-xs text-white backdrop-blur-sm"
            style={{ backgroundColor: `${brandColor}E6` }}
          >
            {getCategoryIcon(post.category)} {post.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 sm:mb-3">
          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span>•</span>
          <span className="truncate">{post.author}</span>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-xl mb-2 line-clamp-2 group-hover:text-[var(--brand-color)] transition-colors">
          {post.title}
        </h3>

        {/* Subtitle */}
        <p className="text-sm text-gray-600 mb-3">
          {post.subtitle}
        </p>

        {/* Excerpt */}
        <p className="text-sm text-gray-700 mb-4 line-clamp-2">
          {post.excerpt}
        </p>

        {/* Read More */}
        <div className="flex items-center gap-2 text-sm group/link">
          <span 
            className="relative group-hover/link:underline"
            style={{ color: brandColor }}
          >
            Read More
          </span>
          <ArrowRight 
            className="w-4 h-4 group-hover:translate-x-1 transition-transform" 
            style={{ color: brandColor }}
          />
        </div>
      </div>
    </motion.article>
  );
};
