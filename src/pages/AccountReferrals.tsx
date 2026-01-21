import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Copy, QrCode, MessageCircle, ArrowLeft, Check, Share2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAuth } from '../lib/auth/AuthContext';
import {
  getOrCreateReferralLink,
  buildReferralLink,
  generateSMSShareLink,
  generateWhatsAppShareLink,
  REFERRAL_INVITER_BONUS,
  REFERRAL_FRIEND_BONUS,
} from '../lib/loyalty/client';
import { loyaltyStore } from '../lib/loyalty/store';
import { toast } from 'sonner';

interface AccountReferralsProps {
  onNavigate: (path: string) => void;
  config: { name: string };
  brandColor?: string;
}

export const AccountReferrals = ({ onNavigate, config, brandColor = '#6B0F1A' }: AccountReferralsProps) => {
  const { user, loading } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState({ clicks: 0, conversions: 0 });
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      const code = getOrCreateReferralLink(user.email, user.phone);
      setReferralCode(code);
      setReferralLink(buildReferralLink(code));

      const referral = loyaltyStore['referrals'].get(code);
      if (referral) {
        setStats({
          clicks: referral.clicks,
          conversions: referral.conversions,
        });
      }
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
          <p className="text-gray-500 text-sm">Loading...</p>
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
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Share & Earn</h2>
              <p className="text-gray-500 text-sm">Place your first order to get your unique referral link.</p>
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleSMSShare = () => {
    window.location.href = generateSMSShareLink(referralCode, config.name);
  };

  const handleWhatsAppShare = () => {
    window.open(generateWhatsAppShareLink(referralCode, config.name), '_blank');
  };

  const generateQRCodeURL = (text: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  };

  const steps = [
    {
      num: 1,
      title: 'Share your link',
      desc: 'Send your unique referral link to friends via SMS, WhatsApp, or social media.',
    },
    {
      num: 2,
      title: 'They order',
      desc: 'Your friend uses your link and completes their first order (minimum $10).',
    },
    {
      num: 3,
      title: 'You both win',
      desc: `You receive +${REFERRAL_INVITER_BONUS} pts and they get +${REFERRAL_FRIEND_BONUS} pts automatically!`,
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
              <h1 className="text-lg font-semibold text-gray-900">Referrals</h1>
              <p className="text-xs text-gray-500">Share the love, earn rewards</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden" style={{ backgroundColor: brandColor }}>
            <CardContent className="p-8 text-center text-white">
              <div className="w-12 h-12 mx-auto rounded-xl bg-white/20 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Invite Friends, Earn Together</h2>
              <p className="text-white/80 text-sm max-w-sm mx-auto mb-6">
                Share your unique link and both you and your friend get rewarded!
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold mb-1">+{REFERRAL_FRIEND_BONUS}</div>
                  <p className="text-xs text-white/70 uppercase tracking-wide">Your friend</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold mb-1">+{REFERRAL_INVITER_BONUS}</div>
                  <p className="text-xs text-white/70 uppercase tracking-wide">You get</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats.clicks}</div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Clicks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats.conversions}</div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Referrals</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Referral Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">Your Referral Link</h2>

              <div className="flex gap-2">
                <Input
                  value={referralLink}
                  readOnly
                  className="flex-1 font-mono text-sm h-11 bg-gray-50"
                />
                <Button
                  onClick={handleCopy}
                  className="h-11 px-4 font-medium"
                  style={{ backgroundColor: brandColor }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {/* Share Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleSMSShare}
                  variant="outline"
                  className="h-10 font-medium"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  SMS
                </Button>
                <Button
                  onClick={handleWhatsAppShare}
                  className="h-10 font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>

              {/* QR Code Toggle */}
              <Button
                onClick={() => setShowQR(!showQR)}
                variant="outline"
                className="w-full h-10 font-medium"
              >
                <QrCode className="w-4 h-4 mr-2" />
                {showQR ? 'Hide QR Code' : 'Show QR Code'}
              </Button>

              {showQR && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex justify-center pt-2"
                >
                  <div className="p-4 bg-white border rounded-xl shadow-sm">
                    <img
                      src={generateQRCodeURL(referralLink)}
                      alt="Referral QR Code"
                      className="w-40 h-40"
                    />
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold text-gray-900 mb-5">How It Works</h2>
              <div className="space-y-5">
                {steps.map((step) => (
                  <div key={step.num} className="flex gap-4">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                      style={{ backgroundColor: `${brandColor}10`, color: brandColor }}
                    >
                      {step.num}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 mb-0.5">{step.title}</p>
                      <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Terms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <p className="text-xs text-gray-400 text-center px-4 leading-relaxed">
            <span className="font-medium text-gray-500">Terms:</span> Bonus applies after friend completes first order ($10 min).
            One bonus per new customer. Self-referrals not permitted. Program terms subject to change.
          </p>
        </motion.div>
      </div>
    </div>
  );
};
