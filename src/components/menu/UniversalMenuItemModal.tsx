/**
 * Universal Menu Item Modal
 * Production-ready, themeable modal for any food business
 * Supports variants, add-ons, nutrition, allergens, and dynamic pricing
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react';
import { X, Plus, Minus, ShoppingCart, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Skeleton } from '../ui/skeleton';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { toast } from 'sonner';

import {
  UniversalMenuItem,
  ThemeTokens,
  ValidationError,
  formatMoney,
  toMoney,
} from '../../lib/menu/types';
import { calculateTotalPrice, getChoicePriceText } from '../../lib/menu/pricing';
import { validateSelections, getHelperText } from '../../lib/menu/validation';
import { saveSelection, loadSelection } from '../../lib/menu/storage';

interface UniversalMenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: UniversalMenuItem;
  theme: ThemeTokens;
  onAddToCart: (payload: AddToCartPayload) => void;
  isLoading?: boolean;
  recommendedItems?: UniversalMenuItem[];
  onItemClick?: (item: UniversalMenuItem) => void;
}

// API payload matching spec
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
}

// Analytics helper
const trackEvent = (eventName: string, properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).analytics) {
    (window as any).analytics.track(eventName, properties);
  }
  // Also log to console for debugging
  console.log(`[Analytics] ${eventName}`, properties);
};

export const UniversalMenuItemModal = ({
  isOpen,
  onClose,
  item,
  theme,
  onAddToCart,
  isLoading = false,
  recommendedItems = [],
  onItemClick,
}: UniversalMenuItemModalProps) => {
  // State
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string[]>>({});
  const [selectedAddons, setSelectedAddons] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  
  const firstErrorRef = useRef<HTMLDivElement>(null);

  // Track modal open
  useEffect(() => {
    if (isOpen) {
      trackEvent('menu_modal_open', { item_id: item.id });
    }
  }, [isOpen, item.id]);

  // Load saved selections on mount
  useEffect(() => {
    if (!isOpen) return;
    
    const saved = loadSelection(item.id);
    if (saved) {
      setSelectedVariants(saved.variants);
      setSelectedAddons(saved.addons);
      setQuantity(saved.quantity);
      setNotes(saved.notes);
    } else {
      // Initialize with defaults
      initializeDefaults();
    }
  }, [isOpen, item.id]);

  // Initialize default selections
  const initializeDefaults = () => {
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
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    return calculateTotalPrice(item, selectedVariants, selectedAddons, quantity);
  }, [item, selectedVariants, selectedAddons, quantity]);

  // Calculate unit price (before quantity multiplication)
  const unitPrice = useMemo(() => {
    return calculateTotalPrice(item, selectedVariants, selectedAddons, 1);
  }, [item, selectedVariants, selectedAddons]);

  // Animated price value
  const priceSpring = useSpring(totalPrice.amountCents, {
    stiffness: 300,
    damping: 30,
  });

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
    
    // Track analytics
    trackEvent('menu_variant_select', {
      item_id: item.id,
      group_id: groupId,
      choice_id: choiceId,
    });
    
    // Clear error for this group
    setErrors(prev => prev.filter(e => e.groupId !== groupId));
  };

  // Handle addon selection
  const handleAddonChange = (groupId: string, choiceId: string, type: 'single' | 'multi') => {
    const isCurrentlySelected = selectedAddons[groupId]?.includes(choiceId);
    
    setSelectedAddons(prev => {
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
    
    // Track analytics
    trackEvent('menu_addon_toggle', {
      item_id: item.id,
      group_id: groupId,
      choice_id: choiceId,
      checked: !isCurrentlySelected,
    });
    
    setErrors(prev => prev.filter(e => e.groupId !== groupId));
  };

  // Handle quantity change
  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    trackEvent('menu_qty_change', {
      item_id: item.id,
      qty: newQty,
    });
  };

  // Validate and add to cart
  const handleAddToCart = () => {
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
      // Focus first error
      setTimeout(() => firstErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
      return;
    }

    // Save selection for quick reorder
    saveSelection(item.id, {
      variants: selectedVariants,
      addons: selectedAddons,
      quantity,
      notes,
    });

    // Create payload matching spec
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
    };

    // Track analytics
    trackEvent('menu_add_to_cart', {
      item_id: item.id,
      qty: quantity,
      total_cents: totalPrice.amountCents,
    });

    onAddToCart(payload);
    toast.success(`Added ${quantity}x ${item.name} to cart`);

    // Show recommendations if available
    if (recommendedItems.length > 0) {
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
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        handleAddToCart();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleAddToCart, onClose]);

  // Get badge tone color
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent 
            className="max-w-[920px] w-full mx-auto bg-white p-0 overflow-hidden"
            style={{
              borderRadius: theme.radius.replace('rounded-', ''),
              boxShadow: theme.shadow,
            }}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-50 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Accessibility */}
            <DialogHeader className="sr-only">
              <DialogTitle>{item.name}</DialogTitle>
              <DialogDescription>
                {item.description}. Price: {formatMoney(item.basePrice)}
              </DialogDescription>
            </DialogHeader>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[85vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
                {/* Left Column: Image */}
                <div className="flex items-start justify-center">
                  <div className={`w-full max-w-[420px] aspect-[4/3] ${theme.radius} overflow-hidden ${theme.shadow} bg-gray-100`}>
                    {isLoading ? (
                      <Skeleton className="w-full h-full" />
                    ) : item.imageUrl ? (
                      <ImageWithFallback
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <div className="text-center text-gray-400">
                          <div className="w-20 h-20 mx-auto mb-2 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-sm">No image</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Controls - 16px section spacing, 12px inside */}
                <div className="flex flex-col gap-4">
                  {/* 1. Title + Price */}
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm font-semibold text-gray-800 leading-tight">
                      {item.name}
                    </h2>
                    <motion.span 
                      className={`text-sm font-semibold shrink-0 ${theme.accent}`}
                    >
                      {formatMoney(item.basePrice)}
                    </motion.span>
                  </div>

                  {/* 2. Description */}
                  {item.description && (
                    <p className="text-sm text-gray-500 leading-6 -mt-2">
                      {item.description}
                    </p>
                  )}

                  {/* 3. Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 -mt-1">
                      {item.tags.map(tag => (
                        <Badge 
                          key={tag.id}
                          className={`${theme.chip.bg} ${theme.chip.text} px-2 py-1 rounded-full text-xs inline-flex items-center gap-1 border-0`}
                        >
                          {tag.icon && <span>{tag.icon}</span>}
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Sold Out Warning */}
                  {item.soldOut && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg -mt-1">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <p className="text-sm text-red-700">This item is currently sold out</p>
                    </div>
                  )}

                  {/* Divider */}
                  <Separator className="border-t border-gray-200 my-0" />

                  {/* 4. Options Groups - 12px spacing inside */}
                  <div className="space-y-3">
                    {/* Variant Groups */}
                    {item.variantGroups && item.variantGroups.length > 0 && (
                      <>
                        {item.variantGroups.map((group, idx) => {
                          const error = errors.find(e => e.groupId === group.id);
                          const helperText = getHelperText(group);
                          const isFirstError = error && errors[0]?.groupId === group.id;

                          return (
                            <div 
                              key={group.id}
                              ref={isFirstError ? firstErrorRef : null}
                              className="space-y-3"
                            >
                              {/* Group Header */}
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-800">
                                  {group.title}
                                  {group.required && <span className="text-red-500 ml-1">*</span>}
                                </h3>
                                {helperText && (
                                  <span className="text-xs text-gray-500">{helperText}</span>
                                )}
                              </div>

                              {/* Single Select - Radio */}
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
                                          className={`flex items-center space-x-3 p-3 ${theme.border} ${theme.radius} hover:bg-gray-50 transition-colors ${
                                            choice.soldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                          }`}
                                        >
                                          <RadioGroupItem
                                            value={choice.id}
                                            id={`${group.id}-${choice.id}`}
                                            disabled={choice.soldOut}
                                          />
                                          <Label
                                            htmlFor={`${group.id}-${choice.id}`}
                                            className="flex-1 flex items-center justify-between cursor-pointer"
                                          >
                                            <span className="text-sm">
                                              {choice.label}
                                              {choice.soldOut && <span className="text-xs text-gray-500 ml-2">(Sold out)</span>}
                                            </span>
                                            {priceText && (
                                              <span className={`text-sm ${theme.accent}`}>{priceText}</span>
                                            )}
                                          </Label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </RadioGroup>
                              ) : (
                                // Multi Select - Checkboxes
                                <div className="space-y-2">
                                  {group.choices.map(choice => {
                                    const isSelected = selectedVariants[group.id]?.includes(choice.id);
                                    const priceText = getChoicePriceText(choice.priceDeltaCents);
                                    
                                    return (
                                      <div
                                        key={choice.id}
                                        className={`flex items-center space-x-3 p-3 ${theme.border} ${theme.radius} hover:bg-gray-50 transition-colors ${
                                          choice.soldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                        }`}
                                        onClick={() => !choice.soldOut && handleVariantChange(group.id, choice.id, 'multi')}
                                      >
                                        <Checkbox
                                          id={`${group.id}-${choice.id}`}
                                          checked={isSelected}
                                          disabled={choice.soldOut}
                                          onCheckedChange={() => handleVariantChange(group.id, choice.id, 'multi')}
                                        />
                                        <Label
                                          htmlFor={`${group.id}-${choice.id}`}
                                          className="flex-1 flex items-center justify-between cursor-pointer"
                                        >
                                          <span className="text-sm">
                                            {choice.label}
                                            {choice.description && (
                                              <span className="block text-xs text-gray-500 mt-0.5">{choice.description}</span>
                                            )}
                                          </span>
                                          {priceText && (
                                            <span className={`text-sm ${theme.accent}`}>{priceText}</span>
                                          )}
                                        </Label>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Error Message */}
                              {error && (
                                <motion.p
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-sm text-red-600 flex items-center gap-1"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                  {error.message}
                                </motion.p>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}

                    {/* Addon Groups */}
                    {item.addonGroups && item.addonGroups.length > 0 && (
                      <>
                        {item.addonGroups.map(group => {
                          const error = errors.find(e => e.groupId === group.id);
                          const helperText = getHelperText(group);

                          return (
                            <div key={group.id} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-gray-800">
                                  {group.title}
                                  {group.required && <span className="text-red-500 ml-1">*</span>}
                                </h3>
                                {helperText && (
                                  <span className="text-xs text-gray-500">{helperText}</span>
                                )}
                              </div>

                              <div className="space-y-2">
                                {group.choices.map(choice => {
                                  const isSelected = selectedAddons[group.id]?.includes(choice.id);
                                  const priceText = getChoicePriceText(choice.priceDeltaCents);
                                  
                                  return (
                                    <div
                                      key={choice.id}
                                      className={`flex items-center space-x-3 p-3 ${theme.border} ${theme.radius} hover:bg-gray-50 transition-colors ${
                                        choice.soldOut ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                      }`}
                                      onClick={() => !choice.soldOut && handleAddonChange(group.id, choice.id, group.type)}
                                    >
                                      <Checkbox
                                        id={`addon-${group.id}-${choice.id}`}
                                        checked={isSelected}
                                        disabled={choice.soldOut}
                                        onCheckedChange={() => handleAddonChange(group.id, choice.id, group.type)}
                                      />
                                      <Label
                                        htmlFor={`addon-${group.id}-${choice.id}`}
                                        className="flex-1 flex items-center justify-between cursor-pointer"
                                      >
                                        <span className="text-sm">
                                          {choice.label}
                                          {choice.description && (
                                            <span className="block text-xs text-gray-500 mt-0.5">{choice.description}</span>
                                          )}
                                        </span>
                                        {priceText && (
                                          <span className={`text-sm font-medium ${theme.accent}`}>{priceText}</span>
                                        )}
                                      </Label>
                                    </div>
                                  );
                                })}
                              </div>

                              {error && (
                                <motion.p
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="text-sm text-red-600 flex items-center gap-1"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                  {error.message}
                                </motion.p>
                              )}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* 5. Notes */}
                  <div className="space-y-2">
                    <label 
                      htmlFor="special-notes" 
                      className="text-sm font-medium text-gray-700 block"
                    >
                      Special Instructions <span className="text-gray-400">(Optional)</span>
                    </label>
                    <Textarea
                      id="special-notes"
                      placeholder={item.notesPlaceholder || "e.g., No onions, extra sauce, well done..."}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="text-sm w-full"
                      rows={2}
                    />
                  </div>

                  {/* 7. Extras - Nutrition & Allergens */}
                  {(item.nutrition || item.allergens) && (
                    <Accordion type="single" collapsible className="w-full">
                      {item.nutrition && (
                        <AccordionItem value="nutrition">
                          <AccordionTrigger className="text-sm font-medium text-gray-800">
                            Nutrition Information
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                              {item.nutrition.calories !== undefined && (
                                <div>
                                  <p className="text-xs text-gray-500">Calories</p>
                                  <p className="text-sm font-medium">{item.nutrition.calories}</p>
                                </div>
                              )}
                              {item.nutrition.protein && (
                                <div>
                                  <p className="text-xs text-gray-500">Protein</p>
                                  <p className="text-sm font-medium">{item.nutrition.protein}</p>
                                </div>
                              )}
                              {item.nutrition.carbs && (
                                <div>
                                  <p className="text-xs text-gray-500">Carbs</p>
                                  <p className="text-sm font-medium">{item.nutrition.carbs}</p>
                                </div>
                              )}
                              {item.nutrition.fat && (
                                <div>
                                  <p className="text-xs text-gray-500">Fat</p>
                                  <p className="text-sm font-medium">{item.nutrition.fat}</p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {item.allergens && item.allergens.length > 0 && (
                        <AccordionItem value="allergens">
                          <AccordionTrigger className="text-sm font-medium text-gray-800">
                            Allergen Information
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="pt-2">
                              <p className="text-sm text-gray-700 mb-2">This item contains:</p>
                              <div className="flex flex-wrap gap-2">
                                {item.allergens.map(allergen => (
                                  <Badge 
                                    key={allergen}
                                    variant="outline"
                                    className="bg-yellow-50 text-yellow-800 border-yellow-200 capitalize"
                                  >
                                    {allergen}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  )}
                </div>
              </div>

              {/* 6. Footer - Sticky on mobile */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 md:px-6">
                <div className="max-w-[920px] mx-auto">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Quantity Stepper */}
                    <div className={`h-12 ${theme.border} rounded-xl inline-flex items-center overflow-hidden`}>
                      <button
                        onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                        className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <div className="w-12 h-12 flex items-center justify-center border-x border-gray-200">
                        <span className="text-sm font-medium text-gray-900">{quantity}</span>
                      </div>
                      <button
                        onClick={() => handleQuantityChange(quantity + 1)}
                        className="w-12 h-12 flex items-center justify-center hover:bg-gray-50 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    {/* Add Button */}
                    <Button
                      className={`h-12 px-5 text-white ${theme.brand.bg} ${theme.brand.hover} rounded-xl font-semibold w-full sm:w-auto flex-1`}
                      onClick={handleAddToCart}
                      disabled={item.soldOut || isLoading}
                      aria-label={`Add ${quantity} ${item.name} to cart for ${formatMoney(totalPrice)}`}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add {formatMoney(totalPrice)}
                    </Button>
                  </div>
                  
                  <p className="text-xs text-center text-gray-500">
                    Tax and fees calculated at checkout
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {showRecommendations && recommendedItems.length > 0 && (
                <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    You might also like
                  </h3>

                  <div className="overflow-x-auto -mx-2 px-2">
                    <div className="flex gap-3 pb-2">
                      {recommendedItems.slice(0, 4).map(recItem => (
                        <button
                          key={recItem.id}
                          onClick={() => onItemClick?.(recItem)}
                          className="flex-shrink-0 w-[160px] md:w-[180px] bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div className="aspect-square bg-gray-100">
                            {recItem.imageUrl ? (
                              <ImageWithFallback
                                src={recItem.imageUrl}
                                alt={recItem.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <span className="text-4xl">🍽️</span>
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h4 className="text-xs font-medium text-gray-900 line-clamp-2 mb-1">
                              {recItem.name}
                            </h4>
                            <p className={`text-sm font-semibold ${theme.accent}`}>
                              {formatMoney(recItem.basePrice)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <Button
                      variant="outline"
                      className="flex-1 h-11"
                      onClick={onClose}
                    >
                      Done Shopping
                    </Button>
                    <Button
                      className={`flex-1 h-11 text-white ${theme.brand.bg} ${theme.brand.hover}`}
                      onClick={() => setShowRecommendations(false)}
                    >
                      Keep Browsing
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};
