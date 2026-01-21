import { useState } from 'react';
import { HeroSection } from '../components/HeroSection';
import { HoursBadge } from '../components/HoursBadge';
import { ReviewCarousel } from '../components/ReviewCarousel';
import { MapCard } from '../components/MapCard';
import { BlogSection } from '../components/blog/BlogSection';
import { MenuSection } from '../components/menu/MenuSection';
import heroImage from 'figma:asset/91561fba6dae7cf749889433be54ebac61d2363d.png';

import { LoyaltyBanner } from '../components/loyalty/LoyaltyBanner';
import { StarsWallet } from '../components/loyalty/StarsWallet';
import { ReferFriendsCard } from '../components/loyalty/ReferFriendsCard';
import { Config, Hours, MenuData, BlogData, MenuItem } from '../hooks/useConfig';
import { useCart } from '../lib/cart/useCart';
import { toast } from 'sonner';
import { normalizeUnit } from '../lib/units';

interface HomeProps {
  config: Config;
  hours: Hours;
  menu: MenuData;
  blog?: BlogData;
  onNavigate: (path: string) => void;
  onOrderNow?: () => void;
}

export const Home = ({ config, hours, menu, blog, onNavigate, onOrderNow }: HomeProps) => {
  const [showWallet, setShowWallet] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const { addItem } = useCart();

  const featuredItems = menu.categories
    .flatMap(cat => cat.items)
    .filter(item => item.popular);

  const handlePostClick = (slug: string) => {
    onNavigate(`/blog/${slug}`);
  };

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      sku: item.id,
      name: item.name,
      price: Math.round(item.price * 100), // Convert to cents
      priceUnit: normalizeUnit(item.unit || 'each'),
      unitLabel: item.unitLabel,
      qty: 1,
      image: item.imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(item.image)}`,
    });

    toast.success(`Added ${item.name} to cart`, {
      duration: 2000,
    });
  };

  return (
    <div className="space-y-10 sm:space-y-12 md:space-y-16">
      {/* Hero Section */}
      <HeroSection
        brandName={config.name}
        tagline={config.tagline}
        brandColor={config.theme.brand}
        heroImage={heroImage}
        onOrderClick={onOrderNow || (() => onNavigate('/products'))}
        onReserveClick={() => config.integrations.reservations?.url ? window.open(config.integrations.reservations.url, '_blank') : (onOrderNow ? onOrderNow() : onNavigate('/products'))}
      />

      {/* Loyalty Banner */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <LoyaltyBanner
          brandColor={config.theme.brand}
          onViewStars={() => setShowWallet(true)}
          onInviteFriend={() => setShowReferral(true)}
        />
      </div>

      {/* Hours Widget */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <HoursBadge hours={hours} variant="card" brandColor={config.theme.brand} />
      </div>

      {/* Featured Menu Section */}
      {featuredItems.length > 0 && (
        <MenuSection
          items={featuredItems}
          brandColor={config.theme.brand}
          brandName={config.name}
          onNavigate={onNavigate}
          onAddToCart={handleAddToCart}
          maxItems={6}
        />
      )}

      {/* Reviews */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ReviewCarousel brandColor={config.theme.brand} />
      </div>

      {/* Map */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="mb-6">Visit Us</h2>
        <MapCard address={config.address} brandColor={config.theme.brand} />
      </div>

      {/* Blog Section */}
      {blog && blog.posts && Array.isArray(blog.posts) && blog.posts.length > 0 && (
        <BlogSection
          posts={blog.posts}
          brandColor={config.theme.brand}
          brandName={config.name}
          onNavigate={onNavigate}
          onPostClick={handlePostClick}
        />
      )}

      {/* Loyalty Modals */}
      {showWallet && (
        <StarsWallet
          brandColor={config.theme.brand}
          onClose={() => setShowWallet(false)}
        />
      )}
      {showReferral && (
        <ReferFriendsCard
          brandColor={config.theme.brand}
          brandName={config.name}
          onClose={() => setShowReferral(false)}
        />
      )}
    </div>
  );
};
