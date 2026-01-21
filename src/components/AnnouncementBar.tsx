import { X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AnnouncementBarProps {
  message: string;
  brandColor: string;
  topOffset?: number;
  onClose?: () => void;
}

export const AnnouncementBar = ({ message, brandColor, topOffset = 0, onClose }: AnnouncementBarProps) => {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    // Notify parent after animation completes
    setTimeout(() => {
      onClose?.();
    }, 250);
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          initial={{ height: 40, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="fixed top-0 left-0 right-0 z-50 w-full overflow-hidden"
          style={{ backgroundColor: brandColor, top: `${topOffset}px` }}
        >
          <div className="h-10 flex items-center justify-center px-4 text-white text-center relative">
            <p className="text-sm">{message}</p>
            <button
              onClick={handleClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-75 transition-opacity"
              aria-label="Close announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
