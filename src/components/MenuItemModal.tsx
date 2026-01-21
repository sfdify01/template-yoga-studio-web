import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { MenuItem } from '../hooks/useConfig';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useCart } from '../lib/cart/useCart';
import { toast } from 'sonner';
import { getRecommendations } from '../lib/recommendations';
import { RecommendationCards } from './menu/RecommendationCards';
import { WeightInput } from './WeightInput';
import {
  formatQuantityDisplay,
  getUnitMinimum,
  isWeightUnit,
  normalizeUnit,
} from '../lib/units';

interface MenuItemModalProps {
  item: MenuItem;
  brandColor: string;
  dietaryFilters?: { id: string; label: string; icon: string }[];
  onClose: () => void;
  onAddToCart?: (qty: number, mods: any[], note: string) => void;
  minQuantity?: number;
  allMenuItems?: MenuItem[];
  categoryId?: string;
  onItemClick?: (item: MenuItem) => void;
}

export const MenuItemModal = ({
  item,
  brandColor,
  dietaryFilters = [],
  onClose,
  onAddToCart,
  minQuantity = 1,
  allMenuItems = [],
  categoryId = '',
  onItemClick
}: MenuItemModalProps) => {
  // Determine if this is a weight-based item
  const normalizedUnit = normalizeUnit(item.unit);
  const isWeightBased = isWeightUnit(normalizedUnit);
  const weightMinimum = getUnitMinimum(normalizedUnit);
  const defaultQty = isWeightBased
    ? weightMinimum
    : Math.max(minQuantity, 1);

  const [quantity, setQuantity] = useState(defaultQty);
  const [note, setNote] = useState('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const { addItem } = useCart();
  const modalRef = useRef<HTMLDivElement>(null);

  // Get AI recommendations
  const recommendations = useMemo(() => {
    if (allMenuItems.length === 0) return [];
    return getRecommendations(item, allMenuItems, categoryId, undefined, 4);
  }, [item, allMenuItems, categoryId]);

  const handleAddToCart = () => {
    addItem({
      sku: item.id,
      name: item.name,
      price: Math.round(item.price * 100),
      priceUnit: normalizedUnit,
      unitLabel: item.unitLabel,
      qty: quantity,
      image: item.imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(item.image)}`,
      note: note || undefined,
    });

    const qtyText = isWeightBased
      ? formatQuantityDisplay(quantity, normalizedUnit)
      : `${quantity}x`;
    toast.success(`Added ${qtyText} ${item.name} to cart`);
    
    if (recommendations.length > 0) {
      setShowRecommendations(true);
    } else {
      onClose();
    }
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Enter' && e.target instanceof HTMLTextAreaElement) {
        return; // Allow Enter in textarea
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto"
        ref={modalRef}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Hidden accessibility elements */}
        <DialogHeader className="sr-only">
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            {item.description}. Price: ${item.price.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 sm:p-8">
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Column: Image */}
            <div className="flex items-start justify-center">
              <div className="w-full max-w-[340px] aspect-[17/12] rounded-lg overflow-hidden shadow-md bg-gray-100">
                <ImageWithFallback
                  src={item.imageUrl || `https://source.unsplash.com/680x480/?${encodeURIComponent(item.image)}`}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Right Column: Details */}
            <div className="flex flex-col gap-4">
              {/* Name and Price */}
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                  {item.name}
                </h2>
                <span
                  className="text-lg font-semibold shrink-0"
                  style={{ color: brandColor }}
                >
                  ${item.price.toFixed(2)}
                  {isWeightBased && (
                    <span className="text-sm text-gray-500">/{item.unit}</span>
                  )}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-500 leading-relaxed">
                {item.description}
              </p>

              {/* Dietary Tags */}
              {item.dietary.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.dietary.map((diet) => {
                    const filter = dietaryFilters.find(f => f.id === diet);
                    return filter ? (
                      <Badge 
                        key={diet} 
                        variant="secondary"
                        className="text-xs px-2 py-1"
                      >
                        <span className="mr-1">{filter.icon}</span>
                        {filter.label}
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              {/* Add-ons */}
              {item.addOns && item.addOns.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Available Add-ons:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {item.addOns.map((addon, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />
                        {addon}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <Separator className="my-4" />

          {/* Special Instructions */}
          <div className="mb-4">
            <label 
              htmlFor="special-instructions" 
              className="text-sm font-medium text-gray-700 mb-2 block"
            >
              Special Instructions <span className="text-gray-400">(Optional)</span>
            </label>
            <Textarea
              id="special-instructions"
              placeholder="e.g., No onions, extra sauce, well done..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-lg text-sm placeholder:italic"
              rows={2}
            />
          </div>

          {/* Quantity/Weight Selection and Add to Cart */}
          {isWeightBased ? (
            // Weight-based input
            <div className="space-y-4">
              <WeightInput
                value={quantity}
                onChange={setQuantity}
                pricePerUnit={item.price}
                unit={item.unit as 'lb' | 'oz' | 'kg'}
                min={Math.max(1, Number(getUnitMinimum(item.unit)))}
                max={20}
                step={Number(getUnitStep(item.unit))}
                brandColor={brandColor}
              />

              {/* Add to Cart Button */}
              <Button
                size="lg"
                className="w-full h-12 text-white hover:opacity-90 transition-opacity shadow-sm text-base font-semibold"
                style={{ backgroundColor: brandColor }}
                onClick={handleAddToCart}
                aria-label={`Add ${quantity} ${item.unit} ${item.name} to cart for $${(item.price * quantity).toFixed(2)}`}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
            </div>
          ) : (
            // Regular quantity selector
            <div className="flex items-center gap-3">
              {/* Quantity Selector */}
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-10 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <div className="w-12 h-11 flex items-center justify-center border-x border-gray-300">
                  <span className="text-sm font-medium text-gray-900">{quantity}</span>
                </div>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-11 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button
                size="lg"
                className="flex-1 h-11 text-white hover:opacity-90 transition-opacity shadow-sm"
                style={{ backgroundColor: brandColor }}
                onClick={handleAddToCart}
                aria-label={`Add ${quantity} ${item.name} to cart for $${(item.price * quantity).toFixed(2)}`}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add ${(item.price * quantity).toFixed(2)}
              </Button>
            </div>
          )}

          {/* Recommendations Section */}
          {showRecommendations && recommendations.length > 0 && (
            <>
              <Separator className="my-6" />
              
              <div className="space-y-4">
                {/* Section Title */}
                <h3 className="text-base font-semibold text-gray-900">
                  You might also like
                </h3>

                {/* Horizontal Scroll Recommendations */}
                <div className="overflow-x-auto -mx-2 px-2 scrollbar-hide">
                  <div className="flex gap-3 pb-2">
                    {recommendations.map((rec) => (
                      <button
                        key={rec.id}
                        onClick={() => {
                          if (onItemClick) {
                            onClose();
                            onItemClick(rec);
                          }
                        }}
                        className="flex-shrink-0 w-[150px] bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                      >
                        {/* Recommendation Image */}
                        <div className="relative aspect-square bg-gray-100">
                          <ImageWithFallback
                            src={`https://source.unsplash.com/300x300/?${encodeURIComponent(rec.image)}`}
                            alt={rec.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Reason Badge */}
                          <div className="absolute top-2 left-2">
                            <Badge 
                              className="text-xs px-2 py-0.5 bg-white/95 backdrop-blur-sm border-0 shadow-sm"
                              variant="secondary"
                            >
                              {rec.reasonText}
                            </Badge>
                          </div>
                          {/* Quick Add */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Check if this is a weight-based item
                              const isWeightBased = rec.unit && rec.unit !== 'each';

                              if (isWeightBased) {
                                // For weight-based items, open the modal to select weight
                                if (onItemClick) {
                                  onClose();
                                  onItemClick(rec);
                                }
                              } else {
                                // For count-based items, quick add
                                addItem({
                                  sku: rec.id,
                                  name: rec.name,
                                  price: Math.round(rec.price * 100),
                                  priceUnit: rec.unit || 'each',
                                  unitLabel: rec.unitLabel,
                                  qty: 1,
                                  image: rec.imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(rec.image)}`,
                                });
                                toast.success(`Added ${rec.name} to cart`);
                              }
                            }}
                            className="absolute bottom-2 right-2 w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: brandColor }}
                            aria-label={`Quick add ${rec.name}`}
                          >
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>
                        {/* Recommendation Info */}
                        <div className="p-2">
                          <h4 className="text-xs font-medium text-gray-900 line-clamp-1 mb-1">
                            {rec.name}
                          </h4>
                          <p 
                            className="text-xs font-semibold"
                            style={{ color: brandColor }}
                          >
                            ${rec.price.toFixed(2)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={onClose}
                  >
                    Done Shopping
                  </Button>
                  <Button
                    className="flex-1 h-11 text-white"
                    style={{ backgroundColor: brandColor }}
                    onClick={() => setShowRecommendations(false)}
                  >
                    Keep Browsing
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
