import { useState } from 'react';
import { motion } from 'motion/react';
import { useCart, getTotalQty } from '../lib/cart/useCart';
import { Button } from '../components/ui/button';
import { CartLineItem } from '../components/cart/CartLineItem';
import { CartSummary } from '../components/cart/CartSummary';
import { EmptyCartState } from '../components/cart/EmptyCartState';
import { CartRecommendations } from '../components/cart/CartRecommendations';
import { MenuItemModal } from '../components/MenuItemModal';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { MenuData, MenuItem } from '../hooks/useConfig';

interface CartProps {
  onNavigate: (path: string) => void;
  brandColor: string;
  menu?: MenuData;
}

export const Cart = ({ onNavigate, brandColor, menu }: CartProps) => {
  const { items, totals, setQty, removeItem, clear } = useCart();
  const totalQty = getTotalQty(items);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Flatten all menu items for recommendations
  const allMenuItems = menu ? menu.categories.flatMap(cat => cat.items) : [];
  const dietaryFilters = menu?.filters || [];

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <EmptyCartState
          onBrowseMenu={() => onNavigate('/products')}
          onViewPopular={() => onNavigate('/products#featured')}
          brandColor={brandColor}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => onNavigate('/products')}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              aria-label="Back to products"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1>Cart</h1>
          </div>
          <p className="text-sm text-gray-600 ml-11">
            {totalQty} {totalQty === 1 ? 'item' : 'items'}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm mb-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg">Items</h2>
            <button
              onClick={clear}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear all
            </button>
          </div>

          <div className="space-y-1">
            {items.map((item) => (
              <CartLineItem
                key={item.id}
                item={item}
                onQtyChange={setQty}
                onRemove={removeItem}
              />
            ))}
          </div>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <h2 className="text-lg mb-4">Order Summary</h2>
          <CartSummary totals={totals}>
            Tax and fees calculated at checkout
          </CartSummary>
        </motion.div>

        {/* AI Recommendations */}
        {menu && allMenuItems.length > 0 && (
          <CartRecommendations
            allMenuItems={allMenuItems}
            brandColor={brandColor}
            onItemClick={(item) => {
              setSelectedItem(item);
              // Find category of the item
              const category = menu.categories.find(cat => 
                cat.items.some(i => i.id === item.id)
              );
              if (category) {
                setSelectedCategory(category.id);
              }
            }}
          />
        )}
      </div>

      {/* Menu Item Modal for Recommendations */}
      {selectedItem && (
        <MenuItemModal
          item={selectedItem}
          brandColor={brandColor}
          dietaryFilters={dietaryFilters}
          onClose={() => setSelectedItem(null)}
          allMenuItems={allMenuItems}
          categoryId={selectedCategory}
          onItemClick={(item) => {
            setSelectedItem(item);
            const category = menu?.categories.find(cat => 
              cat.items.some(i => i.id === item.id)
            );
            if (category) {
              setSelectedCategory(category.id);
            }
          }}
        />
      )}

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-20">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onNavigate('/menu')}
            className="flex-1"
          >
            Continue Shopping
          </Button>
          <Button
            size="lg"
            onClick={() => onNavigate('/checkout')}
            className="flex-1 text-white"
            style={{ backgroundColor: brandColor }}
          >
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};
