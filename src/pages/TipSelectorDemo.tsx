import { useAtomValue } from 'jotai';
import { ModernTipSelector } from '../components/checkout/ModernTipSelector';
import { tipPercentageAtom, customTipAtom, cartTotalsAtom } from '../atoms/cart';
import { formatCurrency } from '../lib/pricing';

export const TipSelectorDemo = () => {
  const tipPercentage = useAtomValue(tipPercentageAtom);
  const customTip = useAtomValue(customTipAtom);
  const totals = useAtomValue(cartTotalsAtom);

  // Mock subtotal for demo
  const mockSubtotal = 5000; // $50.00 in cents

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Modern Tip Selector
          </h1>
          <p className="text-gray-600 text-lg">
            A warm, generous tipping experience that feels like giving a gift
          </p>
        </div>

        {/* Demo Section */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 mb-8">
          <div className="mb-8">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-2xl font-semibold text-gray-800">
                Checkout Preview
              </h2>
              <span className="text-sm text-gray-500">
                Subtotal: {formatCurrency(mockSubtotal / 100)}
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              Try selecting preset percentages or entering a custom tip amount
            </p>
          </div>

          {/* The actual tip selector */}
          <ModernTipSelector
            brandColor="#6B0F1A"
            subtotal={mockSubtotal}
          />
        </div>

        {/* State Display */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Tip Percentage
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {tipPercentage}
              </span>
              <span className="text-lg text-gray-600">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-mono">
              tipPercentageAtom
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Custom Tip
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {formatCurrency(customTip / 100)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-mono">
              customTipAtom (in cents)
            </p>
          </div>
        </div>

        {/* Calculated Values */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            Calculated Tip Amount
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-semibold">{formatCurrency(mockSubtotal / 100)}</span>
            </div>

            {tipPercentage > 0 && customTip === 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span>Tip ({tipPercentage}%):</span>
                <span className="font-bold">
                  {formatCurrency((mockSubtotal * (tipPercentage / 100)) / 100)}
                </span>
              </div>
            )}

            {customTip > 0 && (
              <div className="flex justify-between items-center text-green-600">
                <span>Tip (Custom):</span>
                <span className="font-bold">{formatCurrency(customTip / 100)}</span>
              </div>
            )}

            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-semibold text-gray-900">Total with tip:</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  (mockSubtotal + (customTip > 0 ? customTip : Math.round(mockSubtotal * (tipPercentage / 100)))) / 100
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Design Features */}
        <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl p-6 border-2 border-amber-200">
          <h3 className="text-lg font-semibold mb-3 text-amber-900 flex items-center gap-2">
            <span>✨</span>
            Design Features
          </h3>
          <ul className="space-y-2 text-sm text-amber-900">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Warm, generous aesthetic</strong> - feels like giving a gift, not paying a fee</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Animated heart icon</strong> that fills and pulses when tip is selected</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Sparkle effects</strong> on selected preset buttons</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Smooth animations</strong> with spring physics and staggered reveals</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Custom dollar input</strong> with real-time cents conversion</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Reactive thank you card</strong> that appears when tip is added</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Brand color integration</strong> with warm gradients and tints</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Persistent state</strong> via Jotai atoms (tipPercentageAtom, customTipAtom)</span>
            </li>
          </ul>
        </div>

        {/* Technical Details */}
        <div className="mt-6 bg-gray-900 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-3">Technical Implementation</h3>
          <ul className="space-y-2 text-sm text-gray-300 font-mono">
            <li>✓ Integrated with Jotai state management</li>
            <li>✓ Automatic totals recalculation via cartTotalsAtom</li>
            <li>✓ Persisted to localStorage</li>
            <li>✓ Custom tip converts dollars to cents (Stripe-ready)</li>
            <li>✓ Percentage presets: 15%, 18%, 20%, 25%</li>
            <li>✓ Motion library for smooth animations</li>
            <li>✓ Fully accessible with keyboard support</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
