import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { StatusTracker } from '../components/status/StatusTracker';
import { MapEta } from '../components/status/MapEta';
import { SupportButton } from '../components/status/SupportButton';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Receipt, MapPin, Clock } from 'lucide-react';
import { getOrderById } from '../lib/orders/api';
import type { OrderDetails } from '../lib/orders/types';
import { normalizeOrderStatus } from '../lib/state';
import { formatQuantityDisplay } from '../lib/units';

interface StatusProps {
  orderId: string;
  onNavigate: (path: string) => void;
  config: {
    name: string;
    contact: { phone: string; email: string };
    theme: { brand: string };
    address: { line1: string; city: string; state: string; zip: string };
  };
}

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const Status = ({ orderId, onNavigate, config }: StatusProps) => {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let intervalId: number | null = null;

    const loadOrder = async () => {
      try {
        const data = await getOrderById(orderId);
        if (mounted) {
          setOrder(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Order not found');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadOrder();
    intervalId = window.setInterval(loadOrder, 10000);

    return () => {
      mounted = false;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
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

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-6">
            We couldn&apos;t find an order with ID: {orderId}
          </p>
          <Button
            onClick={() => onNavigate('/')}
            className="rounded-2xl text-white"
            style={{ backgroundColor: config.theme.brand }}
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const normalizedStatus = normalizeOrderStatus(order.status);
  const isDelivery = order.fulfillmentType === 'delivery';
  const isCanceledOrFailed = ['rejected', 'canceled', 'failed'].includes(normalizedStatus);
  const showMap = isDelivery && normalizedStatus !== 'delivered' && !isCanceledOrFailed;
  const eta =
    order.fulfillmentType === 'delivery'
      ? order.deliveryEta || ''
      : order.pickupEta || '';

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('/')}
            className="rounded-2xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1>Order Status</h1>
            <p className="text-sm text-gray-600">#{order.shortCode}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {normalizedStatus === 'created' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-green-50 border border-green-200 rounded-2xl text-center"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Receipt className="w-8 h-8 text-white" />
            </div>
            <h2 className="mb-2">Order Placed Successfully!</h2>
            <p className="text-gray-600">
              We&apos;ve received your order and will start preparing it soon.
            </p>
          </motion.div>
        )}

        {eta && !isCanceledOrFailed && (
          <Card className="p-6 text-center">
            <Clock
              className="w-8 h-8 mx-auto mb-2"
              style={{ color: config.theme.brand }}
            />
            <p className="text-sm text-gray-600 mb-1">
              Estimated {isDelivery ? 'Delivery' : 'Pickup'} Time
            </p>
            <p className="text-2xl">
              {new Date(eta).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="mb-6">Order Progress</h2>
          <StatusTracker
            status={normalizedStatus}
            fulfillment={order.fulfillmentType}
            placedAt={order.createdAt}
            eta={eta}
            timeline={order.timestamps}
            brandColor={config.theme.brand}
          />
        </Card>

        {showMap && (
          <Card className="p-6">
            <h2 className="mb-4">Live Tracking</h2>
            <MapEta
              driverLocation={undefined}
              deliveryLocation={{
                lat: order.deliveryAddress?.latitude ?? 41.750,
                lng: order.deliveryAddress?.longitude ?? -88.153,
              }}
              eta={eta}
              trackingUrl={undefined}
            />
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="mb-2">
                {isDelivery ? 'Delivery Address' : 'Pickup Location'}
              </h3>
              <p className="text-sm text-gray-600">
                {isDelivery && order.deliveryAddress ? (
                  <>
                    {order.deliveryAddress.line1}
                    {order.deliveryAddress.line2 && (
                      <>
                        <br />
                        {order.deliveryAddress.line2}
                      </>
                    )}
                    <br />
                    {order.deliveryAddress.city}, {order.deliveryAddress.state}{' '}
                    {order.deliveryAddress.postalCode}
                  </>
                ) : (
                  <>
                    {config.address.line1}
                    <br />
                    {config.address.city}, {config.address.state}{' '}
                    {config.address.zip}
                  </>
                )}
              </p>
              {isDelivery && order.deliveryAddress?.instructions && (
                <p className="text-sm text-gray-500 mt-2">
                  Instructions: {order.deliveryAddress.instructions}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-4">Order Details</h2>
          <div className="space-y-3">
            {order.items.map((item) => {
              const quantityText =
                item.quantityDisplay ||
                formatQuantityDisplay(item.quantity, item.unit || undefined);
              return (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {quantityText} {item.name}
                  </span>
                  <span>{formatCurrency(item.totalPriceCents)}</span>
                </div>
              );
            })}
          </div>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(order.totals.subtotalCents)}</span>
            </div>
            {order.totals.discountCents > 0 && (
              <div className="flex justify-between" style={{ color: config.theme.brand }}>
                <span className="font-medium">Promo Discount</span>
                <span className="font-semibold">-{formatCurrency(order.totals.discountCents)}</span>
              </div>
            )}
            {order.totals.deliveryFeeCents > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span>{formatCurrency(order.totals.deliveryFeeCents)}</span>
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
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(order.totals.totalCents)}</span>
            </div>
          </div>
        </Card>

        <SupportButton
          phone={config.contact.phone}
          email={config.contact.email}
          orderId={order.id}
        />
      </div>
    </div>
  );
};
