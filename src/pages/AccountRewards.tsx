import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, TrendingUp, Gift, ShoppingBag, ArrowLeft, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { useAuth } from '../lib/auth/AuthContext';
import { EARN_RATE, REFERRAL_INVITER_BONUS, REFERRAL_FRIEND_BONUS } from '../lib/loyalty/client';
import { fetchLoyaltyProfile } from '../lib/loyalty/api';

interface AccountRewardsProps {
  onNavigate: (path: string) => void;
  brandColor?: string;
}

export const AccountRewards = ({ onNavigate, brandColor = '#6B0F1A' }: AccountRewardsProps) => {
  const { user, loyaltyBalance, loading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const load = async () => {
        setEventsLoading(true);
        try {
          const profile = await fetchLoyaltyProfile({ email: user.email, phone: user.phone });
          setEvents(profile?.events ?? []);
        } catch (err) {
          console.error('Failed to load loyalty events', err);
          setEvents([]);
        } finally {
          setEventsLoading(false);
        }
      };
      load();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 relative">
            <div
              className="absolute inset-0 border-2 rounded-full animate-spin"
              style={{ borderColor: 'transparent', borderTopColor: brandColor }}
            />
          </div>
          <p className="text-gray-500 text-sm">Loading rewards...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
              <Star className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Start Earning Rewards</h2>
              <p className="text-gray-500 text-sm">Place your first order to start earning points automatically.</p>
            </div>
            <Button
              onClick={() => onNavigate('/products')}
              className="w-full h-11 font-medium"
              style={{ backgroundColor: brandColor }}
            >
              Order Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingBag className="w-4 h-4" />;
      case 'referral_inviter':
      case 'referral_friend':
        return <Gift className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const faqItems = [
    {
      id: 'earn',
      question: 'How do I earn points?',
      answer: `Earn ${EARN_RATE} points for every $1 you spend on orders. Points are automatically added to your account after each purchase. The more you order, the more you earn!`,
    },
    {
      id: 'referral',
      question: 'What about referral bonuses?',
      answer: `Invite friends to earn bonus points! When someone uses your referral link and completes their first order (minimum $10), you'll receive +${REFERRAL_INVITER_BONUS} points and they'll get +${REFERRAL_FRIEND_BONUS} points. Win-win!`,
    },
    {
      id: 'redeem',
      question: 'How do I redeem points?',
      answer: 'Browse our rewards catalog to see available rewards. You can redeem points for free items, discounts, and exclusive offers. Rewards are applied during checkout.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/account')}
              className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Rewards</h1>
              <p className="text-xs text-gray-500">Track and redeem your points</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden" style={{ backgroundColor: brandColor }}>
            <CardContent className="p-8 text-center text-white">
              <div className="w-14 h-14 mx-auto rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <Star className="w-7 h-7 text-white" fill="rgba(255,255,255,0.3)" />
              </div>
              <p className="text-white/70 text-xs uppercase tracking-wide font-medium mb-2">Your Balance</p>
              <div className="text-5xl font-bold mb-6">{loyaltyBalance.toLocaleString()}</div>
              <p className="text-white/80 text-sm mb-6 max-w-xs mx-auto">
                Keep earning to unlock more rewards!
              </p>
              <Button
                className="h-11 px-6 font-medium bg-white hover:bg-gray-100"
                style={{ color: brandColor }}
                onClick={() => onNavigate('/products')}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Order Now
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-gray-900 mb-4">How It Works</h2>
              <div className="space-y-2">
                {faqItems.map((item) => (
                  <Collapsible
                    key={item.id}
                    open={openItem === item.id}
                    onOpenChange={(open) => setOpenItem(open ? item.id : null)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="font-medium text-gray-900 text-sm">{item.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                          openItem === item.id ? 'rotate-180' : ''
                        }`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 text-sm text-gray-600 leading-relaxed">
                        {item.answer}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Earnings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${brandColor}10` }}
                >
                  <TrendingUp className="w-4 h-4" style={{ color: brandColor }} />
                </div>
                <h2 className="font-semibold text-gray-900">Recent Earnings</h2>
              </div>

              {eventsLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 mx-auto mb-3 relative">
                    <div
                      className="absolute inset-0 border-2 rounded-full animate-spin"
                      style={{ borderColor: 'transparent', borderTopColor: brandColor }}
                    />
                  </div>
                  <p className="text-gray-500 text-sm">Loading activity...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <Star className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium mb-1">
                    {loyaltyBalance > 0 ? 'Points balance found' : 'No points earned yet'}
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    {loyaltyBalance > 0 ? 'No activity log available' : 'Place an order to start earning'}
                  </p>
                  {loyaltyBalance > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-full text-sm">
                      <Star className="w-3.5 h-3.5" style={{ color: brandColor }} />
                      <span className="font-medium">{loyaltyBalance.toLocaleString()} pts</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center bg-white border"
                          style={{ color: brandColor }}
                        >
                          {getEventIcon(event.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{event.description}</p>
                          <p className="text-xs text-gray-500">{formatDate(event.createdAt)}</p>
                        </div>
                      </div>
                      <div
                        className="flex items-center gap-1 font-semibold text-sm"
                        style={{ color: brandColor }}
                      >
                        <span>+{event.stars}</span>
                        <Star className="w-3.5 h-3.5" fill={brandColor} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
