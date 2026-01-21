import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Instagram, ExternalLink, PlayCircle } from 'lucide-react';
import { InstagramPost, InstagramResponse } from '../../lib/instagram/types';
import { generateMockPosts } from '../../lib/instagram/api';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';

interface InstagramGridProps {
  heading?: string;
  instagramHandle: string;
  userId?: string;
  token?: string;
  rows?: number;
  cols?: number;
  showConnectCTA?: boolean;
  useMockData?: boolean;
}

export const InstagramGrid = ({
  heading = 'Follow Us on Instagram',
  instagramHandle,
  userId,
  token,
  rows = 2,
  cols = 3,
  showConnectCTA = false,
  useMockData = false, // Production: don't use mock data
}: InstagramGridProps) => {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const limit = rows * cols;

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        if (useMockData) {
          // Mock data only when explicitly requested
          await new Promise(resolve => setTimeout(resolve, 500));
          setPosts(generateMockPosts(instagramHandle));
        } else if (userId && token) {
          // Real Instagram API integration required
          console.warn('Instagram API integration not implemented. Set up Instagram Graph API credentials.');
          setPosts([]);
        } else {
          // No credentials provided
          setPosts([]);
        }
      } catch (err) {
        console.error('Failed to fetch Instagram posts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [userId, token, instagramHandle, useMockData]);

  // Handle not connected state
  if (!loading && posts.length === 0 && showConnectCTA) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <Instagram className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="mb-2">Connect Instagram</h2>
            <p className="text-gray-600 mb-6">
              Display your latest Instagram posts to engage customers and showcase your brand.
            </p>
            <Button variant="outline">
              <Instagram className="w-4 h-4 mr-2" />
              How to Connect
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Handle empty state for public (no admin CTA)
  if (!loading && posts.length === 0 && !showConnectCTA) {
    return (
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="mb-6">{heading}</h2>
            <a
              href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 transition-colors"
            >
              <Instagram className="w-5 h-5" />
              <span className="font-medium">@{instagramHandle.replace('@', '')}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="mb-4">{heading}</h2>
            <a
              href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 transition-colors group"
            >
              <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">@{instagramHandle.replace('@', '')}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        </div>

        {/* Grid */}
        <div 
          className="grid gap-4 md:gap-6"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
          }}
        >
          {loading ? (
            // Loading skeletons
            Array.from({ length: limit }).map((_, i) => (
              <Skeleton
                key={`skeleton-${i}`}
                className="aspect-square rounded-2xl"
              />
            ))
          ) : (
            // Posts
            posts.slice(0, limit).map((post, index) => (
              <InstagramTile
                key={post.id}
                post={post}
                index={index}
              />
            ))
          )}
        </div>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <a
            href={`https://instagram.com/${instagramHandle.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Instagram className="w-5 h-5" />
            <span className="font-medium">Follow Us on Instagram</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
};

interface InstagramTileProps {
  post: InstagramPost;
  index: number;
}

const InstagramTile = ({ post, index }: InstagramTileProps) => {
  const [isHovered, setIsHovered] = useState(false);

  // Truncate caption for alt text
  const altText = post.caption
    ? post.caption.slice(0, 80) + (post.caption.length > 80 ? '...' : '')
    : 'Instagram post';

  return (
    <motion.a
      href={post.link}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
    >
      {/* Image */}
      <ImageWithFallback
        src={post.thumb || post.url}
        alt={altText}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      />

      {/* Video indicator */}
      {post.type === 'VIDEO' && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-black/60 backdrop-blur-sm rounded-full p-2">
            <PlayCircle className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* Hover overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center justify-center gap-3 text-white p-6"
      >
        <Instagram className="w-8 h-8" />
        <p className="text-sm font-medium">View on Instagram</p>
        {post.caption && (
          <p className="text-xs text-center line-clamp-2 text-white/80 max-w-[200px]">
            {post.caption}
          </p>
        )}
      </motion.div>
    </motion.a>
  );
};
