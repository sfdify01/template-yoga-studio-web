import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { MenuItem } from '../../hooks/useConfig';
import { Badge } from '../ui/badge';

interface MenuSectionProps {
  items: MenuItem[];
  brandColor?: string;
  brandName: string;
  onNavigate: (path: string) => void;
  onAddToCart?: (item: MenuItem) => void;
  maxItems?: number;
}

export const MenuSection = ({
  items,
  brandColor = '#6B0F1A',
  brandName,
  onNavigate,
  onAddToCart,
  maxItems = 6
}: MenuSectionProps) => {
  // Ensure items is an array
  const itemsArray = Array.isArray(items) ? items : [];
  
  // Show only the specified number of items
  const displayItems = itemsArray.slice(0, maxItems);

  const getDietaryIcon = (dietary: string[]) => {
    if (dietary.includes('halal')) return '🥩';
    if (dietary.includes('vegan')) return '🌱';
    if (dietary.includes('vegetarian')) return '🥗';
    return '';
  };

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
            Premium Halal Products 🥩
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Fresh, hand-cut halal meats and specialty items from {brandName}
          </p>
        </motion.div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {displayItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group cursor-pointer h-full flex flex-col">
                {/* Image */}
                <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                  <ImageWithFallback
                    src={item.imageUrl || `https://source.unsplash.com/800x600/?${encodeURIComponent(item.image)}`}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Popular Badge */}
                  {item.popular && (
                    <div className="absolute top-4 left-4">
                      <span 
                        className="px-3 py-1 rounded-full text-xs text-white backdrop-blur-sm"
                        style={{ backgroundColor: `${brandColor}E6` }}
                      >
                        ⭐ Popular
                      </span>
                    </div>
                  )}
                  {/* Dietary Badges */}
                  {item.dietary && item.dietary.length > 0 && (
                    <div className="absolute top-4 right-4 flex gap-1">
                      {item.dietary.slice(0, 2).map((diet) => (
                        <Badge 
                          key={diet} 
                          variant="secondary"
                          className="text-xs backdrop-blur-sm bg-white/90"
                        >
                          {getDietaryIcon([diet])} {diet}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  {/* Title and Price */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl flex-1">{item.name}</h3>
                    <span 
                      className="ml-3 flex-shrink-0 text-xl"
                      style={{ color: brandColor }}
                    >
                      ${item.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 flex-1">
                    {item.description}
                  </p>

                  {/* Add to Cart Button */}
                  {onAddToCart && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(item);
                      }}
                      size="sm"
                      className="w-full text-white hover:shadow-lg transition-all duration-300"
                      style={{ backgroundColor: brandColor }}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* View Full Menu Button */}
        {itemsArray.length > maxItems && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center"
          >
            <Button
              onClick={() => onNavigate('/products')}
              size="lg"
              className="group text-white hover:shadow-xl transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: brandColor }}
            >
              View Full Menu
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};
