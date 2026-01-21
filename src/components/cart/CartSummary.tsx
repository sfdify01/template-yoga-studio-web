import { CartTotals, formatPrice } from '../../lib/cart/useCart';

interface CartSummaryProps {
  totals: CartTotals;
  children?: React.ReactNode;
}

export const CartSummary = ({ totals, children }: CartSummaryProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">Subtotal</span>
        <span>{formatPrice(totals.subtotal)}</span>
      </div>

      {totals.tax > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax</span>
          <span>{formatPrice(totals.tax)}</span>
        </div>
      )}

      {totals.fees > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Platform fee</span>
          <span>{formatPrice(totals.fees)}</span>
        </div>
      )}

      {totals.deliveryFee && totals.deliveryFee > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Delivery Fee</span>
          <span>{formatPrice(totals.deliveryFee)}</span>
        </div>
      )}

      {totals.tips > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tip</span>
          <span>{formatPrice(totals.tips)}</span>
        </div>
      )}

      <div className="border-t pt-2 mt-2">
        <div className="flex justify-between">
          <span className="font-medium">Total</span>
          <span className="font-medium">{formatPrice(totals.grand_total)}</span>
        </div>
      </div>

      {children && (
        <div className="text-xs text-gray-500 mt-2">
          {children}
        </div>
      )}
    </div>
  );
};
