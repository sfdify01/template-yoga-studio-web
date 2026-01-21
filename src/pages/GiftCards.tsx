import { motion } from 'motion/react';
import { Gift, CreditCard, Heart, Beef, UtensilsCrossed, Users, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Config } from '../hooks/useConfig';
import { useState } from 'react';
import { toast } from 'sonner';

interface GiftCardsPageProps {
  config: Config;
  onNavigate: (path: string) => void;
}

export const GiftCardsPage = ({ config, onNavigate }: GiftCardsPageProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNotifyMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    setEmail('');
    toast.success('You\'ll be the first to know when gift cards launch!');
  };

  const giftCardUses = [
    {
      icon: Beef,
      title: 'Premium Meats',
      description: 'Fresh halal cuts, never frozen — from ribeyes to ground beef',
    },
    {
      icon: UtensilsCrossed,
      title: 'Catering Orders',
      description: 'Perfect for weddings, events, and family gatherings',
    },
    {
      icon: Users,
      title: 'Special Occasions',
      description: 'Birthdays, holidays, or just because — share the gift of quality',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div
        className="relative py-16 sm:py-20 md:py-28 overflow-hidden"
        style={{ backgroundColor: config.theme.brand }}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Coming Soon Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="text-white/90 text-sm font-medium tracking-wide">Coming Soon</span>
              </motion.div>

              <h1
                className="text-white mb-4 font-serif"
                style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', lineHeight: '1.1' }}
              >
                Gift Cards
              </h1>
              <p
                className="text-white/85 max-w-2xl mx-auto mb-10"
                style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', lineHeight: '1.6' }}
              >
                Share the taste of premium halal quality with your loved ones
              </p>
            </motion.div>

            {/* Gift Card Visual */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="relative max-w-md mx-auto"
            >
              {/* Card Stack Effect */}
              <div
                className="absolute inset-0 transform rotate-3 translate-x-2 translate-y-2 rounded-2xl opacity-30"
                style={{ backgroundColor: config.theme.accent }}
              />
              <div
                className="absolute inset-0 transform -rotate-2 -translate-x-1 translate-y-1 rounded-2xl opacity-20"
                style={{ backgroundColor: 'white' }}
              />

              {/* Main Gift Card */}
              <div
                className="relative rounded-2xl p-8 shadow-2xl border border-white/20"
                style={{
                  background: `linear-gradient(135deg, ${config.theme.accent} 0%, #f5ebe0 50%, ${config.theme.accent} 100%)`,
                }}
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: config.theme.brand }}
                    >
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs uppercase tracking-widest text-gray-500">Gift Card</p>
                      <p className="font-serif text-lg" style={{ color: config.theme.brand }}>
                        {config.name}
                      </p>
                    </div>
                  </div>
                  <CreditCard className="w-8 h-8 text-gray-400" />
                </div>

                <div className="text-left mb-6">
                  <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Value</p>
                  <p
                    className="font-serif text-4xl"
                    style={{ color: config.theme.brand }}
                  >
                    $50 – $500
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-5 h-5" style={{ color: config.theme.brand }} />
                    <span className="text-sm text-gray-600">With Love</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">100% Halal</p>
                    <p className="text-xs text-gray-500">Never Frozen</p>
                  </div>
                </div>

                {/* Decorative corner */}
                <div
                  className="absolute top-0 right-0 w-24 h-24 opacity-10"
                  style={{
                    background: `radial-gradient(circle at top right, ${config.theme.brand} 0%, transparent 70%)`,
                  }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Notify Me Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="max-w-xl mx-auto p-6 sm:p-8 shadow-xl border-0">
            <div className="text-center mb-6">
              <Mail className="w-10 h-10 mx-auto mb-3" style={{ color: config.theme.brand }} />
              <h3 className="text-xl font-medium mb-2">Be the First to Know</h3>
              <p className="text-gray-600 text-sm">
                Get notified when gift cards become available
              </p>
            </div>
            <form onSubmit={handleNotifyMe} className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="text-white shrink-0"
                style={{ backgroundColor: config.theme.brand }}
              >
                {isSubmitting ? 'Submitting...' : 'Notify Me'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>

      {/* What Gift Cards Can Be Used For */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-serif mb-3">Perfect for Every Occasion</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            A {config.name} gift card is the gift of premium quality —
            fresh halal meats for any celebration
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {giftCardUses.map((use, index) => (
            <motion.div
              key={use.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 h-full text-center hover:shadow-lg transition-shadow">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: config.theme.accent }}
                >
                  <use.icon className="w-7 h-7" style={{ color: config.theme.brand }} />
                </div>
                <h3 className="font-medium mb-2">{use.title}</h3>
                <p className="text-sm text-gray-600">{use.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Custom Arrangements CTA */}
      <div
        className="py-16"
        style={{ backgroundColor: config.theme.accent }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <Gift className="w-12 h-12 mx-auto mb-4" style={{ color: config.theme.brand }} />
            <h2 className="text-2xl sm:text-3xl font-serif mb-4">Need a Custom Gift Arrangement?</h2>
            <p className="text-gray-700 mb-6">
              While we prepare our gift card program, we're happy to help with custom meat packages,
              bulk orders for events, or special gift bundles. Contact us to discuss your needs.
            </p>
            <Button
              size="lg"
              onClick={() => onNavigate('/contact')}
              className="text-white"
              style={{ backgroundColor: config.theme.brand }}
            >
              Contact Us
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
