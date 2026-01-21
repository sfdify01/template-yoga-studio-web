import { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { BlogPostCard, BlogPost } from '../components/blog/BlogPostCard';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Search } from 'lucide-react';
import {
  blogSearchQueryAtom,
  blogSelectedCategoryAtom,
  featuredBlogPostAtom,
  filteredBlogPostsAtom,
  setBlogPostsAtom,
} from '../atoms/blog/blogAtoms';

interface BlogPageProps {
  posts: BlogPost[];
  categories: Array<{ id: string; name: string; icon: string }>;
  brandColor: string;
  brandName: string;
  onPostClick: (slug: string) => void;
}

export const BlogPage = ({ 
  posts, 
  categories, 
  brandColor,
  brandName,
  onPostClick
}: BlogPageProps) => {
  const [searchQuery, setSearchQuery] = useAtom(blogSearchQueryAtom);
  const [selectedCategory, setSelectedCategory] = useAtom(blogSelectedCategoryAtom);
  const setPosts = useSetAtom(setBlogPostsAtom);
  const filteredPosts = useAtomValue(filteredBlogPostsAtom);
  const featuredPost = useAtomValue(featuredBlogPostAtom);

  useEffect(() => {
    setPosts(Array.isArray(posts) ? posts : []);
  }, [posts, setPosts]);

  return (
    <div className="min-h-screen bg-gray-50 pb-8 sm:pb-12">
      {/* Hero Header */}
      <div 
        className="py-10 sm:py-16 md:py-20 text-white relative overflow-hidden"
        style={{ backgroundColor: brandColor }}
      >
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}
        />
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-white mb-3 sm:mb-4" style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)', lineHeight: '1.2' }}>
              {brandName} Blog
            </h1>
            <p className="text-white/90 max-w-2xl mx-auto px-2" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)', lineHeight: '1.5' }}>
              Recipes, guides, and stories featuring premium halal meats
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-8">
        {/* Featured Post */}
        {featuredPost && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
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
                  <h2 className="text-3xl mb-4">{featuredPost.title}</h2>
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

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl"
                paddingLeft={44}
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={!selectedCategory ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                style={!selectedCategory ? { backgroundColor: brandColor } : {}}
                onClick={() => setSelectedCategory(null)}
              >
                All Posts
              </Badge>
              {categories.map((cat) => (
                <Badge
                  key={cat.id}
                  variant={selectedCategory === cat.name ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  style={selectedCategory === cat.name ? { backgroundColor: brandColor } : {}}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                >
                  <span className="mr-1">{cat.icon}</span>
                  {cat.name}
                </Badge>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Results Count */}
        <p className="text-sm text-gray-600 mb-6">
          {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'} found
        </p>

        {/* Posts Grid */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, index) => (
              <BlogPostCard
                key={post.id}
                post={post}
                index={index}
                onClick={() => onPostClick(post.slug)}
                brandColor={brandColor}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No articles found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
