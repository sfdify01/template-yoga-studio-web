import { useMemo } from 'react';
import { Check, Loader2, Truck, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { normalizeOrderStatus } from '../../lib/state';
import type { OrderStatus } from '../../lib/types';

interface StatusTrackerProps {
  status: string;
  fulfillment: 'pickup' | 'delivery';
  placedAt: string;
  eta: string;
  timeline?: Record<string, string>;
  brandColor?: string;
}

const statusSteps: Record<
  'pickup' | 'delivery',
  Array<{ key: OrderStatus; label: string; icon: typeof Check }>
> = {
  pickup: [
    { key: 'created', label: 'Order Placed', icon: Check },
    { key: 'accepted', label: 'Confirmed', icon: Check },
    { key: 'in_kitchen', label: 'Preparing', icon: Loader2 },
    { key: 'ready', label: 'Ready for Pickup', icon: CheckCircle },
    { key: 'delivered', label: 'Picked Up', icon: CheckCircle },
  ],
  delivery: [
    { key: 'created', label: 'Order Placed', icon: Check },
    { key: 'accepted', label: 'Confirmed', icon: Check },
    { key: 'in_kitchen', label: 'Preparing', icon: Loader2 },
    { key: 'ready', label: 'Ready for Courier', icon: CheckCircle },
    { key: 'courier_requested', label: 'Courier Requested', icon: Loader2 },
    { key: 'driver_en_route', label: 'Driver En Route', icon: Truck },
    { key: 'picked_up', label: 'Out for Delivery', icon: Truck },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
  ],
};

export const StatusTracker = ({ status, fulfillment, placedAt, eta, timeline = {}, brandColor = '#6B0F1A' }: StatusTrackerProps) => {
  const normalizedStatus = normalizeOrderStatus(status);
  const steps = statusSteps[fulfillment];
  const currentStepIndex = steps.findIndex((s) => s.key === normalizedStatus);
  const isFailed = ['rejected', 'canceled', 'failed'].includes(normalizedStatus);

  const normalizedTimeline = useMemo(() => {
    return Object.entries(timeline || {}).reduce<Record<OrderStatus, string>>((acc, [key, value]) => {
      const normalizedKey = normalizeOrderStatus(key);
      if (!acc[normalizedKey]) {
        acc[normalizedKey] = value;
      }
      return acc;
    }, {} as Record<OrderStatus, string>);
  }, [timeline]);

  if (isFailed) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl">
        <div className="flex items-center gap-3 text-red-700">
          <XCircle className="w-6 h-6" />
          <div>
            <h3 className="text-lg">Order {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}</h3>
            <p className="text-sm">
              {normalizedStatus === 'rejected' && 'Your order could not be confirmed. Please contact us.'}
              {normalizedStatus === 'canceled' && 'This order has been canceled.'}
              {normalizedStatus === 'failed' && 'There was an error processing your order.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isComplete = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const timestamp = normalizedTimeline[step.key];
        const Icon = step.icon;

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative flex items-start gap-4"
          >
            {/* Timeline line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute left-4 top-8 bottom-0 w-0.5 ${
                  isComplete ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}

            {/* Icon */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                isComplete
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {isCurrent && step.icon === Loader2 ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <h4
                  className={`${
                    isComplete || isCurrent ? '' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </h4>
                {timestamp && (
                  <span className="text-sm text-gray-500">
                    {new Date(timestamp).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              {isCurrent && (
                <p className="text-sm text-gray-600 mt-1">
                  {step.key === 'accepted' && 'Restaurant confirmed your order'}
                  {step.key === 'in_kitchen' && 'Your order is being prepared'}
                  {step.key === 'ready' &&
                    (fulfillment === 'pickup'
                      ? 'Ready for pickup!'
                      : 'Prepping for courier handoff')}
                  {step.key === 'courier_requested' && 'Looking for an available courier'}
                  {step.key === 'driver_en_route' && 'Driver is on the way to the store'}
                  {step.key === 'picked_up' && 'Your order is en route'}
                </p>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
