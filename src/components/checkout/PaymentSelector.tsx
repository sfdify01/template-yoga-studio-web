import { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { CreditCard, Wallet } from 'lucide-react';
import { Button } from '../ui/button';

interface PaymentSelectorProps {
  mode: 'stripe' | 'pos';
  amount: number;
  onIntent: (intentId: string) => void;
  posEnabled?: boolean;
}

export const PaymentSelector = ({
  mode,
  amount,
  onIntent,
  posEnabled = false,
}: PaymentSelectorProps) => {
  const [paymentMode, setPaymentMode] = useState<'stripe' | 'pos'>(mode);
  const [loading, setLoading] = useState(false);

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      // Create payment intent
      const response = await fetch('/api/payments/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amount * 100) }), // Convert to cents
      });

      const { clientSecret, id } = await response.json();
      
      // In a real app, you would load Stripe.js and show Stripe Elements:
      // const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
      // Then use stripe.confirmCardPayment(clientSecret)
      
      // For demo, just return the intent ID
      onIntent(id);
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <RadioGroup value={paymentMode} onValueChange={(v) => setPaymentMode(v as 'stripe' | 'pos')}>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-4 rounded-xl border hover:bg-gray-50 cursor-pointer transition-colors">
            <RadioGroupItem value="stripe" id="stripe" />
            <Label htmlFor="stripe" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">Pay with Card</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Secure Stripe Payment
              </p>
            </Label>
          </div>

          {posEnabled && (
            <div className="flex items-center space-x-3 p-4 rounded-xl border hover:bg-gray-50 cursor-pointer transition-colors">
              <RadioGroupItem value="pos" id="pos" />
              <Label htmlFor="pos" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5" />
                  <span className="font-medium">Pay at Pickup</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  Cash or card when you arrive
                </p>
              </Label>
            </div>
          )}
        </div>
      </RadioGroup>

      {paymentMode === 'stripe' && (
        <div className="mt-4 p-4 border rounded-xl bg-gray-50">
          <p className="text-sm font-medium mb-3 text-gray-700">Card Details</p>
          {/* In production, render Stripe Elements here */}
          <div className="space-y-2.5">
            <input
              type="text"
              placeholder="Card Number"
              className="w-full h-11 px-3 border rounded-xl bg-white"
              disabled
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Expiry (MM/YY)"
                className="h-11 px-3 border rounded-xl bg-white"
                disabled
              />
              <input
                type="text"
                placeholder="CVC"
                className="h-11 px-3 border rounded-xl bg-white"
                disabled
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💳 Demo mode - Payment processing is simulated
          </p>
        </div>
      )}
    </div>
  );
};
