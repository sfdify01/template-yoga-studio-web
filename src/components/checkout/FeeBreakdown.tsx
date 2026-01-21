import { Totals } from '../../lib/types';
import { formatCurrency } from '../../lib/pricing';
import { Separator } from '../ui/separator';

interface FeeBreakdownProps {
  totals: Totals;
  showDetails?: boolean;
}

export const FeeBreakdown = ({ totals, showDetails = true }: FeeBreakdownProps) => {
  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-2xl">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Subtotal</span>
        <span>{formatCurrency(totals.subtotal)}</span>
      </div>

      {showDetails && (
        <>
          {totals.delivery_fee && totals.delivery_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Fee</span>
              <span>{formatCurrency(totals.delivery_fee)}</span>
            </div>
          )}

          {totals.service_fee && totals.service_fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Platform fee</span>
              <span>{formatCurrency(totals.service_fee)}</span>
            </div>
          )}

          {totals.fees > 0 && !totals.service_fee && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Fees</span>
              <span>{formatCurrency(totals.fees)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>

          {totals.tips > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tip</span>
              <span>{formatCurrency(totals.tips)}</span>
            </div>
          )}

          {totals.discount && totals.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-{formatCurrency(totals.discount)}</span>
            </div>
          )}

          <Separator />
        </>
      )}

      <div className="flex justify-between">
        <span>Total</span>
        <span>{formatCurrency(totals.grand_total)}</span>
      </div>
    </div>
  );
};
