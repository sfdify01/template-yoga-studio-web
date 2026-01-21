import { Instagram, Facebook, Heart } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface SocialGridProps {
  instagram?: string;
  facebook?: string;
  brandColor: string;
}

export const SocialGrid = ({ instagram, facebook, brandColor }: SocialGridProps) => {
  // Mock Instagram-style posts
  const posts = [
    { id: 1, image: 'restaurant brunch plate', likes: 234 },
    { id: 2, image: 'coffee latte art', likes: 189 },
    { id: 3, image: 'restaurant dessert', likes: 312 },
    { id: 4, image: 'restaurant cocktail', likes: 256 },
    { id: 5, image: 'restaurant salad', likes: 198 },
    { id: 6, image: 'restaurant dinner', likes: 287 },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="mb-2">Follow Us</h2>
        <p className="text-gray-600 mb-4">
          Join our community and stay updated with our latest creations
        </p>
        <div className="flex gap-3 justify-center">
          {instagram && (
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full border hover:bg-gray-50 transition-colors"
            >
              <Instagram className="w-5 h-5" />
              <span>@{instagram}</span>
            </a>
          )}
          {facebook && (
            <a
              href={`https://facebook.com/${facebook}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2 rounded-full border hover:bg-gray-50 transition-colors"
            >
              <Facebook className="w-5 h-5" />
              <span>{facebook}</span>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {posts.map((post) => (
          <div
            key={post.id}
            className="aspect-square rounded-2xl overflow-hidden relative group cursor-pointer"
          >
            <ImageWithFallback
              src={`https://source.unsplash.com/400x400/?${encodeURIComponent(post.image)}`}
              alt={`Social post ${post.id}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white">
                <Heart className="w-5 h-5 fill-current" />
                <span>{post.likes}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
