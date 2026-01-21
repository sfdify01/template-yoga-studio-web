import { LoyaltyExplainer } from '../components/loyalty/LoyaltyExplainer';

interface LoyaltyProps {
  onNavigate: (path: string) => void;
  onOrderNow: () => void;
  brandColor?: string;
}

export const Loyalty = ({ onNavigate, onOrderNow, brandColor = '#6B0F1A' }: LoyaltyProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Loyalty Rewards</h1>
            <p className="text-xl text-gray-600">
              Earn stars, get rewards, share with friends
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <LoyaltyExplainer
          brandColor={brandColor}
          onNavigate={onNavigate}
          onOrderNow={onOrderNow}
        />
      </div>
    </div>
  );
};
