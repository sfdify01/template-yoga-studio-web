import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { RecommendationCards } from '../menu/RecommendationCards';
import { getCartRecommendations } from '../../lib/recommendations';
import { MenuItem } from '../../hooks/useConfig';
import { useCart } from '../../lib/cart/useCart';
import { useMemo } from 'react';

interface CartRecommendationsProps {
  allMenuItems: MenuItem[];
  brandColor?: string;
  onItemClick?: (item: MenuItem) => void;
}

export const CartRecommendations = ({
  allMenuItems,
  brandColor = '#E4572E',
  onItemClick,
}: CartRecommendationsProps) => {
  const { items } = useCart();

  const recommendations = useMemo(() => {
    if (items.length === 0 || allMenuItems.length === 0) return [];
    return getCartRecommendations(items, allMenuItems, undefined, 3);
  }, [items, allMenuItems]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-gray-50 to-white border border-gray-200"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5" style={{ color: brandColor }} />
        <h3 className="font-semibold text-gray-900">Complete your order</h3>
        <span className="text-sm text-gray-500 ml-auto">AI Recommended</span>
      </div>
      
      <RecommendationCards
        recommendations={recommendations}
        brandColor={brandColor}
        onItemClick={onItemClick}
        variant="horizontal-scroll"
      />
    </motion.div>
  );
};
