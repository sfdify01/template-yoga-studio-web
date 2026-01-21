import { useState } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { cancelOrderAtom, orderCancelStatusAtom } from '../../atoms/orders/orderAtoms';
import { formatCurrency } from '../../lib/pricing';

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTotal: number;
  customerPhone?: string;
  customerEmail?: string;
  isDelivery: boolean;
  onSuccess: () => void;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderTotal,
  customerPhone,
  customerEmail,
  isDelivery,
  onSuccess,
}: CancelOrderDialogProps) {
  const cancelOrder = useSetAtom(cancelOrderAtom);
  const cancelStatus = useAtomValue(orderCancelStatusAtom);
  const [error, setError] = useState<string | null>(null);

  const isCancelling = cancelStatus === 'cancelling';

  // Convert cents to dollars for display
  const orderTotalDollars = orderTotal / 100;

  // Estimate Stripe processing fee (2.9% + $0.30) - calculate in dollars
  const processingFeeEstimate = orderTotalDollars * 0.029 + 0.30;

  const handleCancel = async () => {
    setError(null);
    try {
      await cancelOrder({
        orderId,
        customerPhone,
        customerEmail,
        reason: 'Canceled by customer within edit window',
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel order. Please try again.');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p>Are you sure you want to cancel this order?</p>

              {/* Refund info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order Total</span>
                  <span className="font-medium">{formatCurrency(orderTotalDollars)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Refund Amount</span>
                  <span className="font-medium">{formatCurrency(orderTotalDollars)}</span>
                </div>
              </div>

              {/* Warnings */}
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg p-3">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Processing fees may apply</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Stripe processing fees (~{formatCurrency(processingFeeEstimate)}) may not be refunded.
                    </p>
                  </div>
                </div>

                {isDelivery && (
                  <div className="flex items-start gap-2 text-blue-700 bg-blue-50 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p>Your delivery will be cancelled.</p>
                  </div>
                )}

                <p className="text-gray-500">
                  Refunds typically take 5-10 business days to appear on your statement.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCancelling}
          >
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Order'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
