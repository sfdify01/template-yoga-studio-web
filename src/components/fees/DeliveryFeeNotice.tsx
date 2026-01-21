import { motion } from 'motion/react';
import { Truck, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';

interface DeliveryFeeNoticeProps {
  quote: {
    ok: boolean;
    zone?: {
      label: string;
      feeCents: number;
      minOrderCents: number;
      etaMin: number;
    };
    distanceKm?: number;
    reason?: string;
  };
  cartSubtotalCents: number;
  brandColor?: string;
}

export const DeliveryFeeNotice = ({
  quote,
  cartSubtotalCents,
  brandColor = '#6B0F1A',
}: DeliveryFeeNoticeProps) => {
  if (!quote.ok) {
    // Out of zone or error
    let message = 'Unable to calculate delivery fee';
    
    if (quote.reason === 'OUT_OF_ZONE') {
      message = "We're currently outside your delivery area. Try Pickup instead.";
    } else if (quote.reason === 'INVALID_ADDRESS') {
      message = 'Please enter a valid address to see delivery fees.';
    }

    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    );
  }

  const { zone } = quote;
  if (!zone) return null;

  const deliveryFee = (zone.feeCents / 100).toFixed(2);
  const minOrder = (zone.minOrderCents / 100).toFixed(2);
  const cartSubtotal = (cartSubtotalCents / 100).toFixed(2);
  const meetsMinimum = cartSubtotalCents >= zone.minOrderCents;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" style={{ color: brandColor }} />
            <h3 className="font-semibold">Delivery Details</h3>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs">Delivery Fee</span>
              </div>
              <div className="font-semibold" style={{ color: brandColor }}>
                ${deliveryFee}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs">ETA</span>
              </div>
              <div className="font-semibold">~{zone.etaMin} min</div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-gray-600 mb-1">
                <DollarSign className="w-3 h-3" />
                <span className="text-xs">Min. Order</span>
              </div>
              <div className="font-semibold">${minOrder}</div>
            </div>
          </div>

          {/* Minimum Order Warning */}
          {!meetsMinimum && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-xs">
                Add ${(zone.minOrderCents / 100 - cartSubtotalCents / 100).toFixed(2)} more to meet
                the ${minOrder} minimum for delivery
              </AlertDescription>
            </Alert>
          )}

          {/* Zone Info */}
          {quote.distanceKm && (
            <div className="text-xs text-gray-600 pt-2 border-t">
              {zone.label} • {quote.distanceKm.toFixed(1)}km from restaurant
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
