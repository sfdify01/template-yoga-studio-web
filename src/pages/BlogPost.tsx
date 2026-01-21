import { motion } from 'motion/react';
import { BlogPost } from '../components/blog/BlogPostCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Calendar, User, Share2, Facebook, Twitter, Link as LinkIcon, Clock } from 'lucide-react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { toast } from 'sonner';
import { parseMarkdown } from '../lib/markdown';

interface BlogPostPageProps {
  post: BlogPost;
  relatedPosts: BlogPost[];
  brandColor: string;
  onNavigate: (path: string) => void;
  onPostClick: (slug: string) => void;
}

export const BlogPostPage = ({ 
  post, 
  relatedPosts,
  brandColor,
  onNavigate,
  onPostClick
}: BlogPostPageProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `${post.title} - ${post.subtitle}`;

    switch (platform) {
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Back Button */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => onNavigate('/blog')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Button>
        </div>
      </div>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Category */}
          <div className="mb-6">
            <span 
              className="px-4 py-2 rounded-full text-sm text-white"
              style={{ backgroundColor: brandColor }}
            >
              {post.category}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl mb-4">
            {post.title}
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-6">
            {post.subtitle}
          </p>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
            <span>•</span>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>{post.author}</span>
            </div>
            {post.readTime && (
              <>
                <span>•</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{post.readTime} min read</span>
                </div>
              </>
            )}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Share Buttons */}
          <div className="flex items-center gap-2 mb-8">
            <span className="text-sm text-gray-600 mr-2">Share:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare('facebook')}
              className="gap-2"
            >
              <Facebook className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare('twitter')}
              className="gap-2"
            >
              <Twitter className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare('copy')}
              className="gap-2"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Featured Image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-12"
        >
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-gray-100">
            <ImageWithFallback
              src={post.image}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="prose prose-lg max-w-none mb-12 blog-content"
        >
          <p className="text-gray-700 leading-relaxed mb-6 text-lg">
            {post.excerpt}
          </p>

          {/* Render content array or string */}
          {post.content && (
            <>
              {Array.isArray(post.content) ? (
                post.content.map((paragraph, index) => (
                  <p key={index} className="text-gray-700 leading-relaxed mb-6">
                    {paragraph}
                  </p>
                ))
              ) : (
                <div 
                  className="markdown-content text-gray-700"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }}
                />
              )}
            </>
          )}
        </motion.div>

        {/* CTA Section - Shahirzada Fresh Market */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="bg-gray-50 border-t border-b rounded-xl py-8 px-6 my-12"
        >
          <div className="text-center">
            <h3 className="text-2xl mb-3">Visit Shahirzada Fresh Market</h3>
            <p className="text-sm text-gray-600 mb-4">
              Experience the finest halal-certified, never-frozen meats daily at our Naperville location
            </p>
            <p className="text-gray-900 mb-6">
              <strong>3124 Illinois Rte 59 Suite 154, Naperville, IL 60564</strong>
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={() => onNavigate('/products')}
                size="lg"
                className="text-white"
                style={{ backgroundColor: brandColor }}
              >
                Shop Our Meats
              </Button>
              <Button
                onClick={() => onNavigate('/contact')}
                variant="outline"
                size="lg"
              >
                Contact Us for Custom Orders
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <h3 className="text-2xl mb-6">You may also like</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedPosts.slice(0, 2).map((relatedPost) => (
                <div
                  key={relatedPost.id}
                  onClick={() => onPostClick(relatedPost.slug)}
                  className="cursor-pointer group"
                >
                  <div className="aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 mb-4">
                    <ImageWithFallback
                      src={relatedPost.image}
                      alt={relatedPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="text-xs text-gray-500">{relatedPost.category}</span>
                  <h4 className="text-lg group-hover:text-[var(--brand-color)] transition-colors">
                    {relatedPost.title}
                  </h4>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </article>
    </div>
  );
};
