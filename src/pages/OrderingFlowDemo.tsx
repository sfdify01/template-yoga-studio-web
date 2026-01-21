/**
 * Ordering Flow Demo Page
 * Shows the new high-conversion system with ProductDrawer + CartRail
 */

import { useState } from 'react';
import { ProductDrawer, AddToCartPayload } from '../components/ordering/ProductDrawer';
import { CartRail } from '../components/cart/CartRail';
import { UniversalMenuItem } from '../lib/menu/types';
import { useCart } from '../lib/cart/useCart';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Sample menu items for demo
const demoMenuItems: UniversalMenuItem[] = [
  {
    id: 'avo_toast',
    name: 'Avocado Toast',
    description: 'Sourdough, avocado, cherry tomatoes, microgreens, poached egg',
    basePrice: { amountCents: 1400, currency: 'USD' },
    imageUrl: 'https://source.unsplash.com/800x600/?avocado-toast',
    tags: [
      { id: 'veg', label: 'Vegetarian', tone: 'success', icon: '🥬' },
      { id: 'popular', label: 'Popular', tone: 'warning', icon: '⭐' }
    ],
    variantGroups: [
      {
        id: 'size',
        title: 'Size',
        type: 'single',
        required: true,
        choices: [
          { id: 'std', label: 'Standard', default: true },
          { id: 'lg', label: 'Large', priceDeltaCents: 300 }
        ]
      }
    ],
    addonGroups: [
      {
        id: 'extras',
        title: 'Add extras',
        type: 'multi',
        max: 3,
        choices: [
          { id: 'cheese', label: 'Feta', priceDeltaCents: 150 },
          { id: 'bacon', label: 'Bacon', priceDeltaCents: 250 },
          { id: 'avocado', label: 'Extra Avocado', priceDeltaCents: 200 }
        ]
      }
    ],
    notesPlaceholder: 'No onions, extra sauce, well done...',
    nutrition: { calories: 520, protein: '16g', carbs: '48g', fat: '28g' },
    allergens: ['eggs', 'wheat']
  },
  {
    id: 'latte',
    name: 'Caffe Latte',
    description: 'Espresso with steamed milk and light foam',
    basePrice: { amountCents: 450, currency: 'USD' },
    imageUrl: 'https://source.unsplash.com/800x600/?latte-coffee',
    tags: [
      { id: 'hot', label: 'Hot', tone: 'info' }
    ],
    variantGroups: [
      {
        id: 'size',
        title: 'Size',
        type: 'single',
        required: true,
        choices: [
          { id: 'small', label: 'Small (12oz)', priceDeltaCents: -50 },
          { id: 'medium', label: 'Medium (16oz)', default: true },
          { id: 'large', label: 'Large (20oz)', priceDeltaCents: 75 }
        ]
      },
      {
        id: 'milk',
        title: 'Milk Choice',
        type: 'single',
        required: true,
        choices: [
          { id: 'whole', label: 'Whole Milk', default: true },
          { id: 'oat', label: 'Oat Milk', priceDeltaCents: 75 },
          { id: 'almond', label: 'Almond Milk', priceDeltaCents: 75 }
        ]
      }
    ],
    addonGroups: [
      {
        id: 'shots',
        title: 'Extra Shots',
        type: 'multi',
        max: 3,
        choices: [
          { id: 'espresso', label: 'Espresso Shot', priceDeltaCents: 75 }
        ]
      },
      {
        id: 'flavors',
        title: 'Flavor Shots',
        type: 'multi',
        max: 2,
        choices: [
          { id: 'vanilla', label: 'Vanilla', priceDeltaCents: 50 },
          { id: 'caramel', label: 'Caramel', priceDeltaCents: 50 }
        ]
      }
    ],
    notesPlaceholder: 'e.g., Extra hot, light foam...',
    nutrition: { calories: 190, protein: '9g', carbs: '18g', fat: '7g' },
    allergens: ['milk']
  },
  {
    id: 'burger',
    name: 'Classic Burger',
    description: 'Angus beef, lettuce, tomato, onion, pickles, special sauce',
    basePrice: { amountCents: 1200, currency: 'USD' },
    imageUrl: 'https://source.unsplash.com/800x600/?burger',
    tags: [
      { id: 'popular', label: 'Best Seller', tone: 'warning', icon: '⭐' }
    ],
    variantGroups: [
      {
        id: 'patty',
        title: 'Patty',
        type: 'single',
        required: true,
        choices: [
          { id: 'single', label: 'Single (6oz)', default: true },
          { id: 'double', label: 'Double (12oz)', priceDeltaCents: 400 }
        ]
      }
    ],
    addonGroups: [
      {
        id: 'toppings',
        title: 'Premium Toppings',
        type: 'multi',
        max: 5,
        choices: [
          { id: 'bacon', label: 'Bacon', priceDeltaCents: 200 },
          { id: 'cheese', label: 'Cheddar', priceDeltaCents: 100 },
          { id: 'avocado', label: 'Avocado', priceDeltaCents: 150 }
        ]
      }
    ],
    notesPlaceholder: 'e.g., No pickles, well done...',
    nutrition: { calories: 680, protein: '42g', carbs: '45g', fat: '32g' },
    allergens: ['wheat', 'eggs', 'milk', 'soy']
  },
  {
    id: 'caesar',
    name: 'Caesar Salad',
    description: 'Romaine, parmesan, croutons, classic caesar dressing',
    basePrice: { amountCents: 1100, currency: 'USD' },
    imageUrl: 'https://source.unsplash.com/800x600/?caesar-salad',
    tags: [
      { id: 'veg', label: 'Vegetarian', tone: 'success', icon: '🥬' }
    ],
    addonGroups: [
      {
        id: 'protein',
        title: 'Add Protein',
        type: 'single',
        choices: [
          { id: 'falafel', label: 'Falafel', priceDeltaCents: 300 },
          { id: 'salmon', label: 'Salmon', priceDeltaCents: 600 }
        ]
      }
    ],
    notesPlaceholder: 'Dressing on the side, no croutons...'
  },
  {
    id: 'fries',
    name: 'French Fries',
    description: 'Crispy golden fries with sea salt',
    basePrice: { amountCents: 500, currency: 'USD' },
    imageUrl: 'https://source.unsplash.com/800x600/?french-fries',
    variantGroups: [
      {
        id: 'size',
        title: 'Size',
        type: 'single',
        required: true,
        choices: [
          { id: 'regular', label: 'Regular', default: true },
          { id: 'large', label: 'Large', priceDeltaCents: 200 }
        ]
      }
    ]
  }
];

export default function OrderingFlowDemo() {
  const [selectedItem, setSelectedItem] = useState<UniversalMenuItem | null>(null);
  const { addItem } = useCart();
  const brandColor = '#C54B34';

  const handleAddToCart = (payload: AddToCartPayload) => {
    addItem({
      sku: payload.item_id,
      name: payload.name,
      price: payload.total_cents,
      priceUnit: 'each',
      qty: payload.qty,
      image: payload.image || '',
      note: payload.notes,
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              New Ordering Flow Demo
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl">
              Experience the redesigned high-conversion ordering system with the new ProductDrawer,
              AI suggestions, and persistent CartRail. Click any item to see the new flow in action!
            </p>
          </div>

          {/* Features List */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">✨ What's New</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm">Right-side drawer (desktop) / full-screen (mobile)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm">Live price updates with smooth animations</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm">AI-powered menu suggestions</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm">Persistent cart rail (always visible)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm">Real-time validation & helper text</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm">Sticky footer with qty + Add button</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm">Full accessibility (44px+ touch targets)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span className="text-sm">Complete analytics tracking</span>
              </div>
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {demoMenuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border hover:shadow-lg transition-all text-left group"
              >
                <div className="aspect-video bg-gray-100 overflow-hidden relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.tags && item.tags.length > 0 && (
                    <div className="absolute top-2 left-2 flex gap-1">
                      {item.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium"
                        >
                          {tag.icon} {tag.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <span className="font-semibold" style={{ color: brandColor }}>
                      ${(item.basePrice.amountCents / 100).toFixed(2)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Persistent Cart Rail (Desktop Only) */}
      <div className="hidden md:block">
        <CartRail
          brandColor={brandColor}
          allMenuItems={demoMenuItems}
          onCheckout={() => alert('Checkout clicked! (Would navigate to /checkout)')}
          onItemClick={(item) => setSelectedItem(item)}
          isMobile={false}
        />
      </div>

      {/* Product Drawer */}
      {selectedItem && (
        <ProductDrawer
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
          brandColor={brandColor}
          onAddToCart={handleAddToCart}
          cartItems={[]}
          allMenuItems={demoMenuItems}
          onItemClick={(item) => setSelectedItem(item)}
        />
      )}
    </div>
  );
}
