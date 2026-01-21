import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Mail, Phone, Loader2, TrendingUp, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { getOrCreateProfile, EARN_RATE, REFERRAL_INVITER_BONUS, REFERRAL_FRIEND_BONUS } from '../../lib/loyalty/client';
import { loyaltyStore } from '../../lib/loyalty/store';
import { LoyaltyProfile, EarnEvent } from '../../lib/loyalty/types';

interface StarsWalletProps {
  brandColor?: string;
  initialEmail?: string;
  initialPhone?: string;
  onClose: () => void;
}

export const StarsWallet = ({
  brandColor = '#6B0F1A',
  initialEmail,
  initialPhone,
  onClose,
}: StarsWalletProps) => {
  const [email, setEmail] = useState(initialEmail || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [profile, setProfile] = useState<LoyaltyProfile | null>(null);
  const [events, setEvents] = useState<EarnEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(!initialEmail && !initialPhone);

  useEffect(() => {
    if (initialEmail || initialPhone) {
      loadProfile(initialEmail, initialPhone);
    }
  }, [initialEmail, initialPhone]);

  const loadProfile = async (emailVal?: string, phoneVal?: string) => {
    setLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const userProfile = getOrCreateProfile(emailVal, phoneVal);
      setProfile(userProfile);

      const userEvents = loyaltyStore.getEventsByProfile(userProfile.id);
      setEvents(userEvents);
      setShowForm(false);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      alert('Please enter your email or phone number');
      return;
    }
    loadProfile(email || undefined, phone || undefined);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div
            className="p-6 text-white relative"
            style={{ backgroundColor: brandColor }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-8 h-8 fill-current" />
              <h2 className="text-2xl font-bold">Your Stars</h2>
            </div>
            {profile && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="mt-4"
              >
                <div className="text-5xl font-bold mb-1">{profile.stars.toLocaleString()}</div>
                <p className="text-white/90 text-sm">stars available</p>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {showForm ? (
              <Card className="p-6">
                <p className="text-gray-600 mb-4">
                  Enter your email or phone to view your stars balance
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="text-center text-sm text-gray-500">or</div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-white"
                    style={{ backgroundColor: brandColor }}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'View My Stars'
                    )}
                  </Button>
                </form>
              </Card>
            ) : profile ? (
              <div className="space-y-6">
                {/* Recent Activity */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: brandColor }} />
                    Recent Activity
                  </h3>
                  {events.length === 0 ? (
                    <Card className="p-6 text-center text-gray-500">
                      <Star className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No stars yet. Place your first order to start earning!</p>
                      {profile.referredBy && (
                        <p className="text-xs mt-2 text-gray-400">
                          You'll earn +{REFERRAL_FRIEND_BONUS} ⭐ bonus on your first order!
                        </p>
                      )}
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {events.slice(0, 5).map((event) => (
                        <Card key={event.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{event.description}</p>
                              <p className="text-xs text-gray-500">{formatDate(event.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-1 font-semibold" style={{ color: brandColor }}>
                              <span>+{event.stars}</span>
                              <Star className="w-4 h-4 fill-current" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* How It Works */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">How It Works</h3>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="earn">
                      <AccordionTrigger className="text-sm">How do I earn stars?</AccordionTrigger>
                      <AccordionContent className="text-sm text-gray-600">
                        Earn {EARN_RATE} ⭐ for every $1 you spend on orders. Stars are automatically
                        added to your account after each purchase.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="referral">
                      <AccordionTrigger className="text-sm">What about referral bonuses?</AccordionTrigger>
                      <AccordionContent className="text-sm text-gray-600">
                        Invite friends to earn bonus stars! When someone uses your referral link
                        and completes their first order (minimum $10), you'll receive +{REFERRAL_INVITER_BONUS} ⭐
                        and they'll get +{REFERRAL_FRIEND_BONUS} ⭐.
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="redeem">
                      <AccordionTrigger className="text-sm">How do I redeem stars?</AccordionTrigger>
                      <AccordionContent className="text-sm text-gray-600">
                        Check the rewards catalog to see available rewards. You can redeem stars
                        for free items, discounts, and exclusive offers at checkout.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
