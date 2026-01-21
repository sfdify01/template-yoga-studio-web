import { useState, useEffect, useMemo } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { ArrowLeft, ShoppingBag, MapPin, User, Phone, Mail, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  cartItemsAtom,
  cartTotalsAtom,
  guestEmailAtom,
  guestNameAtom,
  guestPhoneAtom,
  clearCartAtom,
  fulfillmentTypeAtom,
  deliveryAddressAtom,
} from '../atoms/cart';
import { placeOrderAtom } from '../atoms/orders/orderAtoms';
import { formatCurrency } from '../lib/pricing';
import { createPaymentIntent, createDeliveryQuote } from '../lib/orders/api';
import { getFriendlyDeliveryError, getFriendlyOrderError } from '../lib/orders/errors';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePublishableKeyAtom } from '../atoms/config/configAtoms';
import { saveOrderToHistory } from '../lib/orders/history';
import { SMSConsentCheckbox } from '../components/checkout/SMSConsentCheckbox';
import { buildOrderItemsMetadata, buildOrderItemsSummary } from '../lib/orders/orderMetadata';
import { ModernTipSelector } from '../components/checkout/ModernTipSelector';
import { ModernAddressPicker } from '../components/checkout/ModernAddressPicker';
import { estimateStripeProcessingFee } from '../lib/orders/fees';
import { googleMapsApiKeyAtom } from '../atoms/config/configAtoms';
import { fetchLoyaltyProfile } from '../lib/loyalty/api';
import { buildGuestUserFromOrder, saveGuestUser } from '../lib/auth/guest';
import { useAuth } from '../lib/auth/AuthContext';
import { formatQuantityForUber } from '../lib/units';
import { PromoCodeInput } from '../components/checkout/PromoCodeInput';
import { promoInfoAtom, promoDiscountCentsAtom } from '../atoms/promo/promoAtoms';

interface CheckoutProps {
  onNavigate: (path: string) => void;
  brandColor: string;
}

export const Checkout = ({ onNavigate, brandColor }: CheckoutProps) => {
  const items = useAtomValue(cartItemsAtom);
  const totals = useAtomValue(cartTotalsAtom);
  const [guestEmail, setGuestEmail] = useAtom(guestEmailAtom);
  const [guestName, setGuestName] = useAtom(guestNameAtom);
  const [guestPhone, setGuestPhone] = useAtom(guestPhoneAtom);
  const [fulfillmentType, setFulfillmentType] = useAtom(fulfillmentTypeAtom);
  const [address, setAddress] = useAtom(deliveryAddressAtom);
  const placeOrder = useSetAtom(placeOrderAtom);
  const clearCart = useSetAtom(clearCartAtom);
  const stripeKey = useAtomValue(stripePublishableKeyAtom);
  const googleMapsApiKey = useAtomValue(googleMapsApiKeyAtom);
  const appliedPromo = useAtomValue(promoInfoAtom);
  const promoDiscountCents = useAtomValue(promoDiscountCentsAtom);
  const orderItemsMetadata = useMemo(() => buildOrderItemsMetadata(items), [items]);
  const orderItemsSummary = useMemo(() => buildOrderItemsSummary(items), [items]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fulfillmentMode: 'pickup' | 'delivery' =
    fulfillmentType === 'delivery' ? 'delivery' : 'pickup';

  useEffect(() => {
    if (fulfillmentType !== 'pickup' && fulfillmentType !== 'delivery') {
      setFulfillmentType('pickup');
    }
  }, [fulfillmentType, setFulfillmentType]);

  // Stripe
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  // Delivery quote
  const [deliveryQuote, setDeliveryQuote] = useState<any>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const { refreshUser } = useAuth();

  useEffect(() => {
    if (!items.length) {
      onNavigate('/cart');
      return;
    }

    // Initialize Stripe
    if (stripeKey) {
      setStripePromise(loadStripe(stripeKey));
    }
  }, [items, stripeKey]);

  const handleGetDeliveryQuote = async () => {
    if (!address.line1 || !address.city || !address.zip) {
      toast.error('Please fill in delivery address');
      return;
    }

    setIsLoadingQuote(true);
    try {
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

      const quote = await createDeliveryQuote({ address, items: quoteItems });
      setDeliveryQuote(quote);
      toast.success(`Delivery fee: ${formatCurrency(quote.feeCents / 100)}`);
    } catch (error: any) {
      const friendlyError = getFriendlyDeliveryError(error);
      toast.error(friendlyError);
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleCreatePaymentIntent = async () => {
    try {
      const deliveryFee = fulfillmentMode === 'delivery' ? (deliveryQuote?.feeCents || 0) : 0;
      const total = totals.grand_total + deliveryFee;
      const platformFee = totals.serviceFee || totals.fees || 0;
      const courierTip = fulfillmentMode === 'delivery' ? totals.tips || 0 : 0;
      const stripeFeeEstimate = estimateStripeProcessingFee(total);
      const deliveryProvider = fulfillmentMode === 'delivery' ? 'uber_direct' : 'pickup';
      const netPayoutEstimate = Math.max(
        total - stripeFeeEstimate - platformFee - deliveryFee - courierTip,
        0
      );

      // Build customer object, only including email/phone if they have values
      const customerData: any = {
        firstName: guestName.split(' ')[0] || '',
        lastName: guestName.split(' ').slice(1).join(' ') || '',
      };

      // Only add email if it's not empty
      const trimmedEmail = guestEmail?.trim();
      if (trimmedEmail) {
        customerData.email = trimmedEmail;
      }

      // Only add phone if it's not empty
      const trimmedPhone = guestPhone?.trim();
      if (trimmedPhone) {
        customerData.phone = trimmedPhone;
      }

      const response = await createPaymentIntent({
        amount: total,
        subtotal: totals.subtotal,
        tax: totals.tax,
        serviceFee: totals.serviceFee || 0,
        deliveryFee,
        tip: totals.tips || 0,
        discount: totals.discount || 0,
        currency: 'USD',
        platformFee,
        stripeFeeEstimate,
        deliveryProvider,
        fulfillmentType: fulfillmentMode,
        orderItems: orderItemsMetadata,
        orderItemsSummary,
        breakdown: {
          subtotal: totals.subtotal,
          deliveryFee,
          tabsyFee: platformFee,
          stripeProcessingFee: stripeFeeEstimate,
          tax: totals.tax,
          tip: totals.tips || 0,
          discount: totals.discount || 0,
          total,
          netPayoutEstimate,
        },
        customer: customerData,
      });

      setClientSecret(response.clientSecret);
      setPaymentIntentId(response.paymentIntentId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize payment');
    }
  };

  const isPickupReady = guestName.trim() && guestPhone.trim();
  const isDeliveryReady =
    guestName.trim() &&
    guestPhone.trim() &&
    address.line1.trim() &&
    address.city.trim() &&
    address.zip.trim() &&
    deliveryQuote;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/cart')}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Back to cart"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1>Checkout</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Fulfillment Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold mb-4">How would you like to receive your order?</h2>
          <Tabs
            value={fulfillmentType}
            onValueChange={(value) => {
              setFulfillmentType(value as 'pickup' | 'delivery');
              setDeliveryQuote(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pickup" className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Pickup
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pickup" className="mt-4">
              <p className="text-sm text-gray-600">
                Ready in <span className="font-semibold">20-25 minutes</span> at:
              </p>
              <p className="text-sm font-medium mt-1">
                3124 Illinois Rte 59 Suite 154, Naperville, IL 60564
              </p>
            </TabsContent>

            <TabsContent value="delivery" className="mt-4 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Enter your delivery address and we'll calculate the delivery fee.
              </p>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Delivery Address (shown when delivery is selected) */}
        {fulfillmentMode === 'delivery' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold mb-4">Delivery Address</h2>

            {/* Debug info */}
            {!googleMapsApiKey && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                ⚠️ Google Maps API key not configured. The address picker will still work, but without autocomplete.
              </div>
            )}

            <ModernAddressPicker
              googleMapsApiKey={googleMapsApiKey}
              brandColor={brandColor}
              hideMapPreview={true}
              initialAddress={{
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                zip: address.zip,
                country: 'US',
                instructions: address.instructions,
              }}
              onAddressSelect={(selectedAddress) => {
                console.log('Address selected:', selectedAddress);
                setAddress({
                  line1: selectedAddress.line1,
                  line2: selectedAddress.line2 || '',
                  city: selectedAddress.city,
                  state: selectedAddress.state,
                  zip: selectedAddress.zip,
                  instructions: selectedAddress.instructions || '',
                  country: selectedAddress.country || 'US',
                });
                // Clear existing delivery quote when address changes
                setDeliveryQuote(null);
              }}
            />

            {/* Get Delivery Quote Button */}
            {!deliveryQuote && address.line1 && address.city && address.zip && (
              <div className="mt-4">
                <Button
                  onClick={handleGetDeliveryQuote}
                  disabled={isLoadingQuote}
                  variant="outline"
                  className="w-full"
                  style={{
                    borderColor: brandColor,
                    color: brandColor,
                  }}
                >
                  {isLoadingQuote && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Get Delivery Quote
                </Button>
              </div>
            )}

            {/* Delivery Quote Display */}
            {deliveryQuote && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 mb-1">
                      Delivery Available!
                    </p>
                    <p className="text-sm text-green-700">
                      Delivery fee: <span className="font-semibold">{formatCurrency(deliveryQuote.feeCents / 100)}</span>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Estimated delivery: {deliveryQuote.etaMinutes || '45-60'} minutes
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: fulfillmentMode === 'delivery' ? 0.2 : 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-semibold">Contact Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <User className="w-4 h-4 inline mr-1" />
              Full Name *
            </label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number *
            </label>
            <input
              type="tel"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {/* SMS Consent */}
          <SMSConsentCheckbox brandColor={brandColor} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Mail className="w-4 h-4 inline mr-1" />
              Email (optional)
            </label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-600 mt-1.5">
              Enter your email to earn <span className="font-semibold text-green-600">10 loyalty stars per $1 spent</span>
            </p>
          </div>
        </motion.div>

        {/* Tip Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <ModernTipSelector brandColor={brandColor} subtotal={totals.subtotal} fulfillmentType={fulfillmentMode} />
          <p className="mt-3 text-sm text-gray-600">
            100% of your tip goes directly to your Uber Direct courier.
          </p>
        </motion.div>

        {/* Promo Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold mb-3">Promo Code</h2>
          <PromoCodeInput />
        </motion.div>

        {/* Order Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm space-y-3"
        >
          <h2 className="text-lg font-semibold">Order Summary</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal ({items.length} items)</span>
              <span>{formatCurrency((totals.subtotal + promoDiscountCents) / 100)}</span>
            </div>

            {promoDiscountCents > 0 && appliedPromo && (
              <div className="flex justify-between text-green-600">
                <span>Promo ({appliedPromo.code})</span>
                <span>-{formatCurrency(promoDiscountCents / 100)}</span>
              </div>
            )}

            {fulfillmentMode === 'delivery' && deliveryQuote && (
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span>{formatCurrency(deliveryQuote.feeCents / 100)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span>{formatCurrency(totals.tax / 100)}</span>
            </div>

            {totals.tips > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tip</span>
                <span>{formatCurrency(totals.tips / 100)}</span>
              </div>
            )}

            <div className="border-t pt-2 flex justify-between font-semibold text-base">
              <span>Total</span>
              <span>
                {formatCurrency(
                  (totals.grand_total + (fulfillmentMode === 'delivery' && deliveryQuote ? deliveryQuote.feeCents : 0)) / 100
                )}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Payment Section */}
        {clientSecret && stripePromise && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold mb-4">Payment</h2>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                onSubmit={async (stripe, elements) => {
                  setIsSubmitting(true);
                  try {
                    const { error } = await stripe.confirmPayment({
                      elements,
                      redirect: 'if_required',
                    });

                    if (error) {
                      toast.error(error.message || 'Payment failed');
                      setIsSubmitting(false);
                      return;
                    }

                    // Place order
                    const response = await placeOrder({
                      deliveryType: fulfillmentMode,
                      form: {
                        customer: {
                          first_name: guestName.split(' ')[0] || '',
                          last_name: guestName.split(' ').slice(1).join(' ') || '',
                          email: guestEmail?.trim() || '',
                          phone: guestPhone?.trim() || '',
                        },
                        delivery: fulfillmentMode === 'delivery' ? address : undefined,
                        paymentMethod: 'card',
                        paymentIntentId,
                      },
                      totals: {
                        subtotal: totals.subtotal,
                        tax: totals.tax,
                        serviceFee: totals.serviceFee || 0,
                        deliveryFee: fulfillmentMode === 'delivery' && deliveryQuote ? deliveryQuote.feeCents : 0,
                        tip: totals.tips || 0,
                        discount: promoDiscountCents || 0,
                      },
                      deliveryQuote: fulfillmentMode === 'delivery' ? deliveryQuote : undefined,
                      tipMode: 'percentage',
                      promoId: appliedPromo?.id || undefined,
                      promoCode: appliedPromo?.code || undefined,
                    });

                    let resolvedLoyalty = response.loyalty ?? null;
                    try {
                      const loyaltyProfile = await fetchLoyaltyProfile({
                        email: guestEmail,
                        phone: guestPhone,
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
                      console.warn('Unable to synchronize loyalty profile after checkout', loyaltyError);
                    }

                    clearCart();
                    saveOrderToHistory(response.order, resolvedLoyalty);
                    saveGuestUser(buildGuestUserFromOrder(response.order, resolvedLoyalty));
                    refreshUser();
                    toast.success('Order placed successfully!');
                    onNavigate(`/confirmation?order=${response.order.id}`);
                  } catch (error: any) {
                    const friendlyError = getFriendlyOrderError(error);
                    toast.error(friendlyError);
                    setIsSubmitting(false);
                  }
                }}
                brandColor={brandColor}
                isSubmitting={isSubmitting}
              />
            </Elements>
          </motion.div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      {!clientSecret && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-20">
          <div className="max-w-3xl mx-auto">
            <Button
              size="lg"
              onClick={handleCreatePaymentIntent}
              disabled={fulfillmentMode === 'pickup' ? !isPickupReady : !isDeliveryReady}
              className="w-full text-white"
              style={{ backgroundColor: brandColor }}
            >
              Continue to Payment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Stripe Payment Form Component
interface CheckoutFormProps {
  onSubmit: (stripe: any, elements: any) => Promise<void>;
  brandColor: string;
  isSubmitting: boolean;
}

const CheckoutForm = ({ onSubmit, brandColor, isSubmitting }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || isSubmitting) {
      toast.error('Payment form is not ready. Please wait a moment.');
      return;
    }

    await onSubmit(stripe, elements);
  };

  // Check if Stripe Elements is ready
  const isReady = stripe && elements && isElementReady;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        onReady={() => setIsElementReady(true)}
        onLoadError={(error) => {
          console.error('PaymentElement load error:', error);
          toast.error('Failed to load payment form');
        }}
      />

      {!isReady && (
        <div className="text-center py-2">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">Loading payment form...</p>
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!isReady || isSubmitting}
        className="w-full text-white"
        style={{ backgroundColor: brandColor }}
      >
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {isSubmitting ? 'Processing...' : 'Place Order'}
      </Button>
    </form>
  );
};
