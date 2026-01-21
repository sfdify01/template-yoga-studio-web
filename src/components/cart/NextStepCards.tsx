import { motion } from 'motion/react';
import { ShoppingBag, Truck, MapPin } from 'lucide-react';
import { useCart } from '../../lib/cart/useCart';

interface NextStepCardsProps {
  defaultMode?: 'pickup' | 'delivery';
  brandColor?: string;
  onNavigate: (path: string) => void;
}

export const NextStepCards = ({ 
  defaultMode = 'pickup',
  brandColor = '#6B0F1A',
  onNavigate
}: NextStepCardsProps) => {
  const { closeDrawer } = useCart();
  const options = [
    {
      mode: 'pickup' as const,
      icon: ShoppingBag,
      title: 'Pickup',
      description: 'Ready in about 15–20 min',
      ariaLabel: 'Continue to Pickup Details',
    },
    {
      mode: 'delivery' as const,
      icon: Truck,
      title: 'Delivery',
      description: 'Delivered by DoorDash or Uber Direct',
      ariaLabel: 'Continue to Delivery Details',
    },
  ];

  const handleCardClick = (mode: 'pickup' | 'delivery') => {
    // Close drawer first
    closeDrawer();
    
    // Navigate immediately
    onNavigate(`/checkout?mode=${mode}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent, mode: 'pickup' | 'delivery') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(mode);
    }
  };

  const handleViewLocations = () => {
    closeDrawer();
    onNavigate('/contact');
  };

  return (
    <div className="space-y-4">
      {/* Heading */}
      <h3 className="text-sm font-medium">Next step</h3>

      {/* Option Cards - Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {options.map((option, index) => {
          const Icon = option.icon;

          return (
            <motion.button
              key={option.mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              onClick={() => handleCardClick(option.mode)}
              onKeyDown={(e) => handleKeyDown(e, option.mode)}
              role="button"
              tabIndex={0}
              aria-label={option.ariaLabel}
              className="relative z-20 w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-pointer min-h-[148px] text-left"
              style={{
                ['--tw-ring-color' as string]: brandColor,
              }}
            >
              {/* Content */}
              <div className="flex items-start gap-3 h-full">
                {/* Icon */}
                <div 
                  className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${brandColor}0D` }}
                >
                  <Icon className="h-5 w-5" style={{ color: brandColor }} />
                </div>

                {/* Text Content */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Title */}
                  <h4 className="text-base font-semibold text-gray-900">
                    {option.title}
                  </h4>

                  {/* Description - Allow wrapping */}
                  <p className="mt-1 text-sm text-gray-600 whitespace-normal break-words">
                    {option.description}
                  </p>

                  {/* Button indicator */}
                  <div
                    className="mt-4 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-white text-sm font-medium shadow transition-colors"
                    style={{ 
                      backgroundColor: brandColor,
                    }}
                  >
                    Continue to {option.title} Details
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Secondary CTA */}
      <div className="text-center pt-2">
        <button
          onClick={handleViewLocations}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors underline inline-flex items-center gap-1"
          aria-label="View our locations for dine-in"
        >
          <MapPin className="w-3.5 h-3.5" />
          Prefer to dine in? View our locations.
        </button>
      </div>
    </div>
  );
};
