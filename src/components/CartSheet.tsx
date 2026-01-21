import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { useCart, formatPrice } from '../lib/cart/useCart';
import { formatCurrency } from '../lib/pricing';
import {
  formatQuantityDisplay,
  formatQuantityValue,
  formatUnitSuffix,
  getUnitDecimals,
  getUnitMinimum,
  getUnitQuantitySuffix,
  getUnitStep,
  isWeightUnit,
} from '../lib/units';
import { WeightQuantityInput } from './cart/WeightQuantityInput';

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckout: () => void;
  brandColor: string;
}

export const CartSheet = ({
  open,
  onOpenChange,
  onCheckout,
  brandColor,
}: CartSheetProps) => {
  const { items, totals, setQty, removeItem } = useCart();

  // Ensure items is always an array
  const cartItems = items || [];
  if (cartItems.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center h-[60vh] text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="mb-2">Your cart is empty</h3>
            <p className="text-gray-600 mb-6">Add some delicious items to get started</p>
            <Button onClick={() => onOpenChange(false)}>Continue Shopping</Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Your Cart ({cartItems.length})</SheetTitle>
        </SheetHeader>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {cartItems.map((item) => {
            const modsTotal =
              item.mods?.reduce((sum, mod) => sum + (mod.price || 0), 0) || 0;
            const lineTotal = (item.price + modsTotal) * item.qty;
            const isWeight = isWeightUnit(item.priceUnit);
            const qtyStep = getUnitStep(item.priceUnit);
            const minQty = getUnitMinimum(item.priceUnit);
            const qtyDecimals = getUnitDecimals(item.priceUnit);
            const unitSuffix = formatUnitSuffix(item.priceUnit, item.unitLabel);
            const qtySuffix = isWeight ? getUnitQuantitySuffix(item.priceUnit) : '';
            const quantityDisplay = formatQuantityDisplay(
              item.qty,
              item.priceUnit
            );

            const adjustQty = (delta: number) => {
              const next = delta < 0
                ? Math.max(minQty, item.qty + delta)
                : item.qty + delta;
              const rounded = qtyDecimals > 0
                ? Number(next.toFixed(qtyDecimals))
                : Math.round(next);
              setQty(item.id, rounded);
            };

            const quantityLabel = isWeight ? 'weight' : 'quantity';
            const displayQty = isWeight
              ? formatQuantityValue(item.qty, item.priceUnit)
              : item.qty;

            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <h4 className="mb-1">{item.name}</h4>
                    <p className="text-xs text-gray-600">
                      {isWeight ? `${quantityDisplay} · ` : ''}
                      {formatPrice(item.price)}
                      {unitSuffix && (
                        <span
                          className={`text-gray-400 whitespace-nowrap ${unitSuffix.startsWith('/') ? 'ml-0' : 'ml-1'}`.trim()}
                        >
                          {unitSuffix}
                        </span>
                      )}
                    </p>
                    {item.mods && item.mods.length > 0 && (
                      <div className="text-sm text-gray-600 space-y-0.5">
                        {item.mods.map((mod, idx) => (
                          <div key={`${item.id}-mod-${idx}`}>
                            + {mod.name}{' '}
                            {mod.price
                              ? `(${formatCurrency(mod.price / 100)})`
                              : ''}
                          </div>
                        ))}
                      </div>
                    )}
                    {item.note && (
                      <div className="text-sm text-gray-600 italic mt-1">
                        Note: {item.note}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="mb-2">
                      {formatPrice(lineTotal)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adjustQty(-qtyStep)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-100 transition-colors"
                        aria-label={`Decrease ${quantityLabel}`}
                        disabled={item.qty <= minQty}
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      {isWeight ? (
                        <WeightQuantityInput
                          value={item.qty}
                          unit={item.priceUnit}
                          min={minQty}
                          decimals={qtyDecimals}
                          onCommit={(val) => setQty(item.id, val)}
                        />
                      ) : (
                        <span className="w-8 text-center font-medium">
                          {displayQty}
                        </span>
                      )}
                      <button
                        onClick={() => adjustQty(qtyStep)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-100 transition-colors"
                        aria-label={`Increase ${quantityLabel}`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="ml-2 w-7 h-7 rounded-full border border-red-200 flex items-center justify-center hover:bg-red-50 transition-colors text-red-600"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <Separator />
              </div>
            );
          })}
        </div>

        {/* Totals */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatCurrency((totals?.subtotal || 0) / 100)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span>Total</span>
            <span>{formatCurrency((totals?.grand_total || 0) / 100)}</span>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            Tax and fees calculated at checkout
          </p>
        </div>

        {/* Checkout Button */}
        <Button
          size="lg"
          className="w-full mt-4 text-white"
          style={{ backgroundColor: brandColor }}
          onClick={onCheckout}
        >
          Proceed to Checkout
        </Button>
      </SheetContent>
    </Sheet>
  );
};
