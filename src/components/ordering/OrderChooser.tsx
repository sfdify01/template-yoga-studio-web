import { motion } from 'motion/react';
import { ShoppingBag, Truck } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
import { Card } from '../ui/card';

interface OrderChooserProps {
  open: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'pickup' | 'delivery') => void;
  brandColor?: string;
}

export const OrderChooser = ({
  open,
  onClose,
  onSelectMode,
  brandColor = '#6B0F1A',
}: OrderChooserProps) => {
  const options = [
    {
      mode: 'pickup' as const,
      icon: ShoppingBag,
      title: 'Pickup',
      subtitle: 'Fast & easy',
      description: 'Ready in ~15–20 min',
    },
    {
      mode: 'delivery' as const,
      icon: Truck,
      title: 'Delivery',
      subtitle: 'To your door',
      description: 'Delivered to your address',
    },
  ];

  const handleSelect = (mode: 'pickup' | 'delivery') => {
    onSelectMode(mode);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Choose Order Method</DialogTitle>
        <DialogDescription className="sr-only">
          Select whether you'd like to order for pickup or delivery
        </DialogDescription>
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">How would you like to order?</h2>
            <p className="text-gray-600">Choose your preferred ordering method</p>
          </div>

          {/* Options Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {options.map((option, index) => {
              const Icon = option.icon;
              return (
                <motion.div
                  key={option.mode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-current group"
                    style={{ ['--hover-color' as string]: brandColor }}
                    onClick={() => handleSelect(option.mode)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelect(option.mode);
                      }
                    }}
                  >
                    <div className="text-center">
                      {/* Icon */}
                      <div
                        className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors group-hover:bg-current group-hover:text-white"
                        style={{ backgroundColor: `${brandColor}15` }}
                      >
                        <Icon
                          className="w-8 h-8 transition-colors"
                          style={{ color: brandColor }}
                        />
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold mb-1">{option.title}</h3>
                      
                      {/* Subtitle */}
                      <p className="text-sm font-medium mb-2" style={{ color: brandColor }}>
                        {option.subtitle}
                      </p>

                      {/* Description */}
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-gray-500 mt-6">
            You can always change your selection later
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
