import { SMSConsentCheckbox } from '../components/checkout/SMSConsentCheckbox';
import { useAtomValue } from 'jotai';
import { smsConsentAtom } from '../atoms/cart';

export const SMSConsentDemo = () => {
  const isConsented = useAtomValue(smsConsentAtom);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            SMS Consent Checkbox
          </h1>
          <p className="text-gray-600 text-lg">
            A warm, trustworthy design for collecting SMS consent during checkout
          </p>
        </div>

        {/* Demo Section */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">
            Checkout Experience Preview
          </h2>

          <div className="space-y-6">
            {/* Mock fields to show context */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled
              />
            </div>

            {/* The actual SMS consent checkbox */}
            <SMSConsentCheckbox
              brandColor="#6B0F1A"
              accentColor="#E8D5BA"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email (optional)
              </label>
              <input
                type="email"
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                disabled
              />
            </div>
          </div>
        </div>

        {/* State Display */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">
            Current State
          </h3>
          <div className="flex items-center gap-3">
            <div
              className="px-4 py-2 rounded-lg font-mono text-sm"
              style={{
                backgroundColor: isConsented ? '#6B0F1A' : '#e5e7eb',
                color: isConsented ? 'white' : '#374151',
              }}
            >
              smsConsentAtom: {isConsented ? 'true' : 'false'}
            </div>
            {isConsented && (
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium">User has consented to SMS</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            This state is persisted to localStorage with key: <code className="bg-gray-100 px-2 py-0.5 rounded">tabsy-sms-consent</code>
          </p>
        </div>

        {/* Design Features */}
        <div className="mt-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
          <h3 className="text-lg font-semibold mb-3 text-amber-900">
            ✨ Design Features
          </h3>
          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Custom animated checkbox</strong> with spring physics and ripple effect</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Warm color transitions</strong> using brand colors (#6B0F1A)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Distinctive typography</strong> mixing serif italic for "Tabsy" branding</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Interactive states</strong> with hover, active, and checked animations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>TCPA compliant</strong> with clear opt-in language and STOP/HELP instructions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Accessible</strong> with proper ARIA labels and keyboard support</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-0.5">•</span>
              <span><strong>Persistent state</strong> saved to localStorage via Jotai atomWithStorage</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
