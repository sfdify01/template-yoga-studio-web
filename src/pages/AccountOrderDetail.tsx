import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Mail, MapPin, Clock, ShoppingBag, Truck, Phone, ExternalLink, ArrowLeft, Receipt, HelpCircle, XCircle, Info } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { useAuth } from '../lib/auth/AuthContext';
import { StatusTracker } from '../components/status/StatusTracker';
import { getPickupCode } from '../lib/utils/id';
import { supabase } from '../lib/supabase/client';
import { normalizeOrderStatus } from '../lib/state';
import { formatQuantityDisplay, isWeightUnit } from '../lib/units';
import { getOrderReceipt, getOrderById, calculateEditWindowRemaining } from '../lib/orders/api';
import { CancelOrderDialog } from '../components/order/CancelOrderDialog';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import type { OrderDetails } from '../lib/orders/types';

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
    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-600" />
        <span className="text-sm text-amber-800">
          Cancel window: <span className="font-mono font-medium">{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </span>
      </div>
    </div>
  );
}

// Statuses that block cancelling (order has progressed too far)
const NON_CANCELLABLE_STATUSES = [
  'courier_requested',
  'driver_assigned',
  'driver_en_route',
  'picked_up',
  'delivered',
  'completed',
  'canceled',
  'cancelled',
  'refunded',
];

// Helper to check if order status blocks cancelling
function isStatusBlockingCancel(status: string | undefined): boolean {
  if (!status) return false;
  return NON_CANCELLABLE_STATUSES.includes(status.toLowerCase());
}

// Helper to get reason why cancel is blocked
function getCancelBlockedReason(
  status: string | undefined,
  cancelWindowExpired: boolean,
  isCancelled: boolean
): string | null {
  if (isCancelled) {
    return 'This order has been cancelled';
  }
  if (isStatusBlockingCancel(status)) {
    const normalizedStatus = status?.toLowerCase() || '';
    if (['courier_requested', 'driver_assigned', 'driver_en_route', 'picked_up'].includes(normalizedStatus)) {
      return 'Cannot cancel - delivery is in progress';
    }
    if (['delivered', 'completed'].includes(normalizedStatus)) {
      return 'Cannot cancel - order already completed';
    }
    return 'Cannot cancel order in current status';
  }
  if (cancelWindowExpired) {
    return '3-minute cancellation window has expired';
  }
  return null;
}

interface AccountOrderDetailProps {
  orderId: string;
  onNavigate: (path: string) => void;
  config: {
    name: string;
    contact: { phone: string; email: string };
    address: { line1: string; city: string; state: string; zip: string };
  };
  brandColor?: string;
}

export const AccountOrderDetail = ({
  orderId,
  onNavigate,
  config,
  brandColor = '#6B0F1A'
}: AccountOrderDetailProps) => {
  const { user, loading } = useAuth();
  const [order, setOrder] = useState<any | null>(null);
  const [courierTask, setCourierTask] = useState<any | null>(null);
  const [orderEvents, setOrderEvents] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);

  // Cancel window state
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [cancelWindowExpired, setCancelWindowExpired] = useState(true); // Default to expired
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchOrder = async () => {
      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items(*),
            courier_tasks(*),
            order_events(*),
            delivery_address:delivery_address_id(*)
          `)
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;

        if (!orderData) {
          setFetchError('Order not found');
          return;
        }

        const isUserOrder =
          orderData.contact_email === user.email ||
          orderData.contact_phone === user.phone;

        if (!isUserOrder) {
          onNavigate('/account/orders');
          return;
        }

        const normalizedStatus = normalizeOrderStatus(orderData.status);

        const transformedOrder = {
          id: orderData.id,
          status: normalizedStatus,
          mode: orderData.fulfillment_type,
          placedAt: orderData.created_at,
          eta: orderData.delivery_eta || orderData.pickup_eta || orderData.created_at,
          items: orderData.order_items.map((item: any) => {
            const canonicalUnit = item.metadata?.unit || 'each';
            const displayLabel = item.metadata?.unitLabel || item.unit_label;
            return {
              name: item.name,
              price: item.unit_price_cents / 100,
              qty: Number(item.quantity),
              quantityDisplay:
                item.metadata?.quantityDisplay ||
                formatQuantityDisplay(Number(item.quantity), canonicalUnit),
              unit: canonicalUnit,
              unitLabel: displayLabel,
              mods: item.modifiers || [],
              note: item.metadata?.notes,
            };
          }),
          totals: {
            subtotal: orderData.subtotal_cents / 100,
            discount: (orderData.discount_cents || 0) / 100,
            fees: orderData.delivery_fee_cents / 100,
            tax: orderData.tax_cents / 100,
            tips: orderData.tip_cents / 100,
            grand_total: orderData.total_cents / 100,
          },
          customer: {
            email: orderData.contact_email,
            phone: orderData.contact_phone,
            name: orderData.contact_name,
          },
          address: orderData.fulfillment_type === 'delivery' ? (() => {
            // First try to get from joined delivery_address table
            const addr = orderData.delivery_address;
            if (addr) {
              return {
                line1: addr.street_line1,
                apt: addr.street_line2,
                city: addr.city,
                state: addr.state,
                zip: addr.postal_code,
                notes: addr.delivery_instructions || orderData.fulfillment_instructions,
              };
            }
            // Fallback to metadata.delivery if address not in table
            const meta = orderData.metadata?.delivery;
            if (meta) {
              return {
                line1: meta.line1,
                apt: meta.line2,
                city: meta.city,
                state: meta.state,
                zip: meta.zip,
                notes: orderData.fulfillment_instructions,
              };
            }
            return null;
          })() : null,
          metadata: orderData.metadata || {},
        };

        setOrder(transformedOrder);

        if (orderData.courier_tasks && orderData.courier_tasks.length > 0) {
          setCourierTask(orderData.courier_tasks[0]);
        }

        if (orderData.order_events) {
          const normalizedEvents = orderData.order_events.map((event: any) => ({
            ...event,
            status: event.status ? normalizeOrderStatus(event.status) : event.status,
          }));
          setOrderEvents(normalizedEvents);
        }

        // Fetch full OrderDetails via API for cancel functionality
        try {
          const details = await getOrderById(orderId);
          setOrderDetails(details);

          // Check if cancel window is still active (only for non-cancelled orders)
          const isCancelledStatus = ['canceled', 'cancelled'].includes(normalizedStatus.toLowerCase());
          if (!isCancelledStatus) {
            const { expired } = calculateEditWindowRemaining(details.createdAt);
            setCancelWindowExpired(expired);
          }
        } catch (apiErr) {
          console.error('Failed to fetch OrderDetails via API:', apiErr);
          // Don't block the page - cancel just won't be available
        }

      } catch (error: any) {
        console.error('Error fetching order:', error);
        setFetchError(error.message);
      }
    };

    fetchOrder();

    const orderChannel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => fetchOrder()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courier_tasks',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new) setCourierTask(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_events',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new) setOrderEvents((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(orderChannel);
    };
  }, [orderId, user, onNavigate]);

  // Determine if order can be cancelled (within 3-minute window, not cancelled, status allows)
  const isDeliveryOrder = order?.mode === 'delivery';
  const isCancelledOrder = order && ['canceled', 'cancelled'].includes(order.status?.toLowerCase());
  const isStatusBlocking = isStatusBlockingCancel(order?.status);
  const canCancelOrder = orderDetails && !cancelWindowExpired && !isCancelledOrder && !isStatusBlocking;

  // Get the reason why cancel is blocked (for tooltip)
  const cancelBlockedReason = getCancelBlockedReason(order?.status, cancelWindowExpired, isCancelledOrder);

  // Determine if we should show the cancel section at all
  // Show if we have orderDetails and it's a recent enough order (even if blocked)
  const showCancelSection = orderDetails && !isCancelledOrder;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 relative">
            <div
              className="absolute inset-0 border-2 rounded-full animate-spin"
              style={{ borderColor: 'transparent', borderTopColor: brandColor }}
            />
          </div>
          <p className="text-gray-500 text-sm">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!user || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Order not found</h2>
              <p className="text-gray-500 text-sm">We couldn't locate this order.</p>
            </div>
            <Button
              onClick={() => onNavigate('/products')}
              className="w-full h-11 font-medium"
              style={{ backgroundColor: brandColor }}
            >
              Place a new order
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pickupCode = getPickupCode(order.id);
  const eta = new Date(order.eta);

  const handleDownloadReceipt = async () => {
    if (!order) return;
    setReceiptLoading(true);
    try {
      const { receiptUrl } = await getOrderReceipt(order.id);
      if (receiptUrl) {
        window.open(receiptUrl, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Receipt not available yet.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to fetch receipt right now.');
    } finally {
      setReceiptLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'in_kitchen':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'courier_requested':
      case 'driver_en_route':
      case 'picked_up':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'delivered':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'canceled':
        return 'bg-red-50 text-red-600 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/account/orders')}
              className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-gray-900 font-mono">
                  #{order.id.slice(-6).toUpperCase()}
                </h1>
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border",
                  getStatusColor(order.status)
                )}>
                  {order.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(order.placedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Status Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-900">Order Status</h2>
                {courierTask && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    Live
                  </div>
                )}
              </div>
              <StatusTracker
                status={order.status}
                fulfillment={order.mode}
                placedAt={order.placedAt}
                eta={order.eta}
                timeline={orderEvents.reduce((acc, event) => {
                  if (event.status) acc[event.status] = event.created_at;
                  return acc;
                }, {} as Record<string, string>)}
                brandColor={brandColor}
              />

              {/* Cancel Order Section */}
              {showCancelSection && orderDetails && (
                <div className="mt-5 pt-5 border-t space-y-3">
                  {/* Show countdown only if order can still be cancelled */}
                  {canCancelOrder && (
                    <CancelCountdown
                      orderCreatedAt={orderDetails.createdAt}
                      onExpire={handleCancelWindowExpire}
                    />
                  )}

                  {/* Show blocked reason if cancel is disabled */}
                  {!canCancelOrder && cancelBlockedReason && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>{cancelBlockedReason}</span>
                    </div>
                  )}

                  {/* Cancel button */}
                  {canCancelOrder ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCancelDialog(true)}
                      className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Order
                    </Button>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-full gap-2 opacity-50 cursor-not-allowed text-red-400 border-red-100"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Order
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{cancelBlockedReason || 'Order cannot be cancelled'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Fulfillment Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-gray-900 mb-5">
                {order.mode === 'pickup' ? 'Pickup Details' : 'Delivery Details'}
              </h2>

              {order.mode === 'pickup' ? (
                <div className="space-y-5">
                  {/* Pickup Code */}
                  <div
                    className="rounded-xl p-5 text-center"
                    style={{ backgroundColor: `${brandColor}08` }}
                  >
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Your pickup code</p>
                    <div className="text-3xl font-bold font-mono tracking-wider" style={{ color: brandColor }}>
                      {pickupCode}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Show this code when you arrive</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm mb-0.5">Location</p>
                        <p className="text-sm text-gray-500 leading-relaxed">
                          {config.address.line1}<br />
                          {config.address.city}, {config.address.state} {config.address.zip}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm mb-0.5">Ready Time</p>
                        <p className="text-sm text-gray-500">
                          {eta.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm mb-0.5">Delivery Address</p>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {[order.address?.line1, order.address?.apt].filter(Boolean).join(', ')}<br />
                        {[order.address?.city, order.address?.state, order.address?.zip].filter(Boolean).join(', ')}
                      </p>
                      {order.address?.notes && (
                        <p className="text-xs text-gray-400 mt-1.5 bg-gray-50 p-2 rounded">
                          Note: {order.address.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm mb-0.5">Estimated Delivery</p>
                      <p className="text-sm text-gray-500">
                        {eta.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Courier Tracking */}
        {order.mode === 'delivery' && courierTask && courierTask.tracking_url && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card className="bg-blue-50 border-blue-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Live Tracking</p>
                      <p className="text-xs text-gray-500">
                        {courierTask.provider === 'uber' ? 'Uber Direct' : courierTask.provider}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => window.open(courierTask.tracking_url, '_blank')}
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Track <ExternalLink className="w-3 h-3 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Order Summary</h2>
              <div className="space-y-4">
                {order.items.map((item: any, index: number) => (
                  <div key={index}>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        {(() => {
                          const quantityValue = item.quantityDisplay || formatQuantityDisplay(item.qty, item.unit);
                          const displayText = isWeightUnit(item.unit) ? quantityValue : `${quantityValue}×`;
                          return (
                            <p className="font-medium text-gray-900 text-sm">
                              {displayText} {item.name}
                            </p>
                          );
                        })()}
                        {item.mods && item.mods.length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.mods.map((mod: any) => mod.name).join(', ')}
                          </p>
                        )}
                        {item.note && (
                          <p className="text-xs text-gray-400 italic mt-1 bg-gray-50 p-1.5 rounded inline-block">
                            Note: {item.note}
                          </p>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 text-sm">
                        ${(item.price * item.qty).toFixed(2)}
                      </p>
                    </div>
                    {index < order.items.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>

              <Separator className="my-5" />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">${order.totals.subtotal.toFixed(2)}</span>
                </div>
                {order.totals.discount > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: brandColor }}>
                    <span className="font-medium">Promo Discount</span>
                    <span className="font-semibold">-${order.totals.discount.toFixed(2)}</span>
                  </div>
                )}
                {order.totals.fees > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Delivery Fee</span>
                    <span className="text-gray-900">${order.totals.fees.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-900">${order.totals.tax.toFixed(2)}</span>
                </div>
                {order.totals.tips > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tip</span>
                    <span className="text-gray-900">${order.totals.tips.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-3" />
                <div className="flex justify-between items-end">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-xl font-bold" style={{ color: brandColor }}>
                    ${order.totals.grand_total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="grid sm:grid-cols-2 gap-3"
        >
          <Button
            variant="outline"
            onClick={handleDownloadReceipt}
            disabled={receiptLoading}
            className="h-11 font-medium"
          >
            <Receipt className="w-4 h-4 mr-2" />
            {receiptLoading ? 'Loading...' : 'Download Receipt'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsHelpDialogOpen(true)}
            className="h-11 font-medium"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Need Help?
          </Button>
        </motion.div>
      </div>

      {/* Help Dialog */}
      <Dialog open={isHelpDialogOpen} onOpenChange={setIsHelpDialogOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Need help?</DialogTitle>
            <DialogDescription>
              Contact us with your order number so we can assist quickly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Need help?</h3>
                <p className="text-sm text-gray-500">Contact us with your order number.</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium text-gray-900">Order #{order.id.slice(-6).toUpperCase()}</p>
              <p className="text-gray-500">{new Date(order.placedAt).toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              {config?.contact?.phone && (
                <Button
                  className="w-full h-11 justify-start font-medium"
                  style={{ backgroundColor: brandColor }}
                  onClick={() => {
                    window.location.href = `tel:${config.contact.phone.replace(/[^+\d]/g, '')}`;
                  }}
                >
                  <Phone className="w-4 h-4 mr-3" />
                  Call {config.contact.phone}
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full h-11 justify-start font-medium"
                onClick={() => {
                  const subject = encodeURIComponent(`Help with Order #${order.id.slice(-6)}`);
                  const body = encodeURIComponent(
                    `Hi, I need help with my order.\n\nOrder Number: ${order.id}\nPlaced: ${new Date(order.placedAt).toLocaleString()}\n\nIssue: `
                  );
                  window.location.href = `mailto:${config.contact.email}?subject=${subject}&body=${body}`;
                }}
              >
                <Mail className="w-4 h-4 mr-3" />
                Email {config.contact.email}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
