import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Package, ShoppingBag } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { StatusTracker } from '../components/status/StatusTracker';
import { useAuth } from '../lib/auth/AuthContext';
import { trackOrder as trackOrderApi } from '../lib/orders/api';
import type { OrderDetails } from '../lib/orders/types';
import { formatQuantityDisplay } from '../lib/units';

interface TrackOrderProps {
  orderNumber?: string;
  onNavigate: (path: string) => void;
  brandColor?: string;
}

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const TrackOrder = ({
  orderNumber,
  onNavigate,
  brandColor = '#6B0F1A',
}: TrackOrderProps) => {
  const { user } = useAuth();
  const [search, setSearch] = useState(orderNumber || '');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderNumber) {
      handleSearch(orderNumber);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  const handleSearch = async (searchTerm?: string) => {
    const term = (searchTerm || search).trim();
    if (!term) {
      setError('Please enter an order number');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const result = await trackOrderApi(term);
      setOrder(result);
    } catch (err: any) {
      setError(err?.message || 'Order not found. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const isUserOrder =
    user &&
    order &&
    (order.contact.email === user.email || order.contact.phone === user.phone);

  const isDelivery = order?.fulfillmentType === 'delivery';
  const eta =
    order &&
    (order.fulfillmentType === 'delivery'
      ? order.deliveryEta || ''
      : order.pickupEta || '');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="mb-2">Track Your Order</h1>
            <p className="text-gray-600">
              Enter your order number to see real-time status updates
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Order Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Enter order number or last 6 digits"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      paddingLeft={44}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {loading ? 'Searching...' : 'Track Order'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  You can find your order number in your confirmation email or
                  receipt.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </form>
          </Card>
        </motion.div>

        {order && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="mb-1">Order #{order.shortCode}</h2>
                    <p className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDelivery ? (
                      <>
                        <Package className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium">Delivery</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium">Pickup</span>
                      </>
                    )}
                  </div>
                </div>

                <StatusTracker
                  status={order.status}
                  fulfillment={order.fulfillmentType}
                  placedAt={order.createdAt}
                  eta={eta}
                  timeline={order.timestamps}
                  brandColor={brandColor}
                />
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2">
                  {order.items.map((item) => {
                    const quantityText =
                      item.quantityDisplay ||
                      formatQuantityDisplay(item.quantity, item.unit || undefined);
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm text-gray-700"
                      >
                        <span>
                          {quantityText} {item.name}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.totalPriceCents)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t pt-3 mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(order.totals.subtotalCents)}</span>
                  </div>
                  {order.totals.deliveryFeeCents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span>
                        {formatCurrency(order.totals.deliveryFeeCents)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span>{formatCurrency(order.totals.taxCents)}</span>
                  </div>
                  {order.totals.tipCents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tip</span>
                      <span>{formatCurrency(order.totals.tipCents)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span style={{ color: brandColor }}>
                      {formatCurrency(order.totals.totalCents)}
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {isUserOrder && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onNavigate(`/account/orders/${order.id}`)}
                >
                  View Full Order Details
                </Button>
              </motion.div>
            )}
          </>
        )}

        {!order && !error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="mb-2">Track Your Order</h3>
              <p className="text-gray-600 mb-6">
                Enter your order number above to see real-time updates on your
                order status.
              </p>
              <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <span>Don&apos;t have an order yet?</span>
                <button
                  onClick={() => onNavigate('/menu')}
                  className="font-medium hover:underline"
                  style={{ color: brandColor }}
                >
                  Start ordering →
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};
