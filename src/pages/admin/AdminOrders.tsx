import { useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase/client';
import {
  adminOrdersErrorAtom,
  adminOrdersFilterAtom,
  adminOrdersLoadingAtom,
  OrdersFilter,
  adminSessionLoadableAtom,
  adminVisibleOrdersAtom,
  cancelOrderAtom,
  markOrderPickedUpAtom,
  refreshAdminOrdersAtom,
} from '../../atoms/admin/ordersAtoms';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { formatCurrency } from '../../lib/pricing';
import type { OrderDetails } from '../../lib/orders/types';
import {
  RefreshCw, Search, Package, Truck, Clock, CheckCircle2,
  XCircle, AlertCircle, User, Phone, Mail, MapPin, Calendar,
  ChevronRight, Filter, CreditCard, Receipt, MessageSquare,
  DollarSign, ShoppingBag, Navigation, X, ExternalLink
} from 'lucide-react';
import { Separator } from '../../components/ui/separator';
import { motion, AnimatePresence } from 'motion/react';

const TERMINAL_STATUSES = ['delivered', 'canceled', 'failed', 'rejected'];

// Helper to capitalize text properly (e.g., "in_kitchen" -> "In Kitchen")
const formatLabel = (text: string) => {
  return text
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const CANCEL_REASONS = [
  'Item unavailable / sold out',
  'Unable to fulfill today',
  'Closed early or staffing issue',
  'Payment or verification issue',
  'Customer requested cancellation',
];

const StatusBadge = ({ status }: { status: string }) => {
  const config = useMemo(() => {
    switch (status) {
      case 'ready':
      case 'accepted':
        return { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: CheckCircle2 };
      case 'in_kitchen':
      case 'preparing':
        return { bg: 'bg-amber-100', text: 'text-amber-800', icon: Clock };
      case 'courier_requested':
      case 'driver_en_route':
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: Truck };
      case 'picked_up':
        return { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Package };
      case 'delivered':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2 };
      case 'canceled':
      case 'failed':
      case 'rejected':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle };
      default:
        return { bg: 'bg-slate-100', text: 'text-slate-800', icon: Clock };
    }
  }, [status]);

  const Icon = config.icon;

  return (
    <Badge className={`${config.bg} ${config.text} gap-1.5 font-medium px-2.5 py-1`}>
      <Icon className="w-3 h-3" />
      {formatLabel(status)}
    </Badge>
  );
};

const FulfillmentBadge = ({ type }: { type: string }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
    type === 'delivery'
      ? 'bg-blue-50 text-blue-700'
      : 'bg-purple-50 text-purple-700'
  }`}>
    {type === 'delivery' ? <Truck className="w-3 h-3" /> : <Package className="w-3 h-3" />}
    {formatLabel(type)}
  </span>
);

const formatFullDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) : '—';

// Order Detail Modal Component
const OrderDetailModal = ({
  order,
  open,
  onClose,
  onPickedUp,
  onCancel,
  isLoading,
}: {
  order: OrderDetails | null;
  open: boolean;
  onClose: () => void;
  onPickedUp: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  if (!order) return null;

  const address = order.deliveryAddress;
  const fullAddress = address
    ? `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.city}, ${address.state} ${address.postalCode}`
    : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                  Order #{order.orderNumber ?? order.shortCode}
                </h2>
                <FulfillmentBadge type={order.fulfillmentType} />
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {formatFullDate(order.createdAt)}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 sm:px-6 py-4 space-y-4 sm:space-y-6">
            {/* Customer Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Name</span>
                  <span className="text-sm font-medium text-gray-900">{order.contact.name || 'Guest'}</span>
                </div>
                {order.contact.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Phone</span>
                    <a href={`tel:${order.contact.phone}`} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                      {order.contact.phone}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {order.contact.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Email</span>
                    <a href={`mailto:${order.contact.email}`} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                      {order.contact.email}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            {order.fulfillmentType === 'delivery' && address && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Delivery Address
                </h3>
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-gray-900">{address.line1}</p>
                  {address.line2 && <p className="text-sm text-gray-600">{address.line2}</p>}
                  <p className="text-sm text-gray-600">{address.city}, {address.state} {address.postalCode}</p>
                  {address.instructions && (
                    <div className="pt-2 border-t border-blue-100">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Delivery Instructions</p>
                      <p className="text-sm text-gray-700 italic">"{address.instructions}"</p>
                    </div>
                  )}
                  {fullAddress && (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-2"
                    >
                      <Navigation className="w-3 h-3" />
                      Open in Google Maps
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Items ({order.items?.length || 0})
              </h3>
              <div className="bg-gray-50 rounded-lg divide-y divide-gray-200 overflow-hidden">
                {order.items?.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 flex gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          {item.quantityDisplay && (
                            <p className="text-xs text-gray-500">{item.quantityDisplay}</p>
                          )}
                          {!item.quantityDisplay && (
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(item.totalPriceCents / 100)}
                        </p>
                      </div>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {item.modifiers.map((mod, modIdx) => (
                            <span key={modIdx} className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                              {mod.name}{mod.price ? ` (+${formatCurrency(mod.price / 100)})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.note && (
                        <p className="text-xs text-gray-500 mt-1 italic">Note: {item.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Payment Summary
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatCurrency(order.totals.subtotalCents / 100)}</span>
                </div>
                {order.totals.deliveryFeeCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="text-gray-900">{formatCurrency(order.totals.deliveryFeeCents / 100)}</span>
                  </div>
                )}
                {order.totals.serviceFeeCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Fee</span>
                    <span className="text-gray-900">{formatCurrency(order.totals.serviceFeeCents / 100)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">{formatCurrency(order.totals.taxCents / 100)}</span>
                </div>
                {order.totals.tipCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tip</span>
                    <span className="text-green-600 font-medium">{formatCurrency(order.totals.tipCents / 100)}</span>
                  </div>
                )}
                {order.totals.discountCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Promo Discount</span>
                    <span className="text-green-600 font-medium">-{formatCurrency(order.totals.discountCents / 100)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-gray-900">{formatCurrency(order.totals.totalCents / 100)}</span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                    order.paymentStatus === 'refunded' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {formatLabel(order.paymentStatus)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            {order.events && order.events.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {order.events.slice().reverse().map((event, idx) => (
                      <div key={event.id || idx} className="flex gap-3">
                        <div className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{event.title}</p>
                          {event.detail && <p className="text-xs text-gray-500">{event.detail}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatFullDate(event.createdAt)} · {event.actor}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Scheduled Time */}
            {order.scheduledFor && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Scheduled For
                </h3>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-800">{formatFullDate(order.scheduledFor)}</p>
                </div>
              </div>
            )}

            {/* ETAs */}
            {(order.pickupEta || order.deliveryEta) && (
              <div className="bg-blue-50 rounded-lg p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wider">Estimated Time</p>
                  <p className="text-sm font-medium text-blue-800">
                    {formatFullDate(order.fulfillmentType === 'delivery' ? order.deliveryEta : order.pickupEta)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-gray-50 flex-shrink-0 flex flex-wrap items-center justify-end gap-2">
          {order.fulfillmentType === 'pickup' && !TERMINAL_STATUSES.includes(order.status) && (
            <Button
              size="sm"
              onClick={onPickedUp}
              disabled={isLoading}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Picked Up
            </Button>
          )}
          {!TERMINAL_STATUSES.includes(order.status) && (
            <Button
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
              className="gap-2 text-red-600 bg-red-50 hover:bg-red-100"
            >
              <XCircle className="w-4 h-4" />
              Cancel Order
            </Button>
          )}
          <Button
            size="sm"
            onClick={onClose}
            className="gap-2 bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const canMarkPickedUp = (order: OrderDetails) =>
  order.fulfillmentType === 'pickup' && !TERMINAL_STATUSES.includes(order.status);

const canCancelOrder = (order: OrderDetails) =>
  !TERMINAL_STATUSES.includes(order.status);

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }) : '—';

// Order Card Component - Mobile Optimized
const OrderCard = ({
  order,
  onPickedUp,
  onCancel,
  onClick,
  isLoading,
  actionState
}: {
  order: OrderDetails;
  onPickedUp: () => void;
  onCancel: () => void;
  onClick: () => void;
  isLoading: boolean;
  actionState: 'pickup' | 'cancel' | null;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer"
    onClick={onClick}
  >
    {/* Header */}
    <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-transparent">
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-gray-900">
              #{order.orderNumber ?? order.shortCode}
            </span>
            <FulfillmentBadge type={order.fulfillmentType} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{formatDate(order.createdAt)}</span>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>
    </div>

    {/* Content */}
    <div className="px-4 sm:px-5 py-3 sm:py-4">
      {/* Mobile: Compact layout */}
      <div className="flex items-center justify-between gap-4 sm:hidden mb-3">
        <div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(order.totals.totalCents / 100)}
          </p>
          <p className="text-xs text-gray-500">
            {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{order.contact.name || 'Guest'}</p>
          {order.contact.phone && (
            <a
              href={`tel:${order.contact.phone}`}
              className="text-xs text-blue-600"
              onClick={(e) => e.stopPropagation()}
            >
              {order.contact.phone}
            </a>
          )}
        </div>
      </div>

      {/* Desktop: Full grid */}
      <div className="hidden sm:grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Customer Info */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-900">
              <User className="w-3.5 h-3.5 text-gray-400" />
              {order.contact.name || 'Guest'}
            </div>
            {order.contact.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {order.contact.phone}
              </div>
            )}
            {order.contact.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600 truncate">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {order.contact.email}
              </div>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Order</p>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(order.totals.totalCents / 100)}
            </p>
            <p className="text-xs text-gray-500">
              {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Delivery Address (if applicable) */}
        {order.fulfillmentType === 'delivery' && order.deliveryAddress && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Delivery To</p>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">
                {order.deliveryAddress.streetLine1}
                {order.deliveryAddress.city && `, ${order.deliveryAddress.city}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Delivery address */}
      {order.fulfillmentType === 'delivery' && order.deliveryAddress && (
        <div className="sm:hidden flex items-start gap-2 text-sm text-gray-600 pt-2 border-t border-gray-100">
          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">
            {order.deliveryAddress.streetLine1}
            {order.deliveryAddress.city && `, ${order.deliveryAddress.city}`}
          </span>
        </div>
      )}
    </div>

    {/* Actions */}
    <div className="px-4 sm:px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2">
      {canMarkPickedUp(order) && (
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPickedUp();
          }}
          disabled={isLoading}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 flex-1 sm:flex-none"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span className="sm:inline">{actionState === 'pickup' ? 'Saving...' : 'Picked Up'}</span>
        </Button>
      )}
      {canCancelOrder(order) && (
        <Button
          size="sm"
          className="text-red-600 bg-red-50 hover:bg-red-100 gap-2 flex-1 sm:flex-none"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          disabled={isLoading}
        >
          <XCircle className="w-4 h-4" />
          <span>{actionState === 'cancel' ? 'Cancelling...' : 'Cancel'}</span>
        </Button>
      )}
      {!canMarkPickedUp(order) && !canCancelOrder(order) && (
        <span className="text-xs text-gray-400 italic">Completed</span>
      )}
    </div>
  </motion.div>
);

export const AdminOrders = () => {
  const [filters, setFilters] = useAtom(adminOrdersFilterAtom);
  const orders = useAtomValue(adminVisibleOrdersAtom);
  const loading = useAtomValue(adminOrdersLoadingAtom);
  const error = useAtomValue(adminOrdersErrorAtom);
  const sessionState = useAtomValue(adminSessionLoadableAtom);
  const refresh = useSetAtom(refreshAdminOrdersAtom);
  const markPickedUp = useSetAtom(markOrderPickedUpAtom);
  const cancelOrder = useSetAtom(cancelOrderAtom);
  const [actionState, setActionState] = useState<Record<string, 'pickup' | 'cancel' | null>>({});
  const [cancelTarget, setCancelTarget] = useState<OrderDetails | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);

  const isAdminReady =
    sessionState.state === 'hasData' && sessionState.data?.isAdmin;

  useEffect(() => {
    if (isAdminReady) {
      refresh();
    }
  }, [filters.status, filters.fulfillment, isAdminReady, refresh]);

  // Live updates via Supabase realtime
  useEffect(() => {
    if (!isAdminReady) return;
    const channel = supabase
      .channel('admin-orders-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdminReady, refresh]);

  const handlePickedUp = async (orderId: string) => {
    setActionState((prev) => ({ ...prev, [orderId]: 'pickup' }));
    try {
      await markPickedUp(orderId);
      toast.success('Order marked as picked up');
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to update order');
    } finally {
      setActionState((prev) => ({ ...prev, [orderId]: null }));
    }
  };

  const openCancelDialog = (order: OrderDetails) => {
    setCancelTarget(order);
    setCancelReason(CANCEL_REASONS[0]);
    setCustomReason('');
  };

  const resetCancelState = () => {
    setCancelTarget(null);
    setCancelReason(CANCEL_REASONS[0]);
    setCustomReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    const finalReason = (customReason.trim() || cancelReason || 'Canceled by merchant').trim();
    setActionState((prev) => ({ ...prev, [cancelTarget.id]: 'cancel' }));
    try {
      await cancelOrder({ orderId: cancelTarget.id, reason: finalReason });
      toast.success(`Order #${cancelTarget.orderNumber ?? cancelTarget.shortCode} canceled`);
      resetCancelState();
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to cancel order');
    } finally {
      setActionState((prev) => ({ ...prev, [cancelTarget.id]: null }));
    }
  };

  const isActionLoading = (orderId: string) => Boolean(actionState[orderId]);

  // Stats
  const stats = useMemo(() => {
    const active = orders.filter(o => !TERMINAL_STATUSES.includes(o.status));
    const pickups = orders.filter(o => o.fulfillmentType === 'pickup' && !TERMINAL_STATUSES.includes(o.status));
    const deliveries = orders.filter(o => o.fulfillmentType === 'delivery' && !TERMINAL_STATUSES.includes(o.status));
    return { active: active.length, pickups: pickups.length, deliveries: deliveries.length };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-gray-500 mt-1">Manage pickup and delivery orders</p>
        </div>
        <Button
          onClick={() => refresh()}
          disabled={loading}
          className="gap-2 bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-amber-50 rounded-xl p-3 sm:p-4 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-xs text-amber-700">Active Orders</p>
            </div>
          </div>
        </div>
        <div className="bg-purple-50 rounded-xl p-3 sm:p-4 border border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-purple-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pickups}</p>
              <p className="text-xs text-purple-700">Pickups</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 sm:p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.deliveries}</p>
              <p className="text-xs text-blue-700">Deliveries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative" style={{ flex: '1 1 0%', minWidth: 0 }}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <Input
                placeholder="Search by name, phone, email, or order #"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                paddingLeft={44}
                className="w-full"
              />
            </div>
            <div className="flex-shrink-0">
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value as OrdersFilter['status'] }))
                }
              >
                <SelectTrigger className="w-full sm:w-[180px] h-11">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in_kitchen">In Kitchen</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="courier_requested">Courier Requested</SelectItem>
                  <SelectItem value="driver_en_route">Driver En Route</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-shrink-0">
              <Select
                value={filters.fulfillment}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    fulfillment: value as OrdersFilter['fulfillment'],
                  }))
                }
              >
                <SelectTrigger className="w-full sm:w-[160px] h-11">
                  <SelectValue placeholder="Fulfillment" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pickup">Pickup Only</SelectItem>
                  <SelectItem value="delivery">Delivery Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Orders List */}
      <AnimatePresence mode="popLayout">
        {loading && orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <div className="w-12 h-12 border-4 border-gray-200 border-t-brand rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading orders...</p>
          </motion.div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300"
          >
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No orders found</h3>
            <p className="text-gray-500 text-sm">
              {filters.search || filters.status !== 'all' || filters.fulfillment !== 'all'
                ? 'Try adjusting your filters'
                : 'New orders will appear here'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPickedUp={() => handlePickedUp(order.id)}
                onCancel={() => openCancelDialog(order)}
                onClick={() => setSelectedOrder(order)}
                isLoading={isActionLoading(order.id)}
                actionState={actionState[order.id] || null}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Dialog */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && resetCancelState()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Order & Issue Refund</DialogTitle>
            <DialogDescription>
              The customer will be notified via SMS/email. Refunds are processed automatically through Stripe.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Select a reason:</p>
              <div className="flex flex-wrap gap-2">
                {CANCEL_REASONS.map((reason) => (
                  <Button
                    key={reason}
                    type="button"
                    size="sm"
                    onClick={() => {
                      setCancelReason(reason);
                      setCustomReason('');
                    }}
                    className={
                      cancelReason === reason
                        ? 'bg-brand hover:bg-brand-hover text-white'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                    }
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Custom note (optional):
              </p>
              <Textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Add a custom message for the customer..."
                rows={3}
              />
            </div>

            <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>Refunds are sent to the original payment method. Customers are notified automatically.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={resetCancelState}
              className="bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
            >
              Keep Order
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              onClick={handleConfirmCancel}
              disabled={!cancelTarget || isActionLoading(cancelTarget?.id || '')}
            >
              {cancelTarget && isActionLoading(cancelTarget.id) ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        onPickedUp={() => {
          if (selectedOrder) {
            handlePickedUp(selectedOrder.id);
          }
        }}
        onCancel={() => {
          if (selectedOrder) {
            setSelectedOrder(null);
            openCancelDialog(selectedOrder);
          }
        }}
        isLoading={selectedOrder ? isActionLoading(selectedOrder.id) : false}
      />
    </div>
  );
};
