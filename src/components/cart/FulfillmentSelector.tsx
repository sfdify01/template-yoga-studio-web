import { motion } from 'motion/react';
import { ShoppingBag, Truck } from 'lucide-react';

interface FulfillmentSelectorProps {
  selected: 'pickup' | 'delivery' | null;
  onChange: (type: 'pickup' | 'delivery') => void;
  brandColor: string;
  pickupEta?: string;
  deliveryEta?: string;
}

export const FulfillmentSelector = ({
  selected,
  onChange,
  brandColor,
  pickupEta = '20–30 mins',
  deliveryEta = '30–45 mins',
}: FulfillmentSelectorProps) => {
  // Calculate light tint background (10% opacity of brand color)
  const getLightTint = (color: string) => {
    // Convert hex to RGB and add alpha
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.08)`;
  };

  const lightTint = getLightTint(brandColor);

  return (
    <div className="space-y-3">
      <label className="text-xs text-gray-500 font-medium">
        Fulfillment {selected === null && <span className="text-red-500">*</span>}
      </label>
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-50 border border-gray-100 p-2">
        {/* Pickup Option */}
        <button
          type="button"
          onClick={() => onChange('pickup')}
          className={`
            relative h-14 rounded-xl border-2 flex flex-col justify-center items-center gap-1 text-sm font-medium transition-all duration-200
            ${selected === 'pickup'
              ? 'border-current shadow-sm'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-100'
            }
          `}
          style={selected === 'pickup' ? {
            borderColor: brandColor,
            backgroundColor: lightTint,
            color: brandColor
          } : undefined}
        >
          <ShoppingBag 
            className="w-5 h-5" 
            style={{ color: selected === 'pickup' ? brandColor : '#6B7280' }}
          />
          <span className={selected === 'pickup' ? 'text-xs font-medium' : 'text-xs font-medium text-gray-700'}>
            Pickup
          </span>
          
          {/* Inner glow effect for selected state */}
          {selected === 'pickup' && (
            <motion.div
              layoutId="fulfillment-glow"
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                boxShadow: `0 0 0 2px ${lightTint} inset`
              }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
        </button>

        {/* Delivery Option */}
        <button
          type="button"
          onClick={() => onChange('delivery')}
          className={`
            relative h-14 rounded-xl border-2 flex flex-col justify-center items-center gap-1 text-sm font-medium transition-all duration-200
            ${selected === 'delivery'
              ? 'border-current shadow-sm'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-100'
            }
          `}
          style={selected === 'delivery' ? {
            borderColor: brandColor,
            backgroundColor: lightTint,
            color: brandColor
          } : undefined}
        >
          <Truck 
            className="w-5 h-5" 
            style={{ color: selected === 'delivery' ? brandColor : '#6B7280' }}
          />
          <span className={selected === 'delivery' ? 'text-xs font-medium' : 'text-xs font-medium text-gray-700'}>
            Delivery
          </span>
          
          {/* Inner glow effect for selected state */}
          {selected === 'delivery' && (
            <motion.div
              layoutId="fulfillment-glow"
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                boxShadow: `0 0 0 2px ${lightTint} inset`
              }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
        </button>
      </div>
    </div>
  );
};
