import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Copy, Share2, MessageCircle, Check, X, QrCode } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import {
  buildReferralLink,
  getOrCreateReferralLink,
  generateSMSShareLink,
  generateWhatsAppShareLink,
  REFERRAL_INVITER_BONUS,
  REFERRAL_FRIEND_BONUS,
} from '../../lib/loyalty/client';

interface ReferFriendsCardProps {
  brandColor?: string;
  brandName: string;
  email?: string;
  phone?: string;
  onClose: () => void;
}

export const ReferFriendsCard = ({
  brandColor = '#6B0F1A',
  brandName,
  email,
  phone,
  onClose,
}: ReferFriendsCardProps) => {
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (email || phone) {
      const code = getOrCreateReferralLink(email, phone);
      setReferralCode(code);
      setReferralLink(buildReferralLink(code));
    }
  }, [email, phone]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleSMSShare = () => {
    window.location.href = generateSMSShareLink(referralCode, brandName);
  };

  const handleWhatsAppShare = () => {
    window.open(generateWhatsAppShareLink(referralCode, brandName), '_blank');
  };

  const generateQRCodeURL = (text: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  };

  if (!email && !phone) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <Card
          className="p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-gray-600 mb-4">
            Please view your stars wallet first to create a referral link.
          </p>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </Card>
      </motion.div>
    );
  }

  return (
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
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
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
          <div className="flex items-center gap-3">
            <Share2 className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Invite Friends</h2>
              <p className="text-white/90 text-sm mt-1">
                Share the joy, earn rewards together
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Bonus Info */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold" style={{ color: brandColor }}>
                  +{REFERRAL_FRIEND_BONUS} ⭐
                </div>
                <p className="text-xs text-gray-600 mt-1">Your friend gets</p>
              </div>
              <div>
                <div className="text-2xl font-bold" style={{ color: brandColor }}>
                  +{REFERRAL_INVITER_BONUS} ⭐
                </div>
                <p className="text-xs text-gray-600 mt-1">You get</p>
              </div>
            </div>
          </div>

          {/* Referral Link */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Your referral link
            </label>
            <div className="flex gap-2">
              <Input
                value={referralLink}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                onClick={handleCopy}
                className="text-white"
                style={{ backgroundColor: brandColor }}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* QR Code */}
          <div>
            <Button
              variant="outline"
              onClick={() => setShowQR(!showQR)}
              className="w-full"
            >
              <QrCode className="w-4 h-4 mr-2" />
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </Button>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 flex justify-center"
              >
                <img
                  src={generateQRCodeURL(referralLink)}
                  alt="Referral QR Code"
                  className="rounded-lg border-2 border-gray-200"
                />
              </motion.div>
            )}
          </div>

          {/* Share Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Share via</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleSMSShare}
                className="w-full"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                SMS
              </Button>
              <Button
                variant="outline"
                onClick={handleWhatsAppShare}
                className="w-full"
                style={{ color: '#25D366' }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* Fine Print */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <p>
              <strong>How it works:</strong> You'll receive +{REFERRAL_INVITER_BONUS} ⭐ when your
              friend completes their first order (minimum $10). They'll get +{REFERRAL_FRIEND_BONUS} ⭐
              on that order.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
