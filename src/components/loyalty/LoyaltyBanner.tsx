import { motion } from 'motion/react';
import { Star, Gift, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { EARN_RATE, REFERRAL_INVITER_BONUS, REFERRAL_FRIEND_BONUS } from '../../lib/loyalty/client';

interface LoyaltyBannerProps {
  brandColor?: string;
  onViewStars: () => void;
  onInviteFriend: () => void;
}

export const LoyaltyBanner = ({
  brandColor = '#6B0F1A',
  onViewStars,
  onInviteFriend,
}: LoyaltyBannerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6 md:p-8 shadow-sm"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md"
            style={{ backgroundColor: brandColor }}
          >
            <Star className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Earn Stars on every order
            </h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              $1 = {EARN_RATE} ⭐ · Rewards you'll actually love
            </p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Earn on Orders */}
          <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${brandColor}15` }}
            >
              <Gift className="w-5 h-5" style={{ color: brandColor }} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Every purchase counts</h3>
              <p className="text-sm text-gray-600">
                Earn {EARN_RATE} ⭐ for every $1 you spend. Redeem for exclusive rewards.
              </p>
            </div>
          </div>

          {/* Referral Bonus */}
          <div className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${brandColor}15` }}
            >
              <Users className="w-5 h-5" style={{ color: brandColor }} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Share the love</h3>
              <p className="text-sm text-gray-600">
                Invite a friend: You get +{REFERRAL_INVITER_BONUS} ⭐, they get +{REFERRAL_FRIEND_BONUS} ⭐
                on their first order.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={onViewStars}
            className="flex-1 sm:flex-none text-white font-medium shadow-md hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brandColor }}
          >
            <Star className="w-4 h-4 mr-2 fill-current" />
            View My Stars
          </Button>
          <Button
            onClick={onInviteFriend}
            variant="outline"
            className="flex-1 sm:flex-none font-medium border-2 hover:bg-gray-50"
            style={{ borderColor: brandColor, color: brandColor }}
          >
            <Users className="w-4 h-4 mr-2" />
            Invite a Friend
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
