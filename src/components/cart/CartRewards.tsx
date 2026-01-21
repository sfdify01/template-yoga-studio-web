import { motion } from 'motion/react';
import { Star, Gift, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { calcStars } from '../../lib/loyalty/client';

interface CartRewardsProps {
  subtotalCents: number;
  earnPerDollar?: number;
  rewardThreshold?: number;
  loyaltyHref?: string;
  isLoggedIn: boolean;
  currentStars?: number;
  brandColor?: string;
  onNavigate?: (path: string) => void;
}

export const CartRewards = ({
  subtotalCents,
  earnPerDollar = 10,
  rewardThreshold = 500,
  loyaltyHref = '/loyalty',
  isLoggedIn,
  currentStars = 0,
  brandColor = '#6B0F1A',
  onNavigate,
}: CartRewardsProps) => {
  // Calculate stars to be earned on this order
  const starsToEarn = calcStars(subtotalCents, earnPerDollar);
  
  // Calculate projected balance (current + to be earned)
  const projectedStars = currentStars + starsToEarn;
  
  // Check if eligible for reward
  const isEligible = rewardThreshold && projectedStars >= rewardThreshold;
  
  // Calculate progress percentage
  const progressPercent = rewardThreshold 
    ? Math.min(100, (projectedStars / rewardThreshold) * 100)
    : 0;

  // Stars needed for next reward
  const starsNeeded = rewardThreshold ? Math.max(0, rewardThreshold - projectedStars) : 0;

  // Get encouragement message
  const getEncouragementMessage = () => {
    if (isEligible) {
      return "🎉 Reward unlocked! You can redeem a free item.";
    }
    if (starsNeeded <= 100) {
      return `You're almost there! ${starsNeeded} more stars to unlock a reward.`;
    }
    return `Earn ${starsNeeded} more stars for a free treat 🎁`;
  };

  // Handle navigation
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  // If no items in cart, show neutral state
  if (subtotalCents === 0) {
    return (
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3 text-gray-500">
          <Star className="w-5 h-5" />
          <p className="text-sm">Add items to see your stars</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-4 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 relative overflow-hidden"
    >
      {/* Decorative sparkle effect */}
      <div className="absolute top-2 right-2 opacity-20">
        <Sparkles className="w-8 h-8 text-amber-600" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isLoggedIn ? (
              <Gift className="w-5 h-5 text-amber-600 flex-shrink-0" />
            ) : (
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 flex-shrink-0" />
            )}
            <motion.p 
              key={starsToEarn}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="font-bold text-amber-900"
            >
              You'll earn <span className="text-xl">{starsToEarn}</span> Stars!
            </motion.p>
          </div>
          
          {isLoggedIn ? (
            <p className="text-sm text-amber-900/80">
              Current balance: <span className="font-semibold">{currentStars} ⭐</span>
            </p>
          ) : (
            <p className="text-sm text-amber-900/80">
              Create an account to track your rewards and redeem perks.
            </p>
          )}
        </div>
      </div>

      {/* Progress bar (only if threshold is set) */}
      {rewardThreshold && (
        <div className="mb-3 relative z-10">
          <div className="flex items-center justify-between text-xs text-amber-900/70 mb-1.5">
            <span>Progress to next reward</span>
            <span className="font-medium">
              {Math.min(projectedStars, rewardThreshold)} / {rewardThreshold} ⭐
            </span>
          </div>
          <div className="relative overflow-hidden rounded-full">
            <Progress 
              value={progressPercent} 
              className="h-2.5 bg-amber-100"
              indicatorClassName="bg-gradient-to-r from-amber-400 to-orange-400"
            />
          </div>
          <p className="text-xs text-amber-700 mt-1.5">
            {getEncouragementMessage()}
          </p>
        </div>
      )}

      {/* Eligibility Banner (when eligible for reward) */}
      {isEligible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-3 rounded-lg bg-emerald-50 border-2 border-emerald-200 px-3 py-2.5 flex items-start gap-2 relative z-10"
        >
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-emerald-800">
            <p className="font-medium">Reward unlocked!</p>
            <p className="text-emerald-700">
              Visit Loyalty to redeem your free item.
            </p>
          </div>
        </motion.div>
      )}

      {/* Call to Action Buttons */}
      <div className="flex flex-wrap gap-2.5 relative z-10">
        {isLoggedIn ? (
          <Button
            size="sm"
            className="text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brandColor }}
            onClick={() => handleNavigate(loyaltyHref)}
          >
            <Gift className="w-4 h-4 mr-1.5" />
            View Loyalty
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              className="text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: brandColor }}
              onClick={() => handleNavigate('/login?next=/products')}
            >
              <Star className="w-4 h-4 mr-1.5" />
              Log in / Create account
            </Button>
            <button
              onClick={() => handleNavigate(loyaltyHref)}
              className="text-sm text-amber-900 underline hover:text-amber-800 transition-colors px-2"
            >
              What is Loyalty?
            </button>
          </>
        )}
      </div>

      {/* Info text */}
      <p className="text-xs text-amber-600/80 mt-3 italic relative z-10">
        {isLoggedIn 
          ? "Stars never expire. Redeem anytime for free items and exclusive perks."
          : "Sign up to start earning stars on every order. 100% free to join!"
        }
      </p>
    </motion.div>
  );
};
