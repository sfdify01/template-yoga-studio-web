import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';
import { getCartRecommendations } from '../../lib/recommendations';
import { MenuItem } from '../../hooks/useConfig';

interface RecommendedItem {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  reason?: string;
}

interface AIMenuRecommendationsProps {
  cartItems: Array<{ itemId: string; qty: number }>;
  menuItems: MenuItem[];
  brandColor: string;
  onAdd: (item: RecommendedItem) => void;
}

export const AIMenuRecommendations = ({
  cartItems,
  menuItems,
  brandColor,
  onAdd,
}: AIMenuRecommendationsProps) => {
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  // Generate smart recommendations from actual menu items using AI engine
  const recommendations = useMemo(() => {
    if (cartItems.length === 0 || menuItems.length === 0) {
      return [];
    }

    // Convert cart items to format expected by recommendation engine
    const cartItemsForRecs = cartItems.map(item => ({ sku: item.itemId }));

    // Get smart recommendations using the AI recommendation engine
    const recs = getCartRecommendations(cartItemsForRecs, menuItems, undefined, 3);

    // Convert to RecommendedItem format
    return recs.map(rec => ({
      id: rec.id,
      name: rec.name,
      imageUrl: rec.imageUrl || rec.image || 'https://source.unsplash.com/400x400/?food',
      price: rec.price,
      reason: rec.reasonText,
    }));
  }, [cartItems, menuItems]);

  const handleAdd = (item: RecommendedItem, buttonElement: HTMLButtonElement) => {
    // Call parent's onAdd handler with full item data
    onAdd(item);
    
    // Mark as added
    setAddedItems(prev => new Set(prev).add(item.id));
    
    // Show toast notification
    toast.success(`✅ ${item.name} added to your order`, {
      duration: 2000,
    });
    
    // Trigger fly-to-cart animation
    animateToCart(buttonElement);
    
    // Reset added state after 2 seconds
    setTimeout(() => {
      setAddedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }, 2000);
  };

  // Fly-to-cart animation
  const animateToCart = (button: HTMLButtonElement) => {
    const card = button.closest('.upsell-card');
    const imgElement = card?.querySelector('img');
    if (!imgElement) return;

    const img = imgElement.cloneNode(true) as HTMLImageElement;
    const rect = button.getBoundingClientRect();
    
    // Style the flying image
    img.style.position = 'fixed';
    img.style.left = `${rect.left + rect.width / 2 - 30}px`;
    img.style.top = `${rect.top + rect.height / 2 - 30}px`;
    img.style.width = '60px';
    img.style.height = '60px';
    img.style.zIndex = '9999';
    img.style.borderRadius = '8px';
    img.style.objectFit = 'cover';
    img.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    img.style.transition = 'all 600ms cubic-bezier(0.4, 0, 0.2, 1)';
    img.style.pointerEvents = 'none';
    
    document.body.appendChild(img);
    
    // Trigger animation on next frame
    requestAnimationFrame(() => {
      img.style.transform = 'translate(250px, -200px) scale(0) rotate(360deg)';
      img.style.opacity = '0';
    });
    
    // Clean up after animation
    setTimeout(() => {
      img.remove();
    }, 600);
  };

  if (cartItems.length === 0 || recommendations.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl bg-gray-50 p-4 border border-gray-100">
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-base text-gray-800 mb-1">
          You'll love these too ❤️
        </h3>
        <p className="text-xs text-gray-500">
          Carefully selected to complement your order.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        {recommendations.map((item, idx) => {
            const isAdded = addedItems.has(item.id);
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.1 }}
                className="upsell-card rounded-xl border border-gray-200 bg-white p-3 flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2 shadow-sm">
                  <ImageWithFallback
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Name */}
                <h4 className="text-xs font-medium leading-tight text-gray-800 text-center mb-1 line-clamp-1">
                  {item.name}
                </h4>
                
                {/* Price */}
                <p className="text-xs text-gray-500 text-center mb-2">
                  ${item.price.toFixed(2)}
                </p>
                
                {/* Add Button */}
                <button
                  onClick={(e) => handleAdd(item, e.currentTarget)}
                  disabled={isAdded}
                  aria-label={`Add ${item.name} to your current order`}
                  title="Add to your current order"
                  className={`
                    upsell-add-btn w-full h-9 rounded-lg text-sm font-medium transition-all
                    flex items-center justify-center gap-1
                    ${isAdded 
                      ? 'bg-green-600 text-white' 
                      : 'text-white hover:scale-[1.03] active:scale-[0.98]'
                    }
                  `}
                  style={!isAdded ? { backgroundColor: brandColor } : undefined}
                >
                  {isAdded ? (
                    <motion.span 
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="flex items-center justify-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Added ✓
                    </motion.span>
                  ) : (
                    'Add'
                  )}
                </button>
              </motion.div>
            );
        })}
      </div>
    </div>
  );
};
