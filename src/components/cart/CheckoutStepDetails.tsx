import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, CreditCard, ShoppingBag, ChevronDown, User, MapPin, Receipt } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useAuth } from '../../lib/auth/AuthContext';
import { authStore } from '../../lib/auth/store';
import { useConfig } from '../../hooks/useConfig';
import { createDeliveryQuote, createPaymentIntent, getStripeConfig } from '../../lib/orders/api';
import type { CheckoutFormData, DeliveryQuote, DeliveryAddressInput } from '../../lib/orders/types';
import {
  toE164PhoneNumber,
} from '../../lib/utils/phone';
import { estimateStripeProcessingFee } from '../../lib/orders/fees';

import { LoginForm } from '../auth/LoginForm';
import { useCart } from '../../lib/cart/useCart';
import { buildOrderItemsMetadata, buildOrderItemsSummary } from '../../lib/orders/orderMetadata';

interface CheckoutStepDetailsProps {
  deliveryType: 'pickup' | 'delivery';
  totals: {
    subtotal: number;
    deliveryFee?: number;
    serviceFee: number;
    tax: number;
    tip: number;
    total: number;
    currency: string;
    discount?: number;
    platformFee?: number;
    fees?: number;
    stripeFeeEstimate?: number;
    breakdown?: {
      subtotal: number;
      deliveryFee: number;
      tabsyFee: number;
      stripeProcessingFee: number;
      tax: number;
      tip: number;
      discount: number;
      total: number;
      netPayoutEstimate: number;
    };
  };
  brandColor: string;
  onBack: () => void;
  onSubmit: (data: CheckoutFormData) => Promise<void>;
  deliveryQuote: DeliveryQuote | null;
  onDeliveryQuote: (quote: DeliveryQuote | null) => void;
  /**
   * so we don't instantiate two PaymentElements for the same intent.
   */
  isActiveViewport?: boolean;
  initialAddress?: DeliveryAddressInput;
  taxRate?: number;
  serviceFeeRate?: number;
}

let cachedStripeKey: string | null = null;
let cachedStripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(key: string | null) {
  if (!key) return null;
  if (!cachedStripePromise || cachedStripeKey !== key) {
    cachedStripePromise = loadStripe(key);
    cachedStripeKey = key;
  }
  return cachedStripePromise;
}

export const CheckoutStepDetails = ({
  deliveryType,
  totals,
  brandColor,
  onBack,
  onSubmit,
  deliveryQuote,
  onDeliveryQuote,
  isActiveViewport = true,
  initialAddress,
  taxRate = 0,
  serviceFeeRate = 0,
}: CheckoutStepDetailsProps) => {
  const { user, isAuthenticated } = useAuth();
  const { items: cartItems } = useCart();
  const { config } = useConfig();
  const fallbackPublishableKey = useMemo(() => {
    return (
      config?.stripe?.publishableKey ||
      (import.meta as any)?.env?.VITE_STRIPE_PUBLISHABLE_KEY ||
      null
    );
  }, [config?.stripe?.publishableKey]);
  const [stripeKey, setStripeKey] = useState<string | null>(fallbackPublishableKey);
  const [stripeKeyLoading, setStripeKeyLoading] = useState(true);
  const [stripeKeyError, setStripeKeyError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CheckoutFormData>(() => {
    const initialPhone = user?.phone ?? '';
    // Parse name - handle both "First Last" format and separate fields
    const nameParts = user?.name?.trim().split(/\s+/) || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    return {
      customer: {
        first_name: firstName,
        last_name: lastName,
        phone: initialPhone,
        email: user?.email || '',
      },
      delivery:
        deliveryType === 'delivery' && initialAddress
          ? {
            line1: initialAddress.line1,
            line2: initialAddress.line2 || '',
            city: initialAddress.city,
            state: initialAddress.state,
            zip: initialAddress.zip,
            instructions: initialAddress.instructions || '',
          }
          : undefined,
      paymentMethod: 'card',
    };
  });

  // Update form data when user logs in (prefill from profile)
  useEffect(() => {
    if (user && isAuthenticated) {
      const nameParts = user?.name?.trim().split(/\s+/) || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      setFormData((prev) => ({
        ...prev,
        customer: {
          ...prev.customer,
          // Prefill from user profile, but keep existing values if user already typed something
          first_name: prev.customer.first_name || firstName,
          last_name: prev.customer.last_name || lastName,
          phone: prev.customer.phone || user?.phone || '',
          // Email is always from logged-in user (non-editable)
          email: user?.email || prev.customer.email,
        },
      }));
    }
  }, [user, isAuthenticated]);
  const [quoteStatus, setQuoteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    deliveryType === 'delivery' && deliveryQuote ? 'success' : 'idle'
  );
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const quoteKeyRef = useRef<string | null>(null);
  const [quoteRetryTrigger, setQuoteRetryTrigger] = useState(0);
  const safeDeliveryType: 'pickup' | 'delivery' =
    deliveryType === 'delivery' ? 'delivery' : 'pickup';

  const [paymentIntentState, setPaymentIntentState] = useState<{
    paymentIntentId: string;
    clientSecret: string;
    amount: number;
  } | null>(null);
  const [paymentIntentLoading, setPaymentIntentLoading] = useState(false);
  const [paymentIntentError, setPaymentIntentError] = useState<string | null>(null);
  const paymentIntentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const orderItemsMetadata = useMemo(() => buildOrderItemsMetadata(cartItems), [cartItems]);
  const orderItemsSummary = useMemo(
    () => buildOrderItemsSummary(cartItems),
    [cartItems]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStripeKey() {
      setStripeKeyLoading(true);
      setStripeKeyError(null);
      try {
        const remoteConfig = await getStripeConfig();
        if (cancelled) return;
        if (remoteConfig?.publishableKey) {
          setStripeKey(remoteConfig.publishableKey);
          return;
        }
        if (fallbackPublishableKey) {
          setStripeKey(fallbackPublishableKey);
          return;
        }
        setStripeKey(null);
        setStripeKeyError('Stripe publishable key is not configured.');
      } catch (error: any) {
        if (cancelled) return;
        if (fallbackPublishableKey) {
          console.warn('Falling back to embedded Stripe publishable key after config fetch failure:', error);
          setStripeKey(fallbackPublishableKey);
        } else {
          setStripeKey(null);
          setStripeKeyError(error?.message || 'Failed to load Stripe configuration.');
        }
      } finally {
        if (!cancelled) {
          setStripeKeyLoading(false);
        }
      }
    }

    loadStripeKey();

    return () => {
      cancelled = true;
    };
  }, [fallbackPublishableKey]);

  const stripePromise = useMemo(() => getStripePromise(stripeKey), [stripeKey]);
  const elementsOptions = useMemo(() => {
    if (!paymentIntentState?.clientSecret) return undefined;
    return { clientSecret: paymentIntentState.clientSecret };
  }, [paymentIntentState?.clientSecret]);

  const handleRetryQuote = () => {
    setQuoteRetryTrigger((prev: number) => prev + 1);
  };

  const customerSnapshot = useRef(formData.customer);
  useEffect(() => {
    customerSnapshot.current = formData.customer;
  }, [formData.customer]);

  // Quote fetching logic moved to SmartCart.tsx
  useEffect(() => {
    if (deliveryType === 'delivery' && deliveryQuote) {
      setQuoteStatus('success');
    } else if (deliveryType === 'delivery' && !deliveryQuote) {
      setQuoteStatus('idle');
    }
  }, [deliveryType, deliveryQuote]);

  useEffect(() => {
    if (!isActiveViewport) {
      setPaymentIntentLoading(false);
      if (paymentIntentTimerRef.current) {
        clearTimeout(paymentIntentTimerRef.current);
      }
      return;
    }
    if (stripeKeyLoading) {
      return;
    }
    if (!stripeKey) {
      setPaymentIntentError('Stripe payments are not configured yet.');
      setPaymentIntentState(null);
      return;
    }
    if (!totals.total || totals.total <= 0) {
      setPaymentIntentError('Cart total must be greater than zero.');
      return;
    }
    if (paymentIntentState && paymentIntentState.amount === totals.total) {
      if (!formData.paymentIntentId) {
        setFormData((prev: CheckoutFormData) => ({ ...prev, paymentIntentId: paymentIntentState.paymentIntentId }));
      }
      return;
    }

    // Clear any pending payment intent creation
    if (paymentIntentTimerRef.current) {
      clearTimeout(paymentIntentTimerRef.current);
    }

    // Debounce payment intent creation by 1 second to prevent race conditions
    paymentIntentTimerRef.current = setTimeout(() => {
      let cancelled = false;
      setPaymentIntentLoading(true);
      setPaymentIntentError(null);

      const platformFee = totals.platformFee ?? totals.serviceFee ?? totals.fees ?? 0;
      const courierTip = safeDeliveryType === 'delivery' ? totals.tip : 0;
      const stripeFeeEstimate =
        totals.stripeFeeEstimate ?? estimateStripeProcessingFee(totals.total);
      const deliveryProvider = safeDeliveryType === 'delivery' ? 'uber_direct' : 'pickup';
      const netPayoutEstimate = Math.max(
        totals.total - stripeFeeEstimate - platformFee - (totals.deliveryFee || 0) - courierTip,
        0
      );
      const breakdown = {
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee || 0,
        tabsyFee: platformFee,
        stripeProcessingFee: stripeFeeEstimate,
        tax: totals.tax,
        tip: totals.tip,
        discount: totals.discount || 0,
        total: totals.total,
        ...(totals.breakdown || {}),
        netPayoutEstimate,
      };

      createPaymentIntent({
        amount: totals.total,
        subtotal: totals.subtotal,
        serviceFee: totals.serviceFee,
        deliveryFee: totals.deliveryFee || 0,
        tax: totals.tax,
        tip: totals.tip,
        discount: totals.discount || 0,
        currency: totals.currency,
        platformFee,
        stripeFeeEstimate,
        deliveryProvider,
        fulfillmentType: safeDeliveryType,
        breakdown,
        orderItems: orderItemsMetadata,
        orderItemsSummary,
        paymentIntentId: paymentIntentState?.paymentIntentId || formData.paymentIntentId,
        customer: {
          firstName: customerSnapshot.current.first_name,
          lastName: customerSnapshot.current.last_name,
          email: customerSnapshot.current.email,
          phone: toE164PhoneNumber(customerSnapshot.current.phone) ?? customerSnapshot.current.phone,
        },
      })
        .then((intent) => {
          if (cancelled) return;
          setPaymentIntentState(intent);
          setFormData((prev: CheckoutFormData) => ({ ...prev, paymentIntentId: intent.paymentIntentId }));
        })
        .catch((err: any) => {
          if (cancelled) return;
          setPaymentIntentError(err?.message || 'Unable to initialize secure payment.');
        })
        .finally(() => {
          if (cancelled) return;
          setPaymentIntentLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, 1000);

    return () => {
      if (paymentIntentTimerRef.current) {
        clearTimeout(paymentIntentTimerRef.current);
      }
    };
  }, [isActiveViewport, stripeKey, stripeKeyLoading, totals.total, paymentIntentState?.amount, safeDeliveryType]);

  if (!isActiveViewport) {
    return null;
  }

  if (stripeKeyLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div>
          <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading secure payment settings…</p>
        </div>
      </div>
    );
  }

  if (!stripeKey) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-900">Payments are not ready yet</p>
          <p className="text-sm text-gray-600 mt-2">
            {stripeKeyError || 'Stripe publishable key is missing. Please contact support to finish checkout.'}
          </p>
        </div>
      </div>
    );
  }

  if (!stripePromise || !elementsOptions) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        <p className="text-sm text-gray-600">
          {paymentIntentError || 'Preparing secure checkout...'}
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <CheckoutDetailsForm
        deliveryType={deliveryType}
        totals={totals}
        brandColor={brandColor}
        onBack={onBack}
        onSubmit={onSubmit}
        deliveryQuote={deliveryQuote}
        onDeliveryQuote={onDeliveryQuote}
        formData={formData}
        setFormData={setFormData}
        paymentIntentError={paymentIntentError}
        paymentIntentLoading={paymentIntentLoading}
        quoteStatus={quoteStatus}
        quoteError={quoteError}
        onRetryQuote={handleRetryQuote}
        taxRate={taxRate}
        serviceFeeRate={serviceFeeRate}
        isLoggedIn={isAuthenticated}
      />
    </Elements>
  );
};

type CheckoutDetailsFormProps = CheckoutStepDetailsProps & {
  formData: CheckoutFormData;
  setFormData: React.Dispatch<React.SetStateAction<CheckoutFormData>>;
  paymentIntentError: string | null;
  paymentIntentLoading: boolean;
  quoteStatus: 'idle' | 'loading' | 'success' | 'error';
  quoteError: string | null;
  onRetryQuote: () => void;
  taxRate?: number;
  isLoggedIn?: boolean;
};

type AccordionSection = 'contact' | 'delivery' | 'payment' | 'review';

const CheckoutDetailsForm = ({
  deliveryType,
  totals,
  brandColor,
  onBack,
  onSubmit,
  deliveryQuote,
  onDeliveryQuote,
  formData,
  setFormData,
  paymentIntentError,
  paymentIntentLoading,
  quoteStatus,
  quoteError,
  onRetryQuote,
  taxRate = 0,
  serviceFeeRate = 0,
  isLoggedIn = false,
}: CheckoutDetailsFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentElementReady, setPaymentElementReady] = useState(false);
  const [accountLookup, setAccountLookup] = useState<{ exists: boolean; name?: string } | null>(null);
  const lookupTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<AccordionSection>('contact');
  const sectionRefs = useRef<Record<AccordionSection, HTMLDivElement | null>>({
    contact: null,
    delivery: null,
    payment: null,
    review: null,
  });
  const safeDeliveryType: 'pickup' | 'delivery' =
    deliveryType === 'delivery' ? 'delivery' : 'pickup';

  const toggleSection = (section: AccordionSection) => {
    setExpandedSection(section);
    // Scroll to section after a short delay to allow animation
    setTimeout(() => {
      sectionRefs.current[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  useEffect(() => {
    if (paymentIntentLoading || paymentIntentError) {
      setPaymentElementReady(false);
    }
  }, [paymentIntentLoading, paymentIntentError]);

  const lookupAccount = async (identifier: string) => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const existingUser = authStore.findUserByEmailOrPhone(
      identifier.includes('@') ? identifier : undefined,
      !identifier.includes('@') && identifier.length > 3 ? identifier : undefined,
    );

    if (existingUser) {
      setAccountLookup({ exists: true, name: existingUser.name || 'there' });
    } else {
      setAccountLookup(null);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'customer.phone') {
      const phoneValue = value.trim();
      setFormData((prev) => ({
        ...prev,
        customer: { ...prev.customer, phone: phoneValue },
      }));
      if (phoneValue.length > 3) {
        if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
        setAccountLookup(null);
        lookupTimerRef.current = setTimeout(() => {
          lookupAccount(phoneValue);
        }, 1000);
      }
      return;
    }

    if (field.startsWith('customer.')) {
      const customerField = field.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        customer: { ...prev.customer, [customerField]: value },
      }));

      if (customerField === 'email' && value.length > 3) {
        if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
        setAccountLookup(null);
        lookupTimerRef.current = setTimeout(() => {
          lookupAccount(value);
        }, 1000);
      }
    } else if (field.startsWith('delivery.')) {
      const deliveryField = field.split('.')[1];
      setFormData((prev: CheckoutFormData) => ({
        ...prev,
        delivery: { ...prev.delivery!, [deliveryField]: value },
      }));
    } else {
      setFormData((prev: CheckoutFormData) => ({ ...prev, [field]: value }));
    }
  };

  useEffect(() => {
    return () => {
      if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);
    };
  }, []);

  const validateForm = (): string | null => {
    if (!formData.customer.first_name || !formData.customer.last_name) {
      return 'Please enter your first and last name';
    }
    if (!formData.customer.phone || formData.customer.phone.trim().length < 5) {
      return 'Please enter a valid phone number';
    }
    if (!formData.customer.email) {
      return 'Please enter your email address';
    }
    if (deliveryType === 'delivery') {
      if (!formData.delivery?.line1 || !formData.delivery?.city || !formData.delivery?.zip) {
        return 'Please complete the delivery address';
      }
      if (deliveryQuote && deliveryQuote.expiresAt) {
        const expiresAtMs = new Date(deliveryQuote.expiresAt).getTime();
        const nowMs = Date.now();
        if (nowMs >= expiresAtMs) {
          return 'Delivery quote has expired. Please update your address to get a new quote.';
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (deliveryType === 'delivery' && (!deliveryQuote || quoteStatus !== 'success')) {
      setError('Delivery quote is still being prepared. Please wait a moment.');
      return;
    }

    if (formData.paymentMethod === 'card') {
      if (paymentIntentLoading) {
        setError('Secure payment is still being prepared. Please wait a moment.');
        return;
      }
      if (paymentIntentError) {
        setError(paymentIntentError);
        return;
      }
      if (!stripe || !elements) {
        setError('Payment form is not ready yet. Please refresh and try again.');
        return;
      }
      if (!isPaymentElementReady) {
        setError('Payment form is still loading. Please wait a moment.');
        return;
      }
    }

    setSubmitting(true);
    try {
      let latestPaymentIntentId = formData.paymentIntentId;
      if (formData.paymentMethod === 'card') {
        const { error: stripeError, paymentIntent } = await stripe!.confirmPayment({
          elements,
          redirect: 'if_required',
          confirmParams: {
            payment_method_data: {
              billing_details: {
                name: `${formData.customer.first_name} ${formData.customer.last_name}`.trim(),
                email: formData.customer.email,
                phone: toE164PhoneNumber(formData.customer.phone) ?? formData.customer.phone,
              },
            },
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message || 'Payment authorization failed.');
        }

        latestPaymentIntentId = paymentIntent?.id || latestPaymentIntentId;
        setFormData((prev: CheckoutFormData) => ({ ...prev, paymentIntentId: latestPaymentIntentId }));
      }

      await onSubmit({ ...formData, paymentIntentId: latestPaymentIntentId });
    } catch (err: any) {
      setError(err?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex flex-col h-full"
    >
      {/* Header with extra right padding on mobile for close button */}
      <header className="flex-shrink-0 bg-white border-b h-14 flex items-center gap-3 px-4 pr-14 lg:pr-4">
        <button
          onClick={onBack}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="font-semibold text-gray-900">Checkout Details</h3>
          <p className="text-xs text-gray-500">Enter your info and payment method</p>
        </div>
      </header>

      <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Step 2 of 3</span>
          <div className="flex gap-1.5">
            <div className="w-8 h-1 rounded-full bg-gray-300" />
            <div className="w-8 h-1 rounded-full" style={{ backgroundColor: brandColor }} />
            <div className="w-8 h-1 rounded-full bg-gray-200" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
          {/* Section 1: Contact Information */}
          <div
            ref={(el) => (sectionRefs.current.contact = el)}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleSection('contact')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: expandedSection === 'contact' ? brandColor : '#9CA3AF' }}
                >
                  1
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">Contact</h4>
                  {expandedSection !== 'contact' && formData.customer.first_name && (
                    <p className="text-xs text-gray-500">
                      {formData.customer.first_name} {formData.customer.last_name}
                    </p>
                  )}
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedSection === 'contact' ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedSection === 'contact' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="first_name" className="text-sm">First Name *</Label>
                        <Input
                          id="first_name"
                          value={formData.customer.first_name}
                          onChange={(e) => handleInputChange('customer.first_name', e.target.value)}
                          className="mt-1 h-10"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name" className="text-sm">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={formData.customer.last_name}
                          onChange={(e) => handleInputChange('customer.last_name', e.target.value)}
                          className="mt-1 h-10"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-sm">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.customer.phone}
                        onChange={(e) => handleInputChange('customer.phone', e.target.value)}
                        placeholder="+1234567890"
                        className="mt-1 h-10"
                        required
                      />
                      {accountLookup && accountLookup.exists && formData.customer.phone && (
                        <AnimatePresence>
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-sm text-gray-600 italic mt-2"
                          >
                            🔍 We found an existing account for {accountLookup.name}.{' '}
                            <button
                              type="button"
                              onClick={() => setShowLoginModal(true)}
                              className="underline"
                              style={{ color: brandColor }}
                            >
                              Log in
                            </button>{' '}
                            or continue as guest.
                          </motion.p>
                        </AnimatePresence>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm">
                        Email *
                        {isLoggedIn && (
                          <span className="ml-2 text-xs font-normal text-gray-500">(from your account)</span>
                        )}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.customer.email}
                        onChange={(e) => !isLoggedIn && handleInputChange('customer.email', e.target.value)}
                        placeholder="you@example.com"
                        className={`mt-1 h-10 ${isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        readOnly={isLoggedIn}
                        disabled={isLoggedIn}
                        required
                      />
                      {isLoggedIn && (
                        <p className="text-xs text-gray-500 mt-1">
                          Signed in as {formData.customer.email}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Section 2: Delivery Address (only for delivery) */}
          {deliveryType === 'delivery' && formData.delivery && (
            <div
              ref={(el) => (sectionRefs.current.delivery = el)}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection('delivery')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: expandedSection === 'delivery' ? brandColor : '#9CA3AF' }}
                  >
                    2
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">Delivery</h4>
                    {expandedSection !== 'delivery' && formData.delivery.line1 && (
                      <p className="text-xs text-gray-500 truncate max-w-[180px]">
                        {formData.delivery.line1}
                      </p>
                    )}
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedSection === 'delivery' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedSection === 'delivery' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-600">
                        {formData.delivery.line1}<br />
                        {formData.delivery.line2 && <>{formData.delivery.line2}<br /></>}
                        {formData.delivery.city}, {formData.delivery.state} {formData.delivery.zip}
                      </p>
                      {formData.delivery.instructions && (
                        <p className="text-sm text-gray-500 mt-2 italic">
                          Note: {formData.delivery.instructions}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Section 3: Payment Method */}
          <div
            ref={(el) => (sectionRefs.current.payment = el)}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleSection('payment')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: expandedSection === 'payment' ? brandColor : '#9CA3AF' }}
                >
                  {deliveryType === 'delivery' ? '3' : '2'}
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">Payment</h4>
                  {expandedSection !== 'payment' && (
                    <p className="text-xs text-gray-500">Credit / Debit Card</p>
                  )}
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedSection === 'payment' ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </motion.div>
            </button>
            {/* Payment content - always mounted to keep Stripe PaymentElement alive */}
            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${
                expandedSection === 'payment' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden min-h-0">
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                <div
                  className={`w-full p-3 rounded-lg border-2 transition-all ${formData.paymentMethod === 'card'
                    ? 'border-current bg-gray-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                  style={formData.paymentMethod === 'card' ? { borderColor: brandColor } : {}}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Credit / Debit Card</p>
                      <p className="text-xs text-gray-500">Pay securely with Stripe</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                  {paymentIntentLoading ? (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Initializing secure payment...
                    </div>
                  ) : paymentIntentError ? (
                    <p className="text-sm text-red-600">{paymentIntentError}</p>
                  ) : (
                    <PaymentElement
                      options={{ layout: 'tabs' }}
                      onReady={() => setPaymentElementReady(true)}
                      onLoadError={(loadError) => {
                        console.error('PaymentElement load error:', loadError);
                        setPaymentElementReady(false);
                        setError('Failed to load secure payment form. Please refresh and try again.');
                      }}
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-3">
                    💳 Securely processed via Stripe Connect.
                  </p>
                  {deliveryType === 'delivery' && (
                    <p className="text-xs mt-1">
                      {quoteStatus === 'loading' && (
                        <span className="text-gray-500">Calculating Uber courier quote...</span>
                      )}
                      {quoteStatus === 'success' && deliveryQuote && (
                        <span className="text-gray-600">
                          Delivery via Uber Direct · {deliveryQuote.etaMinutes ? `${deliveryQuote.etaMinutes} min ETA` : 'ETA provided after dispatch'}
                        </span>
                      )}
                      {quoteStatus === 'error' && (
                        <span className="text-red-600">
                          {quoteError || 'Unable to fetch delivery quote. Please verify the address.'}{' '}
                          <button
                            type="button"
                            onClick={onRetryQuote}
                            className="underline hover:no-underline font-medium"
                          >
                            Retry
                          </button>
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              </div>
            </div>
          </div>

          {/* Section 4: Order Review/Total */}
          <div
            ref={(el) => (sectionRefs.current.review = el)}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleSection('review')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: expandedSection === 'review' ? brandColor : '#9CA3AF' }}
                >
                  {deliveryType === 'delivery' ? '4' : '3'}
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-gray-900">Review</h4>
                  {expandedSection !== 'review' && (
                    <p className="text-xs text-gray-500">
                      Total: {formatCurrency(totals.total)}
                    </p>
                  )}
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedSection === 'review' ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedSection === 'review' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    {totals.discount && totals.discount > 0 && (
                      <div className="flex justify-between text-sm" style={{ color: brandColor }}>
                        <span className="font-medium">Promo Discount</span>
                        <span className="font-semibold">-{formatCurrency(totals.discount)}</span>
                      </div>
                    )}
                    {totals.deliveryFee && totals.deliveryFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Delivery Fee</span>
                        <span>{formatCurrency(totals.deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Application fee
                        {serviceFeeRate > 0 && (
                          <span className="text-gray-500 ml-1">
                            ({(serviceFeeRate * 100).toFixed(1)}%)
                          </span>
                        )}
                      </span>
                      <span>{formatCurrency(totals.serviceFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Tax
                        {taxRate > 0 && (
                          <span className="text-gray-500 ml-1">
                            ({(taxRate * 100).toFixed(2)}%)
                          </span>
                        )}
                      </span>
                      <span>{formatCurrency(totals.tax)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tip</span>
                      <span>{formatCurrency(totals.tip)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold">Total</span>
                        <span className="font-bold text-xl" style={{ color: brandColor }}>
                          {formatCurrency(totals.total)}
                        </span>
                      </div>
                    </div>
                    {safeDeliveryType === 'delivery' && deliveryQuote && quoteStatus === 'success' && (
                      <p className="text-xs text-gray-500 mt-2">
                        Delivery powered by Uber Direct · ETA ~{deliveryQuote.etaMinutes ?? 60} minutes
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </form>
      </div>

      <footer className="flex-shrink-0 bg-white border-t p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        {formData.paymentMethod === 'card' && !paymentIntentLoading && !paymentIntentError && !isPaymentElementReady && (
          <p className="text-xs text-gray-500 mb-2">
            Initializing the secure payment form… this usually takes just a second.
          </p>
        )}
        <Button
          size="lg"
          type="submit"
          disabled={
            submitting ||
            paymentIntentLoading ||
            !!paymentIntentError ||
            (formData.paymentMethod === 'card' && (!formData.paymentIntentId || !isPaymentElementReady)) ||
            (deliveryType === 'delivery' && (
              !deliveryQuote || quoteStatus !== 'success'
            ))
          }
          className="w-full text-white hover:opacity-90"
          style={{ backgroundColor: brandColor }}
          onClick={handleSubmit}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>
              <ShoppingBag className="w-5 h-5 mr-2" />
              Place Order — {formatCurrency(totals.total)}
            </>
          )}
        </Button>
      </footer>

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome back</DialogTitle>
            <DialogDescription>
              Sign in to speed up checkout and access your past orders.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <LoginForm
              onSuccess={() => setShowLoginModal(false)}
              brandColor={brandColor}
            />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
