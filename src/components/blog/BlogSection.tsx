import { motion } from 'motion/react';
import { BlogPostCard, BlogPost } from './BlogPostCard';
import { Button } from '../ui/button';
import { ArrowRight } from 'lucide-react';

interface BlogSectionProps {
  posts: BlogPost[];
  brandColor?: string;
  brandName: string;
  onNavigate: (path: string) => void;
  onPostClick: (slug: string) => void;
}

export const BlogSection = ({
  posts,
  brandColor = '#6B0F1A',
  brandName,
  onNavigate,
  onPostClick
}: BlogSectionProps) => {
  // Ensure posts is an array
  const postsArray = Array.isArray(posts) ? posts : [];
  
  // Find featured post
  const featuredPost = postsArray.find(p => p.featured);
  
  // Get regular posts (excluding featured)
  const regularPosts = featuredPost 
    ? postsArray.filter(p => !p.featured).slice(0, 6)
    : postsArray.slice(0, 6);

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Gradient Background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          background: `linear-gradient(135deg, ${brandColor} 0%, #ffffff 100%)`
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="mb-4 text-3xl md:text-4xl">
            Recipes & Stories from Our Halal Market 🥩
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Authentic recipes, expert guides, and tips using premium halal meats from {brandName}
          </p>
        </motion.div>

        {/* Featured Post */}
        {featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div 
              className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
              onClick={() => onPostClick(featuredPost.slug)}
            >
              <div className="grid md:grid-cols-2 gap-0">
                <div className="aspect-[4/3] md:aspect-auto bg-gray-100 relative overflow-hidden group">
                  <img
                    src={featuredPost.image}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-6 left-6">
                    <span 
                      className="px-4 py-2 rounded-full text-sm text-white backdrop-blur-sm"
                      style={{ backgroundColor: `${brandColor}E6` }}
                    >
                      ⭐ Featured
                    </span>
                  </div>
                </div>
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <p className="text-sm text-gray-500 mb-3">
                    {new Date(featuredPost.date).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                  <h3 className="text-3xl mb-4">{featuredPost.title}</h3>
                  <p className="text-gray-600 mb-6">{featuredPost.excerpt}</p>
                  <span 
                    className="text-sm font-medium inline-flex items-center gap-2 hover:underline"
                    style={{ color: brandColor }}
                  >
                    Read Full Story →
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {regularPosts.map((post, index) => (
            <BlogPostCard
              key={post.id}
              post={post}
              index={index}
              onClick={() => onPostClick(post.slug)}
              brandColor={brandColor}
            />
          ))}
        </div>

        {/* View All Button */}
        {postsArray.length > 6 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center"
          >
            <Button
              onClick={() => onNavigate('/blog')}
              size="lg"
              className="group text-white hover:shadow-xl transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: brandColor }}
            >
              View All Posts
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};
