import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSetAtom, useAtom, useAtomValue } from 'jotai';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, X, Minimize2, Maximize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { CheckoutStepReview } from './CheckoutStepReview';
import { CheckoutStepDetails } from './CheckoutStepDetails';
import { CheckoutStepConfirmation } from './CheckoutStepConfirmation';
import { useCart } from '../../lib/cart/useCart';
import { toast } from 'sonner';
import { MenuItem, MenuData } from '../../hooks/useConfig';
import { placeOrderAtom } from '../../atoms/orders/orderAtoms';
import {
  cartMinimizedAtom,
  fulfillmentTypeAtom,
  deliveryAddressAtom,
  resetDeliveryAddressAtom,
} from '../../atoms/cart';
import { createDeliveryQuote } from '../../lib/orders/api';
import { getFriendlyDeliveryError } from '../../lib/orders/errors';
import type { CheckoutFormData, DeliveryQuote, OrderDetails, LoyaltySummary, DeliveryAddressInput } from '../../lib/orders/types';
import { saveOrderToHistory } from '../../lib/orders/history';
import { buildGuestUserFromOrder, saveGuestUser } from '../../lib/auth/guest';
import { useAuth } from '../../lib/auth/AuthContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { estimateStripeProcessingFee, DEFAULT_PLATFORM_FEE_RATE, UBER_MAX_TIP_CENTS } from '../../lib/orders/fees';
import { formatQuantityForUber, normalizeUnit } from '../../lib/units';
import type { PriceUnit } from '../../atoms/cart';
import { fetchLoyaltyProfile } from '../../lib/loyalty/api';
import { taxRateAtom } from '../../atoms/config/configAtoms';
import { promoInfoAtom, promoDiscountCentsAtom } from '../../atoms/promo/promoAtoms';

interface SmartCartProps {
  brandColor: string;
  onNavigate: (path: string) => void;
  menu?: MenuData;
  className?: string;
  hasAnnouncementBar?: boolean;
  topOffsetMobile?: string;
  topOffsetDesktop?: string;
  loyaltyConfig?: {
    enabled: boolean;
    earnPerDollar: number;
    rewardThreshold: number;
    loyaltyHref: string;
  };
}

type CheckoutStep = 'review' | 'details' | 'confirmed';

type ConfirmationSummaryItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  quantityDisplay?: string;
  unit?: PriceUnit | null;
  unitLabel?: string | null;
};

type ConfirmationSummary = {
  id: string;
  number: string;
  mode: 'pickup' | 'delivery';
  eta: string;
  items: ConfirmationSummaryItem[];
  totals: {
    subtotal: number;
    deliveryFee: number;
    serviceFee: number;
    tax: number;
    tip: number;
    total: number;
  };
  loyalty?: LoyaltySummary | null;
};

export const SmartCart = ({
  brandColor,
  onNavigate,
  menu,
  className = '',
  hasAnnouncementBar = false,
  topOffsetMobile,
  topOffsetDesktop,
  loyaltyConfig,
}: SmartCartProps) => {
  const { items, clearCart, updateItemQty, removeItem, addItem } = useCart();
  const { refreshUser } = useAuth();
  const placeOrder = useSetAtom(placeOrderAtom);
  const taxRate = useAtomValue(taxRateAtom);
  const appliedPromo = useAtomValue(promoInfoAtom);
  const promoDiscountCents = useAtomValue(promoDiscountCentsAtom);
  const [fulfillmentType, setFulfillmentType] = useAtom(fulfillmentTypeAtom);
  const [deliveryAddress, setDeliveryAddress] = useAtom(deliveryAddressAtom);
  const resetDeliveryAddress = useSetAtom(resetDeliveryAddressAtom);
  const [tip, setTip] = useState<{ mode: 'percent' | 'amount'; value: number }>({
    mode: 'percent',
    value: 15,
  });
  const [showCart, setShowCart] = useState(false); // For mobile drawer
  const [isMinimized, setIsMinimized] = useAtom(cartMinimizedAtom); // For desktop minimize/maximize
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('review');
  const [confirmedOrder, setConfirmedOrder] = useState<ConfirmationSummary | null>(null);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = useState(false);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState(false);
  const [showDeliverySupportModal, setShowDeliverySupportModal] = useState(false);
  const quoteKeyRef = useRef<string | null>(null);
  const deliveryType: 'pickup' | 'delivery' =
    fulfillmentType === 'delivery' ? 'delivery' : 'pickup';
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Ensure stored fulfillment type is valid (allow null to force selection)
  useEffect(() => {
    if (fulfillmentType !== 'pickup' && fulfillmentType !== 'delivery' && fulfillmentType !== null) {
      setFulfillmentType(null);
    }
  }, [fulfillmentType, setFulfillmentType]);

  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const showDesktopCart = itemCount > 0 || checkoutStep === 'confirmed';

  // Flatten menu categories into single array of menu items for recommendations
  const menuItems = useMemo<MenuItem[]>(() => {
    if (!menu || !menu.categories) {
      console.log('ℹ️ Menu data not available yet for recommendations');
      return [];
    }
    try {
      const items = menu.categories.flatMap((category: any) =>
        category.items.map((item: any) => ({
          ...item,
          categoryId: category.id,
        }))
      );
      console.log('✅ Loaded', items.length, 'products for AI recommendations');
      return items;
    } catch (error) {
      console.error('Failed to process menu items for recommendations:', error);
      return [];
    }
  }, [menu]);

  // Clear delivery quote when switching to pickup
  useEffect(() => {
    if (deliveryType === 'pickup') {
      setDeliveryQuote(null);
    } else if (deliveryType === 'delivery' && deliveryAddress) {
      // Trigger quote fetch if we switched back to delivery and have an address
      // This is handled by the quote effect below
    }
  }, [deliveryType, deliveryAddress]);

  // Fetch delivery quote when address changes
  useEffect(() => {
    if (deliveryType !== 'delivery' || !deliveryAddress) {
      setDeliveryQuote(null);
      quoteKeyRef.current = null;
      setDeliveryQuoteLoading(false);
      setDeliveryQuoteError(false);
      return;
    }

    const addr = deliveryAddress;
    if (!addr.line1 || !addr.city || !addr.state || !addr.zip) {
      return;
    }

    const key = `${addr.line1}|${addr.line2 || ''}|${addr.city}|${addr.state}|${addr.zip}`;
    if (deliveryQuote && quoteKeyRef.current === key) {
      return;
    }

    quoteKeyRef.current = key;
    let cancelled = false;

    const fetchQuote = async () => {
      setDeliveryQuoteLoading(true);
      try {
        console.log('📍 Creating delivery quote for address:', {
          line1: addr.line1,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
        });

        const quoteItems = items.map((item) => {
          const {
            quantity,
            descriptionSuffix,
            quantityDisplay,
            unit,
            rawQuantity,
            isWeightBased,
          } = formatQuantityForUber(item.qty, item.priceUnit);
          return {
            name: descriptionSuffix ? `${item.name} ${descriptionSuffix}` : item.name,
            quantity,
            price: item.price * item.qty,
            size: quantityDisplay,
            unit,
            quantityDisplay,
            rawQuantity: isWeightBased ? rawQuantity : undefined,
            weight: isWeightBased ? rawQuantity : undefined,
          };
        });

        const quote = await createDeliveryQuote({
          address: {
            line1: addr.line1,
            line2: addr.line2,
            city: addr.city,
            state: addr.state,
            zip: addr.zip,
            country: addr.country,
            latitude: addr.latitude,
            longitude: addr.longitude,
          },
          items: quoteItems,
        });
        if (cancelled || quoteKeyRef.current !== key) return;
        console.log('✅ Delivery quote received:', quote);
        setDeliveryQuote(quote);
        setDeliveryQuoteError(false);
      } catch (err: any) {
        if (cancelled || quoteKeyRef.current !== key) return;
        console.error('❌ Failed to fetch delivery quote:', err);
        setDeliveryQuote(null);
        const friendlyError = getFriendlyDeliveryError(err);
        toast.error(friendlyError);
        setDeliveryQuoteError(true);
      } finally {
        if (!cancelled) {
          setDeliveryQuoteLoading(false);
        }
      }
    };

    // Debounce slightly to avoid rapid requests
    const timeout = setTimeout(fetchQuote, 600);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [deliveryType, deliveryAddress, items]);

  // Calculate totals (memoized to prevent unnecessary re-renders)
  const totals = useMemo(() => {
    const subtotalCents = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const serviceFeeCents = Math.round(subtotalCents * DEFAULT_PLATFORM_FEE_RATE); // 1% Tabsy platform fee
    const customItemsFeeCents = 0; // For custom items
    const discountCents = promoDiscountCents; // From validated promo code
    const serviceFeeRate = subtotalCents > 0 ? serviceFeeCents / subtotalCents : 0;

    // Calculate delivery fee strictly from quote (no placeholder)
    const quoteDeliveryFeeCents = deliveryType === 'delivery'
      ? deliveryQuote?.feeCents ?? null
      : 0;
    const deliveryFeePending = deliveryType === 'delivery' && (deliveryQuoteLoading || quoteDeliveryFeeCents === null);
    const deliveryFeeCents = typeof quoteDeliveryFeeCents === 'number' ? quoteDeliveryFeeCents : 0;

    const preTaxCents = subtotalCents + serviceFeeCents + deliveryFeeCents + customItemsFeeCents - discountCents;
    const taxCents = Math.round(preTaxCents * taxRate);

    // Calculate tip and cap at Uber's maximum for delivery orders
    const rawTipCents = tip.mode === 'percent'
      ? Math.round(subtotalCents * tip.value / 100)
      : Math.round(tip.value * 100);

    // Cap tip at Uber's maximum for delivery orders
    const tipCents = deliveryType === 'delivery'
      ? Math.min(rawTipCents, UBER_MAX_TIP_CENTS)
      : rawTipCents;

    const tipWasCapped = deliveryType === 'delivery' && rawTipCents > UBER_MAX_TIP_CENTS;

    const totalCents = preTaxCents + taxCents + tipCents;
    const stripeFeeEstimateCents = estimateStripeProcessingFee(totalCents);
    const courierTipCents = deliveryType === 'delivery' ? tipCents : 0;
    const netPayoutCents = Math.max(
      totalCents - stripeFeeEstimateCents - serviceFeeCents - deliveryFeeCents - courierTipCents,
      0
    );

    return {
      subtotal: subtotalCents,
      customItemsFee: customItemsFeeCents > 0 ? customItemsFeeCents : undefined,
      deliveryFee: deliveryFeeCents > 0 ? deliveryFeeCents : undefined,
      serviceFee: serviceFeeCents,
      platformFee: serviceFeeCents,
      serviceFeeRate,
      discount: discountCents > 0 ? discountCents : undefined,
      tax: taxCents,
      tip: tipCents,
      total: totalCents,
      currency: 'USD',
      courier: deliveryType === 'delivery' ? 'uber_direct' : null,
      fulfillmentType: deliveryType,
      stripeFeeEstimate: stripeFeeEstimateCents,
      deliveryFeePending,
      breakdown: {
        subtotal: subtotalCents,
        deliveryFee: deliveryFeeCents,
        tabsyFee: serviceFeeCents,
        stripeProcessingFee: stripeFeeEstimateCents,
        tax: taxCents,
        tip: tipCents,
        discount: discountCents,
        total: totalCents,
        netPayoutEstimate: netPayoutCents,
      },
    };
  }, [items, deliveryType, deliveryQuote, tip.mode, tip.value, taxRate, promoDiscountCents]);

  const handleUpdateQty = (id: string, qty: number) => {
    updateItemQty(id, qty);
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    // TODO: Add notes update to cart context
    console.log('Update notes:', id, notes);
  };

  const handleRemove = (id: string) => {
    removeItem(id);
  };

  const handleEdit = (id: string) => {
    // TODO: Open customization modal
    console.log('Edit item:', id);
  };

  const handleRecommendationAdd = (item: any) => {
    // Convert recommendation to cart item format
    const cartItem = {
      sku: item.id,
      name: item.name,
      price: Math.round(item.price * 100), // Convert to cents
      priceUnit: normalizeUnit(item.unit || item.priceUnit || 'each'),
      unitLabel: item.unitLabel,
      qty: 1,
      image: item.imageUrl,
      mods: [],
      note: '',
    };

    // Add to cart - this will handle merging if the same item already exists
    addItem(cartItem);
  };

  const handleDeliveryQuoteUpdate = useCallback(
    (quote: DeliveryQuote | null) => {
      setDeliveryQuote(quote);
    },
    []
  );

  const handleDeliveryTypeChange = useCallback(
    (type: 'pickup' | 'delivery') => {
      setFulfillmentType(type === 'delivery' ? 'delivery' : 'pickup');
      if (type === 'pickup') {
        setDeliveryQuote(null);
        resetDeliveryAddress();
      }
    },
    [resetDeliveryAddress, setFulfillmentType]
  );

  const handleContinueToCheckout = () => {
    setCheckoutStep('details');
  };

  const handleBackToReview = () => {
    // Don't clear delivery quote - it should persist unless address changes
    // Only reset the checkout step to go back to review
    setCheckoutStep('review');
  };

  const hasCompleteDeliveryAddress =
    deliveryType === 'delivery' &&
    !!deliveryAddress?.line1 &&
    !!deliveryAddress?.city &&
    !!deliveryAddress?.state &&
    !!deliveryAddress?.zip;

  const deliveryBlocked =
    deliveryType === 'delivery' &&
    (
      !hasCompleteDeliveryAddress ||
      deliveryQuoteLoading ||
      deliveryQuoteError ||
      !deliveryQuote
    );

  const checkoutBlocked = fulfillmentType === null || deliveryBlocked;

  const showDeliveryError =
    deliveryType === 'delivery' &&
    hasCompleteDeliveryAddress &&
    deliveryQuoteError;

  const supportInfo = {
    phone: '+1 (772) 773-7680',
    email: 'info@tabsy.us',
    address: '3124 Illinois Rte 59 Suite 154, Naperville, IL 60564',
  };

  const buildConfirmation = (order: OrderDetails, loyalty?: LoyaltySummary | null): ConfirmationSummary => ({
    id: order.id,
    number: order.shortCode,
    mode: order.fulfillmentType,
    eta:
      order.fulfillmentType === 'delivery'
        ? order.deliveryEta || order.pickupEta || order.createdAt
        : order.pickupEta || order.createdAt,
    items: order.items.map((line) => {
      const unitPrice =
        line.quantity > 0
          ? Math.round(line.totalPriceCents / line.quantity)
          : line.unitPriceCents;
      const quantityDisplay =
        line.quantityDisplay ||
        formatQuantityDisplay(line.quantity, line.unit || undefined);
      return {
        id: line.id,
        name: line.name,
        qty: line.quantity,
        quantityDisplay,
        unit: line.unit,
        unitLabel: line.unitLabel,
        price: unitPrice,
      };
    }),
    totals: {
      subtotal: order.totals.subtotalCents,
      deliveryFee: order.totals.deliveryFeeCents || 0,
      serviceFee: order.totals.serviceFeeCents,
      tax: order.totals.taxCents,
      tip: order.totals.tipCents,
      total: order.totals.totalCents,
    },
    loyalty,
  });

  const handlePlaceOrder = async (formData: CheckoutFormData) => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const normalizedDeliveryType: 'pickup' | 'delivery' =
      deliveryType === 'delivery' ? 'delivery' : 'pickup';

    try {
      console.log('🛒 Placing order...', {
        deliveryType: normalizedDeliveryType,
        hasDeliveryQuote: !!deliveryQuote,
        deliveryQuote,
        formData: {
          ...formData,
          delivery: formData.delivery,
        },
        totals,
      });

      const { order, loyalty } = await placeOrder({
        form: formData,
        deliveryType: normalizedDeliveryType,
        totals: {
          subtotal: totals.subtotal,
          deliveryFee: totals.deliveryFee || 0,
          serviceFee: totals.serviceFee,
          tax: totals.tax,
          tip: totals.tip,
          total: totals.total,
          discount: totals.discount || 0,
        },
        tipMode: tip.mode,
        promoId: appliedPromo?.id,
        promoCode: appliedPromo?.code,
        deliveryQuote: normalizedDeliveryType === 'delivery' ? deliveryQuote : null,
      });

      console.log('✅ Order placed successfully:', order);

      let resolvedLoyalty = loyalty ?? null;

      try {
        const loyaltyProfile = await fetchLoyaltyProfile({
          email: formData.customer.email,
          phone: formData.customer.phone,
        });

        if (loyaltyProfile?.profile) {
          const profileBalance = loyaltyProfile.profile.stars ?? 0;
          if (resolvedLoyalty) {
            resolvedLoyalty = { ...resolvedLoyalty, newBalance: profileBalance };
          } else {
            resolvedLoyalty = {
              profileId: loyaltyProfile.profile.id,
              starsEarned: 0,
              newBalance: profileBalance,
              referralCode: loyaltyProfile.profile.referralCode ?? null,
              awardedAt: new Date().toISOString(),
            };
          }
        }
      } catch (loyaltyError) {
        console.warn('Unable to synchronize loyalty profile after order', loyaltyError);
      }

      saveOrderToHistory(order, resolvedLoyalty);
      saveGuestUser(buildGuestUserFromOrder(order, resolvedLoyalty));
      refreshUser();

      setConfirmedOrder(buildConfirmation(order, resolvedLoyalty));
      setCheckoutStep('confirmed');
      toast.success('Order placed successfully!');
    } catch (error: any) {
      console.error('❌ Order placement failed:', error);
      toast.error(error?.message || 'Failed to place order. Please try again.');
    }
  };

  const handleTrackOrder = () => {
    if (confirmedOrder) {
      setShowCart(false);
      setIsMinimized(true);
      onNavigate(`/track/${confirmedOrder.id}`);
    }
  };

  const handleViewOrderDetails = () => {
    if (confirmedOrder) {
      setShowCart(false);
      setIsMinimized(true);
      clearCart();
      setCheckoutStep('review');
      setConfirmedOrder(null);
      setDeliveryQuote(null);
      onNavigate(`/account/orders/${confirmedOrder.id}`);
    }
  };

  const handleBackToMenu = () => {
    // Close cart on both mobile and desktop
    setShowCart(false);
    setIsMinimized(true);
    // Reset cart state
    clearCart();
    setCheckoutStep('review');
    setConfirmedOrder(null);
    setDeliveryQuote(null);
    // Navigate to products page
    onNavigate('/products');
  };

  const handleNewOrder = () => {
    clearCart();
    setCheckoutStep('review');
    setConfirmedOrder(null);
    setShowCart(false);
    setIsMinimized(true);
    setDeliveryQuote(null);
  };

  // Reset to review step when cart is opened
  useEffect(() => {
    if (checkoutStep === 'confirmed') {
      if (items.length > 0) {
        setCheckoutStep('review');
        setConfirmedOrder(null);
      }
      return;
    }

    if (!showCart) return;

    if (checkoutStep !== 'review' && items.length === 0) {
      setCheckoutStep('review');
    }
  }, [showCart, checkoutStep, items.length]);

  // Manage body scroll and cart-open state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (showCart) {
        document.body.setAttribute('data-cart-open', 'true');
        document.body.style.overflow = 'hidden';
      } else {
        document.body.removeAttribute('data-cart-open');
        document.body.style.overflow = '';
      }
      return () => {
        document.body.removeAttribute('data-cart-open');
        document.body.style.overflow = '';
      };
    }
  }, [showCart]);

  // Calculate top offset based on header + announcement bar
  // Mobile: 64px nav (16 * 4) + 40px announcement = 104px
  // Desktop: 80px nav (20 * 4) + 40px announcement = 120px
  const resolvedTopOffsetMobile = topOffsetMobile ?? (hasAnnouncementBar ? '104px' : '64px');
  const resolvedTopOffsetDesktop = topOffsetDesktop ?? (hasAnnouncementBar ? '120px' : '80px');

  return (
    <>
      {/* Backdrop */}
      <div id="cartBackdrop" aria-hidden="true" />

      {/* Desktop: Cart with minimize/maximize functionality */}
      {showDesktopCart && (
        <>
          {/* Minimized: Floating Cart Button - Bottom Right */}
          <AnimatePresence>
            {isMinimized && itemCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="hidden lg:block !fixed !bottom-6 !right-6 z-[9999]"
                style={{
                  position: 'fixed',
                  bottom: '24px',
                  right: '24px'
                }}
              >
                {/* Pulsing ring effect */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: brandColor }}
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />

                {/* Main button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: [0, -5, 5, -5, 0] }}
                  whileTap={{ scale: 0.95 }}
                  className="relative rounded-full shadow-2xl text-white flex items-center justify-center w-16 h-16 group"
                  style={{
                    backgroundColor: brandColor,
                  }}
                  onClick={() => setIsMinimized(false)}
                  aria-label="Open cart"
                  title="Open cart"
                >
                  <ShoppingCart className="w-7 h-7 transition-transform group-hover:scale-110" />

                  {/* Badge - red circle at top-right edge */}
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] px-1 flex items-center justify-center shadow-lg border-2 border-white"
                  >
                    {itemCount}
                  </motion.span>

                  {/* Subtle shine effect */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/20 to-white/0"
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded: Full Sidebar */}
          <AnimatePresence>
            {!isMinimized && (
              <>
                {/* Backdrop - Desktop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="hidden lg:block fixed inset-0 bg-black/30 backdrop-blur-sm z-[90]"
                  style={{ top: resolvedTopOffsetDesktop }}
                  onClick={() => setIsMinimized(true)}
                  aria-label="Close cart"
                />

                <motion.aside
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="cart-drawer hidden lg:flex fixed right-0 bottom-0 bg-white shadow-2xl flex-col border-l border-gray-200 overflow-hidden z-[100]"
                  style={{
                    width: 'var(--drawer-w)',
                    top: resolvedTopOffsetDesktop
                  }}
                >
                  <AnimatePresence mode="wait">
                    {checkoutStep === 'review' && (
                      <CheckoutStepReview
                        key="review"
                        items={items}
                        itemCount={itemCount}
                        subtotalCents={totals.subtotal}
                        tip={tip}
                        deliveryType={deliveryType}
                        fulfillmentType={fulfillmentType}
                        totals={totals}
                        deliveryFeePending={totals.deliveryFeePending}
                        brandColor={brandColor}
                        serviceFeeRate={totals.serviceFeeRate ?? 0}
                        loyaltyConfig={loyaltyConfig}
                        menuItems={menuItems}
                        onUpdateQty={handleUpdateQty}
                        onUpdateNotes={handleUpdateNotes}
                        onRemove={handleRemove}
                        onEdit={handleEdit}
                        onRecommendationAdd={handleRecommendationAdd}
                        onTipChange={setTip}
                        onDeliveryTypeChange={handleDeliveryTypeChange}
                        onContinue={handleContinueToCheckout}
                        onContinueBlocked={() => setShowDeliverySupportModal(true)}
                        continueDisabled={checkoutBlocked}
                        showDeliveryError={showDeliveryError}
                        onClearCart={clearCart}
                        onNavigate={onNavigate}
                        onMinimize={() => setIsMinimized(true)}
                        deliveryAddress={deliveryAddress}
                        onAddressSelect={setDeliveryAddress}
                        taxRate={taxRate}
                      />
                    )}

                    {checkoutStep === 'details' && (
                      <CheckoutStepDetails
                        key="details"
                        deliveryType={deliveryType}
                        totals={totals}
                        brandColor={brandColor}
                        onBack={handleBackToReview}
                        onSubmit={handlePlaceOrder}
                        deliveryQuote={deliveryQuote}
                        onDeliveryQuote={handleDeliveryQuoteUpdate}
                        isActiveViewport={isDesktop}
                        initialAddress={deliveryAddress}
                        taxRate={taxRate}
                        serviceFeeRate={totals.serviceFeeRate ?? 0}
                      />
                    )}

                    {checkoutStep === 'confirmed' && confirmedOrder && (
                      <CheckoutStepConfirmation
                        key="confirmed"
                        orderId={confirmedOrder.id}
                        orderNumber={confirmedOrder.number}
                        eta={confirmedOrder.eta}
                        deliveryType={confirmedOrder.mode}
                        items={confirmedOrder.items}
                        totals={confirmedOrder.totals}
                        brandColor={brandColor}
                        loyalty={confirmedOrder.loyalty}
                        onTrackOrder={deliveryType === 'delivery' ? handleTrackOrder : undefined}
                        onViewOrderDetails={handleViewOrderDetails}
                        onBackToMenu={handleBackToMenu}
                        onNewOrder={handleNewOrder}
                      />
                    )}
                  </AnimatePresence>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Mobile: Floating Button + Full Screen Drawer */}
      <div className="lg:hidden" style={{ pointerEvents: 'none' }}>
        {/* Floating Cart Button - Bottom Right */}
        {items.length > 0 && !showCart && (
          <div
            className="fixed z-[9999]"
            style={{
              position: 'fixed',
              bottom: '80px',
              right: '20px',
              pointerEvents: 'auto',
              touchAction: 'manipulation',
            }}
          >
            {/* Main button - no animation wrappers to avoid touch interference */}
            <button
              className="relative rounded-full shadow-2xl text-white flex items-center justify-center w-14 h-14 group active:shadow-lg active:scale-95 transition-transform"
              style={{
                backgroundColor: brandColor,
                touchAction: 'manipulation',
              }}
              onClick={() => setShowCart(true)}
              aria-label="Open cart"
              title="Open cart"
            >
              <ShoppingCart className="w-6 h-6 transition-transform group-active:scale-90" />

              {/* Badge - red circle at top-right edge */}
              <span
                className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] px-1 flex items-center justify-center shadow-lg border-2 border-white"
              >
                {itemCount}
              </span>
            </button>
          </div>
        )}

        {/* Mobile Drawer */}
        {showCart && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="cart-drawer fixed inset-0 bg-white flex flex-col z-[100] overflow-hidden"
            style={{
              top: resolvedTopOffsetMobile,
              pointerEvents: 'auto',  // Re-enable touch events for the drawer
              touchAction: 'pan-y',   // Allow vertical scrolling
            }}
          >
            {/* Close button - positioned at top-right, outside the header */}
            <button
              onClick={() => setShowCart(false)}
              className="absolute top-2 right-3 z-[110] h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 grid place-items-center transition-colors shadow-sm"
              style={{ touchAction: 'manipulation' }}
              aria-label="Close cart"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>

            <AnimatePresence mode="wait">
              {checkoutStep === 'review' && (
                <CheckoutStepReview
                  key="review-mobile"
                  items={items}
                  itemCount={itemCount}
                  subtotalCents={totals.subtotal}
                  tip={tip}
                  deliveryType={deliveryType}
                  fulfillmentType={fulfillmentType}
                  totals={totals}
                  deliveryFeePending={totals.deliveryFeePending}
                  brandColor={brandColor}
                  serviceFeeRate={totals.serviceFeeRate ?? 0}
                  loyaltyConfig={loyaltyConfig}
                  menuItems={menuItems}
                  onUpdateQty={handleUpdateQty}
                  onUpdateNotes={handleUpdateNotes}
                  onRemove={handleRemove}
                  onEdit={handleEdit}
                  onRecommendationAdd={handleRecommendationAdd}
                  onTipChange={setTip}
                  onDeliveryTypeChange={handleDeliveryTypeChange}
                  onContinue={handleContinueToCheckout}
                  onContinueBlocked={() => setShowDeliverySupportModal(true)}
                  continueDisabled={checkoutBlocked}
                  showDeliveryError={showDeliveryError}
                  onClearCart={clearCart}
                  onNavigate={onNavigate}
                  deliveryAddress={deliveryAddress}
                  onAddressSelect={setDeliveryAddress}
                  taxRate={taxRate}
                />
              )}

              {checkoutStep === 'details' && (
                <CheckoutStepDetails
                  key="details-mobile"
                  deliveryType={deliveryType}
                  totals={totals}
                  brandColor={brandColor}
                  onBack={handleBackToReview}
                  onSubmit={handlePlaceOrder}
                  deliveryQuote={deliveryQuote}
                  onDeliveryQuote={handleDeliveryQuoteUpdate}
                  isActiveViewport={!isDesktop}
                  initialAddress={deliveryAddress}
                  taxRate={taxRate}
                  serviceFeeRate={totals.serviceFeeRate ?? 0}
                />
              )}

              {checkoutStep === 'confirmed' && confirmedOrder && (
                <CheckoutStepConfirmation
                  key="confirmed-mobile"
                  orderId={confirmedOrder.id}
                  orderNumber={confirmedOrder.number}
                  eta={confirmedOrder.eta}
                  deliveryType={confirmedOrder.mode}
                  items={confirmedOrder.items}
                  totals={confirmedOrder.totals}
                  brandColor={brandColor}
                  loyalty={confirmedOrder.loyalty}
                  onTrackOrder={deliveryType === 'delivery' ? handleTrackOrder : undefined}
                  onViewOrderDetails={handleViewOrderDetails}
                  onBackToMenu={handleBackToMenu}
                  onNewOrder={handleNewOrder}
                />
              )}
            </AnimatePresence>
          </motion.aside>
        )}

        {/* Backdrop for mobile - clickable to dismiss cart */}
        {showCart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              // Only close if clicking the backdrop itself, not its children
              if (e.target === e.currentTarget) {
                setShowCart(false);
              }
            }}
            className="fixed inset-0 bg-black/40 z-[90] lg:hidden pointer-events-auto"
            style={{ top: resolvedTopOffsetMobile }}
          />
        )}
      </div>

      {/* Delivery Support Modal */}
      {showDeliverySupportModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold">We can&apos;t deliver to this address</h3>
            <p className="text-sm text-gray-600">
              Uber Direct supports a limited delivery radius. Please double-check your address or contact us—we&apos;ll help place the order or arrange pickup.
            </p>
            <div className="space-y-1 text-sm">
              <div className="font-medium text-gray-900">Shahirizada Fresh Market</div>
              <div className="text-gray-700">{supportInfo.address}</div>
              <div className="text-gray-700">Phone: {supportInfo.phone}</div>
              <div className="text-gray-700">Email: {supportInfo.email}</div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setShowDeliverySupportModal(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ backgroundColor: brandColor }}
                onClick={() => {
                  setShowDeliverySupportModal(false);
                  onNavigate('/contact');
                }}
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
