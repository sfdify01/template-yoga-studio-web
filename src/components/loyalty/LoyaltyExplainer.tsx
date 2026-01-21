import { motion } from 'motion/react';
import { Star, UserPlus, Gift, TrendingUp, LogIn, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { useAuth } from '../../lib/auth/AuthContext';
import { EARN_RATE, REFERRAL_INVITER_BONUS, REFERRAL_FRIEND_BONUS } from '../../lib/loyalty/client';

interface LoyaltyExplainerProps {
  brandColor?: string;
  onNavigate: (path: string) => void;
  onOrderNow: () => void;
}

export const LoyaltyExplainer = ({
  brandColor = '#6B0F1A',
  onNavigate,
  onOrderNow,
}: LoyaltyExplainerProps) => {
  const { user } = useAuth();

  const handleGetInviteLink = () => {
    if (user) {
      onNavigate('/account/referrals');
    } else {
      // Store intended destination and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.setItem('tabsy_post_login_redirect', '/account/referrals');
      }
      onNavigate('/login');
    }
  };

  const handleLogin = () => {
    onNavigate('/login');
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white mx-auto mb-6"
            style={{ backgroundColor: brandColor }}
          >
            <Star className="w-10 h-10 fill-current" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Earn Stars on every order
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            $1 = {EARN_RATE} ⭐ · Rewards you'll actually love
          </p>

          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="text-white"
                style={{ backgroundColor: brandColor }}
                onClick={handleLogin}
              >
                <LogIn className="w-5 h-5 mr-2" />
                Log in to start earning
              </Button>
              <Button size="lg" variant="outline" onClick={onOrderNow}>
                Order Now
              </Button>
            </div>
          )}
        </motion.div>
      </section>

      {/* How It Works */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1: Create Account */}
            <Card className="p-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white mx-auto mb-4"
                style={{ backgroundColor: brandColor }}
              >
                <UserPlus className="w-8 h-8" />
              </div>
              <div
                className="text-sm font-semibold mb-2 uppercase tracking-wide"
                style={{ color: brandColor }}
              >
                Step 1
              </div>
              <h3 className="text-xl font-bold mb-3">Create an Account</h3>
              <p className="text-gray-600 mb-4">
                Sign up with your email or phone number. It only takes a minute!
              </p>
              {!user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogin}
                  className="w-full"
                >
                  Sign Up Now
                </Button>
              )}
            </Card>

            {/* Step 2: Order & Earn */}
            <Card className="p-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white mx-auto mb-4"
                style={{ backgroundColor: brandColor }}
              >
                <TrendingUp className="w-8 h-8" />
              </div>
              <div
                className="text-sm font-semibold mb-2 uppercase tracking-wide"
                style={{ color: brandColor }}
              >
                Step 2
              </div>
              <h3 className="text-xl font-bold mb-3">Order & Earn</h3>
              <p className="text-gray-600 mb-4">
                Earn {EARN_RATE} ⭐ for every $1 you spend on pickup or delivery orders.
              </p>
              <div className="text-sm text-gray-500">
                Example: $50 order = {EARN_RATE * 50} ⭐
              </div>
            </Card>

            {/* Step 3: Redeem Rewards */}
            <Card className="p-6 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white mx-auto mb-4"
                style={{ backgroundColor: brandColor }}
              >
                <Gift className="w-8 h-8" />
              </div>
              <div
                className="text-sm font-semibold mb-2 uppercase tracking-wide"
                style={{ color: brandColor }}
              >
                Step 3
              </div>
              <h3 className="text-xl font-bold mb-3">Redeem Rewards</h3>
              <p className="text-gray-600 mb-4">
                Use your stars for free items, discounts, and exclusive rewards.
              </p>
              <div className="text-sm text-gray-500">
                Track your balance anytime
              </div>
            </Card>
          </div>
        </motion.div>
      </section>

      {/* Referrals */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="p-8 md:p-12 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                <Users className="w-12 h-12" />
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold mb-3">Invite Friends, Earn Together</h2>
                <p className="text-lg text-gray-700 mb-4">
                  Share your unique referral link and both you and your friend get rewarded!
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-3xl font-bold mb-1" style={{ color: brandColor }}>
                      +{REFERRAL_INVITER_BONUS} ⭐
                    </div>
                    <p className="text-sm text-gray-600">You get</p>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-3xl font-bold mb-1" style={{ color: brandColor }}>
                      +{REFERRAL_FRIEND_BONUS} ⭐
                    </div>
                    <p className="text-sm text-gray-600">Your friend gets</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-6">
                  Bonus applies after your friend completes their first paid order (minimum $10)
                </p>

                <Button
                  size="lg"
                  className="text-white"
                  style={{ backgroundColor: brandColor }}
                  onClick={handleGetInviteLink}
                >
                  <Users className="w-5 h-5 mr-2" />
                  Get My Invite Link
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* FAQ */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="account">
              <AccordionTrigger>Do I need an account to earn stars?</AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Yes, you need an account to track your stars and referrals. Creating an account is
                quick and easy—just provide your email or phone number. This allows us to track
                your orders and reward you with stars automatically.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="referrals">
              <AccordionTrigger>When do referral stars post?</AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Referral bonuses are credited automatically after your friend's first paid order
                completes. You'll receive +{REFERRAL_INVITER_BONUS} ⭐ and your friend gets +{REFERRAL_FRIEND_BONUS} ⭐.
                The order must be at least $10 to qualify for the bonus.
              </AccordionContent>
            </AccordionItem>



            <AccordionItem value="redemption">
              <AccordionTrigger>How do I redeem my stars?</AccordionTrigger>
              <AccordionContent className="text-gray-600">
                You can redeem stars for rewards during checkout. Browse available rewards in your
                account dashboard, and select the ones you want to apply to your order. Stars never
                expire, so save up for bigger rewards!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="modes">
              <AccordionTrigger>Can I earn stars on both pickup and delivery?</AccordionTrigger>
              <AccordionContent className="text-gray-600">
                Absolutely! You earn {EARN_RATE} ⭐ per $1 spent on all order types: pickup
                and delivery. The earning rate is the same regardless of how you order.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center"
        >
          <Card className="p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to start earning?</h2>
            <p className="text-gray-600 mb-8">
              {user
                ? "Start ordering to earn stars and unlock rewards!"
                : "Create your account today and earn stars on every order."}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user && (
                <Button
                  size="lg"
                  className="text-white"
                  style={{ backgroundColor: brandColor }}
                  onClick={handleLogin}
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Create Account
                </Button>
              )}
              <Button
                size="lg"
                variant={user ? 'default' : 'outline'}
                onClick={onOrderNow}
                className={user ? 'text-white' : ''}
                style={user ? { backgroundColor: brandColor } : {}}
              >
                Order Now
              </Button>
            </div>
          </Card>
        </motion.div>
      </section>
    </div>
  );
};
