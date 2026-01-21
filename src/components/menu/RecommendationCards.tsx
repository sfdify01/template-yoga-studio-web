import { motion } from 'motion/react';
import { Plus, Sparkles } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { RecommendationItem } from '../../lib/recommendations';
import { useCart } from '../../lib/cart/useCart';
import { toast } from 'sonner';
import { ProductPrice } from './ProductPrice';
import { normalizeUnit } from '../../lib/units';

interface RecommendationCardsProps {
  recommendations: RecommendationItem[];
  brandColor?: string;
  onItemClick?: (item: RecommendationItem) => void;
  variant?: 'grid' | 'horizontal-scroll';
}

export const RecommendationCards = ({
  recommendations,
  brandColor = '#E4572E',
  onItemClick,
  variant = 'horizontal-scroll',
}: RecommendationCardsProps) => {
  const { addItem } = useCart();

  if (recommendations.length === 0) {
    return null;
  }

  const handleQuickAdd = (item: RecommendationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      sku: item.id,
      name: item.name,
      price: Math.round(item.price * 100), // Convert to cents
      priceUnit: normalizeUnit(item.unit || 'each'),
      unitLabel: item.unitLabel,
      qty: 1,
      image: item.imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(item.image)}`,
    });
    toast.success(`Added ${item.name} to cart`);
  };

  const containerClass = variant === 'grid' 
    ? 'grid grid-cols-2 md:grid-cols-4 gap-4'
    : 'flex gap-4 overflow-x-auto pb-2 scrollbar-hide';

  const cardClass = variant === 'horizontal-scroll' ? 'flex-shrink-0 w-64' : '';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5" style={{ color: brandColor }} />
        <h3 className="font-semibold text-gray-900">You might also like</h3>
      </div>

      {/* Recommendations Container */}
      <div className={containerClass}>
        {recommendations.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cardClass}
          >
            <Card 
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
              onClick={() => onItemClick?.(item)}
            >
              {/* Image */}
              <div className="relative aspect-video bg-gray-100">
                <ImageWithFallback
                  src={item.imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(item.image)}`}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                
                {/* Reason Badge */}
                <div className="absolute top-2 left-2">
                  <Badge 
                    className="text-xs px-2 py-1 bg-white/95 backdrop-blur-sm border-0 shadow-sm"
                    variant="secondary"
                  >
                    {item.reasonText}
                  </Badge>
                </div>

                {/* Quick Add Button */}
                <Button
                  size="sm"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  style={{ backgroundColor: brandColor }}
                  onClick={(e) => handleQuickAdd(item, e)}
                  aria-label={`Quick add ${item.name}`}
                >
                  <Plus className="w-4 h-4 text-white" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-3">
                <h4 className="font-semibold text-sm mb-1 line-clamp-1">
                  {item.name}
                </h4>
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between">
                  <ProductPrice
                    price={item.price}
                    unit={item.unit || 'each'}
                    unitLabel={item.unitLabel}
                    className="font-semibold"
                    showDiscount={false}
                  />
                  {item.popular && (
                    <Badge variant="secondary" className="text-xs">
                      Popular
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
