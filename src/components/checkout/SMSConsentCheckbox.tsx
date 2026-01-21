import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Check } from 'lucide-react';
import { smsConsentAtom } from '../../atoms/cart';

interface SMSConsentCheckboxProps {
  brandColor?: string;
  accentColor?: string;
}

export const SMSConsentCheckbox = ({
  brandColor = '#6B0F1A',
  accentColor = '#E8D5BA',
}: SMSConsentCheckboxProps) => {
  const [isChecked, setIsChecked] = useAtom(smsConsentAtom);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative"
    >
      {/* Container with subtle warmth */}
      <label
        className="flex items-start gap-3.5 cursor-pointer p-4 rounded-xl
                   border-2 transition-all duration-300 ease-out
                   hover:shadow-md active:scale-[0.99]"
        style={{
          borderColor: isChecked ? brandColor : '#e5e7eb',
          backgroundColor: isChecked
            ? `${brandColor}08`
            : 'transparent',
        }}
      >
        {/* Custom Checkbox */}
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="sr-only"
            aria-label="SMS consent checkbox"
          />

          {/* Checkbox visual */}
          <motion.div
            className="w-6 h-6 rounded-md border-2 flex items-center justify-center overflow-hidden
                       transition-all duration-200"
            style={{
              borderColor: isChecked ? brandColor : '#d1d5db',
              backgroundColor: isChecked ? brandColor : '#fff',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {isChecked && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 25,
                  }}
                >
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Ripple effect on check */}
          <AnimatePresence>
            {isChecked && (
              <motion.div
                className="absolute inset-0 rounded-md"
                style={{
                  backgroundColor: brandColor,
                  opacity: 0.3,
                }}
                initial={{ scale: 1, opacity: 0.3 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Text Content */}
        <div className="flex-1 text-sm leading-relaxed">
          <p className="text-gray-700 font-normal">
            I agree to receive{' '}
            <span className="font-semibold text-gray-900">SMS messages</span>{' '}
            from{' '}
            <span
              className="font-serif italic font-medium tracking-wide"
              style={{ color: brandColor }}
            >
              Tabsy
            </span>{' '}
            regarding account setup, onboarding, customer support, delivery and
            important service updates.
          </p>

          {/* Legal fine print */}
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Message & data rates may apply. Reply{' '}
            <span className="font-mono font-semibold text-gray-700">
              STOP
            </span>{' '}
            to unsubscribe,{' '}
            <span className="font-mono font-semibold text-gray-700">
              HELP
            </span>{' '}
            for help.
          </p>
        </div>

        {/* Optional icon indicator */}
        <motion.div
          className="flex-shrink-0 mt-0.5"
          animate={{
            opacity: isChecked ? 1 : 0.3,
            scale: isChecked ? 1 : 0.9,
          }}
          transition={{ duration: 0.2 }}
        >
          <MessageSquare
            className="w-5 h-5"
            style={{
              color: isChecked ? brandColor : '#9ca3af',
            }}
          />
        </motion.div>
      </label>
    </motion.div>
  );
};
