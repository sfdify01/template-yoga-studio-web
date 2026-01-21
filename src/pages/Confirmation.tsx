import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, MapPin, ShoppingBag, Truck, ArrowRight, Phone, Star, XCircle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { formatCurrency } from '../lib/pricing';
import { getPickupCode } from '../lib/utils/id';
import { getOrderById, calculateEditWindowRemaining } from '../lib/orders/api';
import { CancelOrderDialog } from '../components/order/CancelOrderDialog';
import type { LoyaltySummary, OrderDetails } from '../lib/orders/types';

// Cancel Countdown component (shows time remaining in cancel window)
function CancelCountdown({ orderCreatedAt, onExpire }: { orderCreatedAt: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(() => {
    const { remaining } = calculateEditWindowRemaining(orderCreatedAt);
    return remaining;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const { remaining, expired } = calculateEditWindowRemaining(orderCreatedAt);
      setRemaining(remaining);
      if (expired) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [orderCreatedAt, onExpire]);

  if (remaining <= 0) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
      <Clock className="w-4 h-4 text-amber-600" />
      <span className="text-sm text-amber-800">
        Cancel window: <span className="font-mono font-medium">{minutes}:{seconds.toString().padStart(2, '0')}</span>
      </span>
    </div>
  );
}

interface ConfirmationProps {
  orderId: string;
  onNavigate: (path: string) => void;
  config: {
    name: string;
    contact: { phone: string; email: string };
    theme: { brand: string };
    address: {
      line1: string;
      city: string;
      state: string;
      zip: string;
    };
  };
}

type SavedOrder = {
  id: string;
  mode: 'pickup' | 'delivery';
  customer: {
    name?: string;
    first_name?: string;
    last_name?: string;
    phone: string;
    email?: string;
  };
  address?: {
    line1: string;
    apt?: string;
    city: string;
    state: string;
    zip: string;
    notes?: string;
  };
  items: Array<{
    sku: string;
    name: string;
    price: number;
    qty: number;
    mods?: Array<{ id: string; name: string; price?: number }>;
    note?: string;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    fees: number;
    tips: number;
    discount?: number;
    grand_total: number;
  };
  placedAt: string;
  eta: string;
  status: string;
  pickupTime?: string;
  loyalty?: LoyaltySummary | null;
};

export const Confirmation = ({ orderId, onNavigate, config }: ConfirmationProps) => {
  const [order, setOrder] = useState<SavedOrder | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [earnResult, setEarnResult] = useState<LoyaltySummary | null>(null);
  const [cancelWindowExpired, setCancelWindowExpired] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    // Load order from localStorage and API
    const loadOrder = async () => {
      try {
        const orders = JSON.parse(localStorage.getItem('tabsy-orders') || '[]');
        const foundOrder = orders.find((o: SavedOrder) => o.id === orderId);

        if (foundOrder) {
          setOrder(foundOrder);

          // Award stars for this order
          try {
            if (foundOrder.loyalty) {
              setEarnResult(foundOrder.loyalty);
            }
          } catch (err) {
            console.error('Failed to award stars:', err);
          }
        }

        // Fetch full order details from API for cancel functionality
        try {
          const details = await getOrderById(orderId);
          setOrderDetails(details);

          // Check if cancel window is already expired
          const { expired } = calculateEditWindowRemaining(details.createdAt);
          setCancelWindowExpired(expired);
        } catch (err) {
          console.error('Failed to fetch order details:', err);
          // Don't block the page if API fetch fails
        }
      } catch (err) {
        console.error('Failed to load order:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find this order. It may have been removed or the link is incorrect.
          </p>
          <Button onClick={() => onNavigate('/menu')}>
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  const eta = new Date(order.eta);
  const pickupCode = getPickupCode(order.id);
  const customerName = order.customer.name ||
    `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() ||
    'Customer';

  // Check if cancel window is active (order details loaded and not expired)
  const canCancelOrder = orderDetails && !cancelWindowExpired;
  const isDeliveryOrder = order.mode === 'delivery';

  // Handle cancel window expiring
  const handleCancelWindowExpire = useCallback(() => {
    setCancelWindowExpired(true);
  }, []);

  // Handle successful cancellation
  const handleCancelSuccess = useCallback(() => {
    setShowCancelDialog(false);
    // Navigate to status page to show cancelled status
    onNavigate(`/status/${orderId}`);
  }, [onNavigate, orderId]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Success Hero */}
      <div className="bg-gradient-to-b from-green-50 to-white py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6"
          >
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-3"
          >
            Order Confirmed!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 mb-6"
          >
            Thank you, {customerName}. Your order has been received.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="inline-block bg-white rounded-lg px-6 py-3 shadow-sm border"
          >
            <div className="text-sm text-gray-600 mb-1">Order Number</div>
            <div className="text-xl font-mono">{order.id}</div>
          </motion.div>

          {/* Cancel Window Countdown & Action */}
          {canCancelOrder && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-6 space-y-3"
            >
              <CancelCountdown
                orderCreatedAt={orderDetails.createdAt}
                onExpire={handleCancelWindowExpire}
              />

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCancelDialog(true)}
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Order
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6">
        {/* Stars Earned */}
        {earnResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="p-6 mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: config.theme.brand }}
                >
                  <Star className="w-6 h-6 text-white fill-current" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Stars Earned!</h2>
                  <p className="text-sm text-gray-600">Reward yourself</p>
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Order reward</span>
                  <span className="font-semibold" style={{ color: config.theme.brand }}>
                    +{earnResult.starsEarned} ⭐
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">New balance</span>
                  <span className="text-xl font-bold" style={{ color: config.theme.brand }}>
                    {earnResult.newBalance} ⭐
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Fulfillment Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6 mb-6">
            {order.mode === 'pickup' ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${config.theme.brand}15` }}
                  >
                    <ShoppingBag className="w-6 h-6" style={{ color: config.theme.brand }} />
                  </div>
                  <div>
                    <h2 className="font-semibold">Pickup Order</h2>
                    <p className="text-sm text-gray-600">Ready in about 15–20 min</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Estimated Ready Time</div>
                      <div className="text-sm text-gray-600">
                        {eta.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Pickup Location</div>
                      <div className="text-sm text-gray-600">
                        {config.address.line1}<br />
                        {config.address.city}, {config.address.state} {config.address.zip}
                      </div>
                    </div>
                  </div>

                  <div 
                    className="mt-4 p-4 rounded-lg border-2"
                    style={{ 
                      backgroundColor: `${config.theme.brand}10`,
                      borderColor: `${config.theme.brand}40`
                    }}
                  >
                    <div className="text-sm font-medium mb-1" style={{ color: config.theme.brand }}>
                      Your Pickup Code
                    </div>
                    <div className="text-3xl font-mono" style={{ color: config.theme.brand }}>
                      {pickupCode}
                    </div>
                    <div className="text-xs mt-1" style={{ color: config.theme.brand }}>
                      Show this code when you arrive
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Delivery Order</h2>
                    <p className="text-sm text-gray-600">On its way soon</p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Estimated Delivery</div>
                      <div className="text-sm text-gray-600">
                        {eta.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">Delivery Address</div>
                      <div className="text-sm text-gray-600">
                        {order.address?.line1}
                        {order.address?.apt && `, ${order.address.apt}`}
                        <br />
                        {order.address?.city}, {order.address?.state} {order.address?.zip}
                      </div>
                    </div>
                  </div>

                  {order.address?.notes && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">Delivery Notes</div>
                      <div className="text-sm">{order.address.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6 mb-6">
            <h2 className="font-semibold mb-4">Order Details</h2>
            
            <div className="space-y-3 mb-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div className="flex-1">
                    <div className="text-sm">
                      {item.qty}x {item.name}
                    </div>
                    {item.mods && item.mods.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {item.mods.map((mod, i) => (
                          <div key={i}>+ {mod.name}</div>
                        ))}
                      </div>
                    )}
                    {item.note && (
                      <div className="text-xs text-gray-500 mt-1">
                        Note: {item.note}
                      </div>
                    )}
                  </div>
                  <div className="text-sm">
                    {formatCurrency(item.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Totals */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(order.totals.subtotal)}</span>
              </div>
              {order.totals.discount && order.totals.discount > 0 && (
                <div className="flex justify-between" style={{ color: config.theme.brand }}>
                  <span className="font-medium">Promo Discount</span>
                  <span className="font-semibold">-{formatCurrency(order.totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>{formatCurrency(order.totals.tax)}</span>
              </div>
              {order.totals.tips > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tip</span>
                  <span>{formatCurrency(order.totals.tips)}</span>
                </div>
              )}
              {order.totals.fees > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span>{formatCurrency(order.totals.fees)}</span>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.totals.grand_total)}</span>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => onNavigate(`/status/${order.id}`)}
          >
            Track Order Status
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            size="lg"
            className="flex-1 text-white"
            style={{ backgroundColor: config.theme.brand }}
            onClick={() => onNavigate('/menu')}
          >
            Back to Menu
          </Button>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center text-sm text-gray-600"
        >
          <p className="flex items-center justify-center gap-2">
            <Phone className="w-4 h-4" />
            Questions about your order? Call us at{' '}
            <a href={`tel:${config.contact.phone}`} className="underline">
              {config.contact.phone}
            </a>
          </p>
        </motion.div>
      </div>

      {/* Cancel Order Dialog */}
      {orderDetails && (
        <CancelOrderDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          orderId={orderDetails.id}
          orderTotal={orderDetails.totals.totalCents}
          customerPhone={orderDetails.contact.phone || undefined}
          customerEmail={orderDetails.contact.email || undefined}
          isDelivery={isDeliveryOrder}
          onSuccess={handleCancelSuccess}
        />
      )}
    </div>
  );
};
