/**
 * AI Menu Suggestions
 * Shows contextual recommendations in product drawer and cart
 * Logic: cross-sell, upsell, combo completion, best-sellers
 */

import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { UniversalMenuItem, formatMoney } from '../../lib/menu/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface AISuggestionsProps {
  cartItems: any[];
  currentItem?: UniversalMenuItem | null;
  allMenuItems: UniversalMenuItem[];
  brandColor: string;
  onItemClick?: (item: UniversalMenuItem) => void;
  onQuickAdd?: (item: UniversalMenuItem) => void;
  context?: 'drawer' | 'cart';
}

// Analytics helper
const trackEvent = (eventName: string, properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track(eventName, properties);
  }
  console.log(`[Analytics] ${eventName}`, properties);
};

// AI suggestion logic (client-side stub - replace with real model later)
function generateSuggestions(
  cartItems: any[],
  currentItem: UniversalMenuItem | null,
  allItems: UniversalMenuItem[],
  maxResults: number = 5
): UniversalMenuItem[] {
  const suggestions: UniversalMenuItem[] = [];
  const cartItemIds = new Set(cartItems.map(item => item.sku || item.item_id));
  const currentItemId = currentItem?.id;

  // Filter out items already in cart and current item
  const availableItems = allItems.filter(
    item => !cartItemIds.has(item.id) && item.id !== currentItemId && !item.soldOut
  );

  // Strategy 1: Cross-sell drink/dessert
  const hasMainDish = cartItems.some(item => {
    const itemName = item.name?.toLowerCase() || '';
    return itemName.includes('burger') || itemName.includes('toast') || 
           itemName.includes('sandwich') || itemName.includes('bowl') ||
           itemName.includes('salad');
  });

  if (hasMainDish) {
    const drinks = availableItems.filter(item => {
      const name = item.name.toLowerCase();
      return name.includes('coffee') || name.includes('latte') || 
             name.includes('tea') || name.includes('smoothie') ||
             name.includes('juice') || name.includes('brew');
    });
    suggestions.push(...drinks.slice(0, 2));

    const desserts = availableItems.filter(item => {
      const name = item.name.toLowerCase();
      return name.includes('cookie') || name.includes('cake') || 
             name.includes('brownie') || name.includes('toast') && name.includes('french');
    });
    suggestions.push(...desserts.slice(0, 1));
  }

  // Strategy 2: Complete a combo (if they have a main, suggest sides)
  if (currentItem) {
    const currentName = currentItem.name.toLowerCase();
    if (currentName.includes('burger') || currentName.includes('sandwich')) {
      const sides = availableItems.filter(item => {
        const name = item.name.toLowerCase();
        return name.includes('fries') || name.includes('chips') || name.includes('salad');
      });
      suggestions.push(...sides.slice(0, 2));
    }
  }

  // Strategy 3: Best-sellers under price threshold
  const bestSellers = availableItems
    .filter(item => item.tags?.some(tag => tag.id === 'popular'))
    .filter(item => item.basePrice.amountCents <= 1500) // Under $15
    .slice(0, 2);
  suggestions.push(...bestSellers);

  // Strategy 4: Similar category items
  if (currentItem) {
    const similarItems = availableItems
      .filter(item => {
        // Simple similarity: share at least one tag
        return item.tags?.some(tag => 
          currentItem.tags?.some(ct => ct.id === tag.id)
        );
      })
      .slice(0, 2);
    suggestions.push(...similarItems);
  }

  // De-duplicate and limit
  const unique = Array.from(new Map(suggestions.map(item => [item.id, item])).values());
  return unique.slice(0, maxResults);
}

export const AISuggestions = ({
  cartItems,
  currentItem,
  allMenuItems,
  brandColor,
  onItemClick,
  onQuickAdd,
  context = 'drawer',
}: AISuggestionsProps) => {
  const [isOpen, setIsOpen] = useState(context === 'drawer');
  const [isLoading, setIsLoading] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  const suggestions = useMemo(() => {
    return generateSuggestions(cartItems, currentItem || null, allMenuItems);
  }, [cartItems, currentItem, allMenuItems]);

  // Track view when suggestions load
  useEffect(() => {
    if (suggestions.length > 0 && isOpen && !hasTrackedView) {
      trackEvent('ai_suggestion_viewed', {
        count: suggestions.length,
        context,
        item_ids: suggestions.map(s => s.id),
      });
      setHasTrackedView(true);
    }
  }, [suggestions, isOpen, hasTrackedView, context]);

  if (suggestions.length === 0) {
    return context === 'cart' ? (
      <div className="p-4 text-center">
        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">
          We'll recommend items as you build your order.
        </p>
      </div>
    ) : null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-3">
        <CollapsibleTrigger asChild>
          <button 
            className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            aria-label={isOpen ? 'Hide suggestions' : 'Show suggestions'}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: brandColor }} />
              <span className="text-[15px] font-semibold text-gray-900">
                You might also like
              </span>
              <span className="text-xs text-gray-500">
                ({suggestions.length})
              </span>
            </div>
            <ChevronRight 
              className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-shrink-0 w-[140px]">
                  <Skeleton className="aspect-square rounded-lg mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {suggestions.map(item => (
                <div
                  key={item.id}
                  className="flex-shrink-0 w-[160px] bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  <button
                    onClick={() => {
                      trackEvent('ai_suggestion_clicked', { 
                        item_id: item.id,
                        context,
                      });
                      onItemClick?.(item);
                    }}
                    className="w-full aspect-square bg-gray-100 overflow-hidden"
                  >
                    {item.imageUrl ? (
                      <ImageWithFallback
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl">🍽️</span>
                      </div>
                    )}
                  </button>

                  {/* Info */}
                  <div className="p-3 space-y-2">
                    <button
                      onClick={() => {
                        trackEvent('ai_suggestion_clicked', { 
                          item_id: item.id,
                          context,
                        });
                        onItemClick?.(item);
                      }}
                      className="w-full text-left"
                    >
                      <h4 className="text-xs font-medium text-gray-900 line-clamp-2 min-h-[2.5rem]">
                        {item.name}
                      </h4>
                      <p className="text-sm font-semibold mt-1" style={{ color: brandColor }}>
                        {formatMoney(item.basePrice)}
                      </p>
                    </button>

                    {/* Quick Add */}
                    {onQuickAdd && (!item.variantGroups || item.variantGroups.length === 0) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAdd(item);
                        }}
                      >
                        Quick Add
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {context === 'cart' && suggestions.length > 0 && (
            <p className="text-xs text-center text-gray-500 mt-2">
              AI-powered recommendations based on your order
            </p>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
