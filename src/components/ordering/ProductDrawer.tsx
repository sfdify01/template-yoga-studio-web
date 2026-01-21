/**
 * Product Configuration Drawer
 * Right-side drawer (desktop 480-560px) / full-screen sheet (mobile)
 * High-conversion, accessible, mobile-first design
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, ShoppingCart, AlertCircle, ZoomIn } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';
import { UniversalMenuItem, formatMoney } from '../../lib/menu/types';
import { calculateTotalPrice, getChoicePriceText } from '../../lib/menu/pricing';
import { validateSelections, getHelperText } from '../../lib/menu/validation';
import { AISuggestions } from './AISuggestions';

interface ProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: UniversalMenuItem | null;
  onAddToCart: (payload: AddToCartPayload) => void;
  brandColor: string;
  cartItems?: any[];
  allMenuItems?: UniversalMenuItem[];
  onItemClick?: (item: UniversalMenuItem) => void;
}

export interface AddToCartPayload {
  item_id: string;
  qty: number;
  notes?: string;
  selections: {
    variants: Array<{ group_id: string; choice_id: string }>;
    addons: Array<{ group_id: string; choice_id: string }>;
  };
  unit_price_cents: number;
  total_cents: number;
  name: string;
  image?: string;
}

// Analytics helper
const trackEvent = (eventName: string, properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track(eventName, properties);
  }
  console.log(`[Analytics] ${eventName}`, properties);
};

export const ProductDrawer = ({
  isOpen,
  onClose,
  item,
  onAddToCart,
  brandColor,
  cartItems = [],
  allMenuItems = [],
  onItemClick,
}: ProductDrawerProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string[]>>({});
  const [selectedAddons, setSelectedAddons] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Array<{ groupId: string; message: string }>>([]);
  const [imageZoom, setImageZoom] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  // Reset state when item changes
  useEffect(() => {
    if (!item || !isOpen) return;
    
    setQuantity(1);
    setNotes('');
    setErrors([]);
    setShowSuggestions(true);
    
    // Initialize defaults
    const defaultVariants: Record<string, string[]> = {};
    const defaultAddons: Record<string, string[]> = {};

    item.variantGroups?.forEach(group => {
      const defaultChoice = group.choices.find(c => c.default);
      if (defaultChoice) {
        defaultVariants[group.id] = [defaultChoice.id];
      }
    });

    item.addonGroups?.forEach(group => {
      const defaultChoices = group.choices.filter(c => c.default);
      if (defaultChoices.length > 0) {
        defaultAddons[group.id] = defaultChoices.map(c => c.id);
      }
    });

    setSelectedVariants(defaultVariants);
    setSelectedAddons(defaultAddons);

    // Track view
    trackEvent('product_viewed', { id: item.id });
  }, [item, isOpen]);

  // Calculate prices
  const unitPrice = useMemo(() => {
    if (!item) return { amountCents: 0, currency: 'USD' };
    return calculateTotalPrice(item, selectedVariants, selectedAddons, 1);
  }, [item, selectedVariants, selectedAddons]);

  const totalPrice = useMemo(() => {
    if (!item) return { amountCents: 0, currency: 'USD' };
    return calculateTotalPrice(item, selectedVariants, selectedAddons, quantity);
  }, [item, selectedVariants, selectedAddons, quantity]);

  // Handle variant selection
  const handleVariantChange = (groupId: string, choiceId: string, type: 'single' | 'multi') => {
    setSelectedVariants(prev => {
      if (type === 'single') {
        return { ...prev, [groupId]: [choiceId] };
      } else {
        const current = prev[groupId] || [];
        const isSelected = current.includes(choiceId);
        if (isSelected) {
          return { ...prev, [groupId]: current.filter(id => id !== choiceId) };
        } else {
          return { ...prev, [groupId]: [...current, choiceId] };
        }
      }
    });

    // Track modifier selection
    if (item) {
      const group = item.variantGroups?.find(g => g.id === groupId);
      const choice = group?.choices.find(c => c.id === choiceId);
      trackEvent('modifier_selected', {
        group: groupId,
        option: choiceId,
        price_delta: choice?.priceDeltaCents || 0,
      });
    }

    setErrors(prev => prev.filter(e => e.groupId !== groupId));
  };

  // Handle addon selection
  const handleAddonChange = (groupId: string, choiceId: string) => {
    setSelectedAddons(prev => {
      const current = prev[groupId] || [];
      const isSelected = current.includes(choiceId);
      if (isSelected) {
        return { ...prev, [groupId]: current.filter(id => id !== choiceId) };
      } else {
        return { ...prev, [groupId]: [...current, choiceId] };
      }
    });

    if (item) {
      const group = item.addonGroups?.find(g => g.id === groupId);
      const choice = group?.choices.find(c => c.id === choiceId);
      trackEvent('modifier_selected', {
        group: groupId,
        option: choiceId,
        price_delta: choice?.priceDeltaCents || 0,
      });
    }

    setErrors(prev => prev.filter(e => e.groupId !== groupId));
  };

  // Validate and add to cart
  const handleAddToCart = () => {
    if (!item) return;

    if (item.soldOut) {
      toast.error('This item is currently sold out');
      return;
    }

    // Validate
    const allGroups = [...(item.variantGroups || []), ...(item.addonGroups || [])];
    const allSelections = { ...selectedVariants, ...selectedAddons };
    const validationErrors = validateSelections(allGroups, allSelections);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error('Please complete all required selections');
      return;
    }

    // Create payload
    const variantSelections = Object.entries(selectedVariants).flatMap(([groupId, choiceIds]) =>
      choiceIds.map(choiceId => ({ group_id: groupId, choice_id: choiceId }))
    );
    
    const addonSelections = Object.entries(selectedAddons).flatMap(([groupId, choiceIds]) =>
      choiceIds.map(choiceId => ({ group_id: groupId, choice_id: choiceId }))
    );

    const payload: AddToCartPayload = {
      item_id: item.id,
      qty: quantity,
      notes: notes || undefined,
      selections: {
        variants: variantSelections,
        addons: addonSelections,
      },
      unit_price_cents: unitPrice.amountCents,
      total_cents: totalPrice.amountCents,
      name: item.name,
      image: item.imageUrl,
    };

    // Track add to cart
    trackEvent('add_to_cart', {
      id: item.id,
      qty: quantity,
      price_total: totalPrice.amountCents,
    });

    onAddToCart(payload);
    toast.success(`Added ${quantity}x ${item.name}`, {
      duration: 2000,
    });

    onClose();
  };

  // Get badge styling
  const getBadgeClasses = (tone: string) => {
    const toneMap = {
      success: 'bg-green-100 text-green-700 border-green-200',
      warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      info: 'bg-blue-100 text-blue-700 border-blue-200',
      danger: 'bg-red-100 text-red-700 border-red-200',
      neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return toneMap[tone] || toneMap.neutral;
  };

  if (!item) return null;

  const isValid = validateSelections(
    [...(item.variantGroups || []), ...(item.addonGroups || [])],
    { ...selectedVariants, ...selectedAddons }
  ).length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[560px] p-0 overflow-y-auto"
        onInteractOutside={(e) => {
          // Allow closing on backdrop click
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-50 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Accessibility */}
        <SheetHeader className="sr-only">
          <SheetTitle>{item.name} - ${(item.basePrice.amountCents / 100).toFixed(2)}</SheetTitle>
          <SheetDescription>
            {item.description || 'Configure and add this item to your cart'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pb-32">
            <div className="space-y-5 p-5">
              {/* 1. Media - 16:9 with overlay badges */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                {item.imageUrl ? (
                  <>
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setImageZoom(true)}
                      className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                      aria-label="Zoom image"
                    >
                      <ZoomIn className="w-5 h-5 text-gray-700" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl">🍽️</span>
                  </div>
                )}
                
                {/* Badge Overlays */}
                {item.tags && item.tags.length > 0 && (
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {item.tags.map(tag => (
                      <Badge 
                        key={tag.id}
                        className={`h-6 px-2 text-xs font-medium ${getBadgeClasses(tag.tone)}`}
                      >
                        {tag.icon && <span className="mr-1">{tag.icon}</span>}
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Title + Live Price */}
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-[22px] font-semibold text-gray-900 leading-tight">
                  {item.name}
                </h2>
                <motion.div
                  key={totalPrice.amountCents}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-[22px] font-semibold shrink-0"
                  style={{ color: brandColor }}
                >
                  {formatMoney(totalPrice)}
                </motion.div>
              </div>

              {/* 3. Description + Dietary Chips */}
              {item.description && (
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              )}

              {/* Dietary chips */}
              {item.tags && item.tags.some(t => ['success', 'info'].includes(t.tone)) && (
                <div className="flex flex-wrap gap-2">
                  {item.tags
                    .filter(t => ['success', 'info'].includes(t.tone))
                    .map(tag => (
                      <span
                        key={tag.id}
                        className="h-6 px-3 rounded-full bg-gray-100 text-gray-700 text-xs font-medium inline-flex items-center gap-1"
                      >
                        {tag.icon && <span>{tag.icon}</span>}
                        {tag.label}
                      </span>
                    ))}
                </div>
              )}

              {item.soldOut && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700">This item is currently unavailable</p>
                </div>
              )}

              <Separator />

              {/* 4. Options (Modifiers) - Grouped */}
              {item.variantGroups && item.variantGroups.length > 0 && (
                <div className="space-y-5">
                  {item.variantGroups.map(group => {
                    const error = errors.find(e => e.groupId === group.id);
                    const helperText = getHelperText(group);

                    return (
                      <div key={group.id} className="space-y-3">
                        {/* Group Header */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-[15px] font-semibold text-gray-900">
                            {group.title}
                            {group.required && <span className="text-red-500 ml-1">*</span>}
                          </h3>
                          {helperText && (
                            <span className="text-xs text-gray-500">{helperText}</span>
                          )}
                        </div>

                        {/* Single Select */}
                        {group.type === 'single' ? (
                          <RadioGroup
                            value={selectedVariants[group.id]?.[0] || ''}
                            onValueChange={(value) => handleVariantChange(group.id, value, 'single')}
                          >
                            <div className="space-y-2">
                              {group.choices.map(choice => {
                                const priceText = getChoicePriceText(choice.priceDeltaCents);
                                
                                return (
                                  <div
                                    key={choice.id}
                                    className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors min-h-[48px] ${
                                      choice.soldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer border-gray-200'
                                    }`}
                                  >
                                    <RadioGroupItem
                                      value={choice.id}
                                      id={`${group.id}-${choice.id}`}
                                      disabled={choice.soldOut}
                                      className="shrink-0"
                                    />
                                    <Label
                                      htmlFor={`${group.id}-${choice.id}`}
                                      className="flex-1 flex items-center justify-between cursor-pointer"
                                    >
                                      <span className="text-[15px]">
                                        {choice.label}
                                        {choice.soldOut && (
                                          <span className="text-xs text-gray-500 ml-2">(Unavailable)</span>
                                        )}
                                      </span>
                                      {priceText && (
                                        <span className="text-[15px] font-medium" style={{ color: brandColor }}>
                                          {priceText}
                                        </span>
                                      )}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </RadioGroup>
                        ) : (
                          // Multi Select
                          <div className="space-y-2">
                            {group.choices.map(choice => {
                              const isSelected = selectedVariants[group.id]?.includes(choice.id);
                              const priceText = getChoicePriceText(choice.priceDeltaCents);
                              
                              return (
                                <div
                                  key={choice.id}
                                  className={`flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors min-h-[48px] ${
                                    choice.soldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer border-gray-200'
                                  }`}
                                  onClick={() => !choice.soldOut && handleVariantChange(group.id, choice.id, 'multi')}
                                >
                                  <Checkbox
                                    id={`${group.id}-${choice.id}`}
                                    checked={isSelected}
                                    disabled={choice.soldOut}
                                    className="shrink-0"
                                  />
                                  <Label
                                    htmlFor={`${group.id}-${choice.id}`}
                                    className="flex-1 flex items-center justify-between cursor-pointer"
                                  >
                                    <span className="text-[15px]">{choice.label}</span>
                                    {priceText && (
                                      <span className="text-[15px] font-medium" style={{ color: brandColor }}>
                                        {priceText}
                                      </span>
                                    )}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {error && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {error.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 5. Add-ons / Upsizes */}
              {item.addonGroups && item.addonGroups.length > 0 && (
                <div className="space-y-5">
                  {item.addonGroups.map(group => {
                    const error = errors.find(e => e.groupId === group.id);
                    const helperText = getHelperText(group);

                    return (
                      <div key={group.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[15px] font-semibold text-gray-900">
                            {group.title}
                          </h3>
                          {helperText && (
                            <span className="text-xs text-gray-500">{helperText}</span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {group.choices.map(choice => {
                            const isSelected = selectedAddons[group.id]?.includes(choice.id);
                            const priceText = getChoicePriceText(choice.priceDeltaCents);
                            
                            return (
                              <button
                                key={choice.id}
                                onClick={() => !choice.soldOut && handleAddonChange(group.id, choice.id)}
                                disabled={choice.soldOut}
                                className={`h-10 px-4 rounded-full text-sm font-medium transition-all min-w-[80px] ${
                                  isSelected
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                } ${choice.soldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                {choice.label} {priceText}
                              </button>
                            );
                          })}
                        </div>

                        {error && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {error.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 6. Notes */}
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium text-gray-700">
                  Special Instructions <span className="text-gray-400">(optional)</span>
                </label>
                <Textarea
                  id="notes"
                  placeholder={item.notesPlaceholder || "e.g., No onions, extra sauce..."}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[48px] text-[15px] resize-none"
                  rows={2}
                />
              </div>

              {/* 8. AI Suggestions */}
              {showSuggestions && allMenuItems.length > 0 && (
                <AISuggestions
                  cartItems={cartItems}
                  currentItem={item}
                  allMenuItems={allMenuItems}
                  brandColor={brandColor}
                  onItemClick={onItemClick}
                  onQuickAdd={(suggestionItem) => {
                    // Quick add with defaults
                    const payload: AddToCartPayload = {
                      item_id: suggestionItem.id,
                      qty: 1,
                      selections: { variants: [], addons: [] },
                      unit_price_cents: suggestionItem.basePrice.amountCents,
                      total_cents: suggestionItem.basePrice.amountCents,
                      name: suggestionItem.name,
                      image: suggestionItem.imageUrl,
                    };
                    onAddToCart(payload);
                    trackEvent('ai_suggestion_added', { item_id: suggestionItem.id });
                    toast.success(`Added ${suggestionItem.name}`);
                  }}
                />
              )}
            </div>
          </div>

          {/* 7. Sticky Footer - Quantity + Add Button */}
          <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-3">
              {/* Quantity Stepper */}
              <div className="h-12 border border-gray-300 rounded-xl inline-flex items-center overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={`Decrease quantity for ${item.name}`}
                >
                  <Minus className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-12 h-12 flex items-center justify-center border-x border-gray-300">
                  <span className="text-[15px] font-semibold text-gray-900">{quantity}</span>
                </div>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label={`Increase quantity for ${item.name}`}
                >
                  <Plus className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Add Button */}
              <Button
                onClick={handleAddToCart}
                disabled={item.soldOut || !isValid}
                className="flex-1 h-12 text-[15px] font-semibold text-white rounded-xl shadow-lg transition-all disabled:opacity-50"
                style={{ 
                  background: !item.soldOut && isValid ? brandColor : undefined,
                }}
                aria-label={`Add ${quantity} ${item.name} to cart for ${formatMoney(totalPrice)}`}
                aria-live="polite"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add {formatMoney(totalPrice)}
              </Button>
            </div>

            <p className="text-xs text-center text-gray-500">
              Secure payment by Stripe • Apple Pay / Google Pay available
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
