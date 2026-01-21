import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, Gift, Sparkles } from 'lucide-react';

interface StarsRewardBoxProps {
  subtotalCents: number;
  brandColor?: string;
}

export const StarsRewardBox = ({ subtotalCents, brandColor }: StarsRewardBoxProps) => {
  // Calculate stars: 10 stars per $1 spent
  const calculatedStars = Math.floor((subtotalCents / 100) * 10);
  
  const [stars, setStars] = useState(calculatedStars);
  const [displayStars, setDisplayStars] = useState(calculatedStars);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);
  
  const nextRewardThreshold = 500; // Stars needed for next reward
  const progressPercent = Math.min(100, (calculatedStars / nextRewardThreshold) * 100);
  
  // Get encouragement message based on progress
  const getEncouragementMessage = () => {
    if (calculatedStars >= nextRewardThreshold) {
      return "🎉 Reward unlocked! Claim next time";
    }
    const starsNeeded = nextRewardThreshold - calculatedStars;
    if (starsNeeded <= 100) {
      return `You're almost there! ${starsNeeded} more ⭐`;
    }
    return `Earn ${starsNeeded} more for a free treat 🎁`;
  };

  // Animate star count when it changes
  useEffect(() => {
    // Skip animation on first render
    if (isFirstRender) {
      setIsFirstRender(false);
      return;
    }
    
    const wasAboveThreshold = stars >= nextRewardThreshold;
    const isNowAboveThreshold = calculatedStars >= nextRewardThreshold;
    
    // Trigger confetti if just hit threshold
    if (!wasAboveThreshold && isNowAboveThreshold) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    
    // Update stars state
    setStars(calculatedStars);
    
    // Animate count up smoothly
    const duration = 500;
    const steps = 20;
    const startValue = displayStars;
    const endValue = calculatedStars;
    const increment = (endValue - startValue) / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      if (currentStep >= steps) {
        setDisplayStars(endValue);
        clearInterval(timer);
      } else {
        setDisplayStars(Math.round(startValue + increment * currentStep));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [calculatedStars]);

  if (subtotalCents === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4"
    >
      {/* Confetti effect when hitting milestone */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: '50%', 
                y: '50%', 
                scale: 0,
                rotate: 0
              }}
              animate={{
                x: `${50 + (Math.random() - 0.5) * 100}%`,
                y: `${50 + (Math.random() - 0.5) * 100}%`,
                scale: [0, 1, 0],
                rotate: Math.random() * 360,
              }}
              transition={{ duration: 1.5, delay: i * 0.1 }}
              className="absolute"
            >
              <Sparkles 
                className="w-4 h-4" 
                style={{ color: brandColor || '#f59e0b' }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Header with star count */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <motion.p 
              key={displayStars}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="font-bold text-amber-900"
            >
              You'll earn <span className="text-xl">{displayStars.toLocaleString()}</span> Stars!
            </motion.p>
          </div>
          <p className="text-xs text-amber-700">
            {getEncouragementMessage()}
          </p>
        </div>
        <Gift className="w-6 h-6 text-amber-600 flex-shrink-0" />
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-amber-700">
          <span>Progress to next reward</span>
          <span className="font-medium">{Math.floor(progressPercent)}%</span>
        </div>
        <div className="h-2.5 bg-amber-100 rounded-full overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full relative"
          >
            {/* Shine effect */}
            <motion.div
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          </motion.div>
        </div>
        <div className="flex items-center justify-between text-xs text-amber-600">
          <span>{calculatedStars} stars</span>
          <span>{nextRewardThreshold} stars</span>
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-amber-600 mt-3 italic">
        Redeem stars for free items and exclusive perks on your next visit
      </p>
    </motion.div>
  );
};
