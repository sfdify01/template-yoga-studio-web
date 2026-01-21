import { motion } from 'motion/react';
import { CheckCircle2, Package, Home, Clock, MapPin, Star, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import { useConfig } from '../../hooks/useConfig';
import type { LoyaltySummary } from '../../lib/orders/types';
import { estimateStripeProcessingFee } from '../../lib/orders/fees';

interface CheckoutStepConfirmationProps {
  orderId: string;
  orderNumber: string;
  eta: string;
  deliveryType: 'pickup' | 'delivery';
  items: any[];
  totals: {
    subtotal: number;
    deliveryFee?: number;
    serviceFee: number;
    tax: number;
    tip: number;
    discount?: number;
    total: number;
  };
  brandColor: string;
  loyalty?: LoyaltySummary | null;
  onTrackOrder?: () => void;
  onViewOrderDetails?: () => void;
  onBackToMenu: () => void;
  onNewOrder: () => void;
}

export const CheckoutStepConfirmation = ({
  orderId,
  orderNumber,
  eta,
  deliveryType,
  items,
  totals,
  brandColor,
  loyalty,
  onTrackOrder,
  onViewOrderDetails,
  onBackToMenu,
  onNewOrder,
}: CheckoutStepConfirmationProps) => {
  const { config } = useConfig();
  const stripeFeeEstimate = estimateStripeProcessingFee(totals.total);
  const netPayoutEstimate = Math.max(
    totals.total - stripeFeeEstimate - totals.serviceFee - (totals.deliveryFee || 0),
    0
  );
  
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatEta = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-full"
    >
      {/* Header - Fixed. Extra right padding on mobile for close button */}
      <header className="flex-shrink-0 bg-gradient-to-br from-green-50 to-emerald-50 border-b border-green-100 py-6 px-4 pr-14 lg:pr-4">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4"
          >
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Order Confirmed! 🎉</h2>
          <p className="text-gray-600">We've received your order</p>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Step 3 of 3</span>
          <div className="flex gap-1.5">
            <div className="w-8 h-1 rounded-full bg-gray-300" />
            <div className="w-8 h-1 rounded-full bg-gray-300" />
            <div className="w-8 h-1 rounded-full" style={{ backgroundColor: brandColor }} />
          </div>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loyalty && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: brandColor }}
            >
              <Star className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">You earned {loyalty.starsEarned} ⭐</p>
              <p className="text-xs text-gray-600">
                New balance: {loyalty.newBalance.toLocaleString()} ⭐
              </p>
            </div>
          </div>
        )}

        {/* Order Info Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Order Details</h4>
            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
              #{orderNumber}
            </span>
          </div>
          
          <div className="space-y-3">
            {/* Fulfillment Type */}
            <div className="flex items-start gap-3">
              {deliveryType === 'pickup' ? (
                <Package className="w-5 h-5 text-gray-600 mt-0.5" />
              ) : (
                <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {deliveryType === 'pickup' ? 'Pickup' : 'Delivery'}
                </p>
                <p className="text-xs text-gray-500">
                  {deliveryType === 'pickup'
                    ? (config
                        ? `${config.address.line1}, ${config.address.city}, ${config.address.state} ${config.address.zip}`
                        : 'Pickup available at our Naperville location')
                    : 'Your delivery address'}
                </p>
              </div>
            </div>

            {/* ETA */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">
                  {deliveryType === 'pickup' ? 'Ready by' : 'Estimated arrival'}
                </p>
                <p className="text-xs text-gray-500">{formatEta(eta)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h4 className="font-medium mb-3">Order Summary</h4>
          <div className="space-y-2">
            {items.map((item, index) => {
              const quantityText = item.quantityDisplay || `${item.qty}×`;
              return (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {quantityText} {item.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.price * item.qty)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-200 mt-3 pt-3 space-y-2">
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
              <span className="text-gray-600">Platform fee</span>
              <span>{formatCurrency(totals.serviceFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span>{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tip</span>
              <span>{formatCurrency(totals.tip)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold">Total Paid</span>
                <span className="font-bold text-lg" style={{ color: brandColor }}>
                  {formatCurrency(totals.total)}
                </span>
              </div>
              {netPayoutEstimate > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Est. net to kitchen after fees: <strong>{formatCurrency(netPayoutEstimate)}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <h4 className="font-medium text-blue-900 mb-2">What&apos;s Next?</h4>
          <ul className="text-sm text-blue-800 space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="mt-1">✓</span>
              <span>You&apos;ll receive SMS updates about your order</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">✓</span>
              <span>
                {deliveryType === 'pickup'
                  ? "We'll notify you when your order is ready for pickup"
                  : 'Track your delivery in real-time'}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">✓</span>
              <span>Questions? Call us anytime</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer - Fixed */}
      <footer className="flex-shrink-0 bg-white border-t p-4 space-y-2">
        {/* Primary action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {deliveryType === 'delivery' && onTrackOrder && (
            <Button
              size="lg"
              className="w-full text-white"
              style={{ backgroundColor: brandColor }}
              onClick={onTrackOrder}
            >
              <Package className="w-5 h-5 mr-2" />
              Track Delivery
            </Button>
          )}
          {onViewOrderDetails && (
            <Button
              size="lg"
              className={`w-full text-white ${deliveryType !== 'delivery' || !onTrackOrder ? 'col-span-2' : ''}`}
              style={{ backgroundColor: brandColor }}
              onClick={onViewOrderDetails}
            >
              <FileText className="w-5 h-5 mr-2" />
              View Order Details
            </Button>
          )}
        </div>

        {/* Secondary action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={onBackToMenu}
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Menu
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            onClick={onNewOrder}
          >
            Start New Order
          </Button>
        </div>
      </footer>
    </motion.div>
  );
};
