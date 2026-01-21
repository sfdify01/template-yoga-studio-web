import { ShoppingBag } from 'lucide-react';
import { Button } from '../ui/button';

interface EmptyCartStateProps {
  onBrowseMenu: () => void;
  onViewPopular?: () => void;
  brandColor?: string;
}

export const EmptyCartState = ({
  onBrowseMenu,
  onViewPopular,
  brandColor = '#6B0F1A',
}: EmptyCartStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: `${brandColor}15` }}
      >
        <ShoppingBag className="w-10 h-10" style={{ color: brandColor }} />
      </div>

      <h3 className="mb-2">Your cart is empty</h3>
      <p className="text-gray-600 text-sm mb-6 max-w-sm">
        Add some delicious items from our menu to get started
      </p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button
          onClick={onBrowseMenu}
          size="lg"
          className="w-full text-white"
          style={{ backgroundColor: brandColor }}
        >
          Browse Menu
        </Button>

        {onViewPopular && (
          <Button
            onClick={onViewPopular}
            variant="ghost"
            size="lg"
            className="w-full"
          >
            See popular items
          </Button>
        )}
      </div>
    </div>
  );
};
