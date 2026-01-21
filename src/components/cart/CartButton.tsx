import { ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCart, getTotalQty } from '../../lib/cart/useCart';
import { Button } from '../ui/button';

interface CartButtonProps {
  brandColor?: string;
}

export const CartButton = ({ brandColor = '#6B0F1A' }: CartButtonProps) => {
  const { items, openDrawer } = useCart();
  const totalQty = getTotalQty(items);

  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="fixed bottom-20 right-4 z-40 md:bottom-6 safe-bottom"
    >
      <Button
        onClick={openDrawer}
        size="lg"
        className="relative min-w-[56px] min-h-[56px] w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-lg text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: brandColor }}
        aria-label={`Shopping cart with ${totalQty} items`}
      >
        <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7" />
        <AnimatePresence>
          {totalQty > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[24px] min-h-[24px] h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium"
            >
              {totalQty}
            </motion.span>
          )}
        </AnimatePresence>
      </Button>
    </motion.div>
  );
};
