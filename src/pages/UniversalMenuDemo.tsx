/**
 * Demo page for Universal Menu Item Modal
 * Shows the spec-compliant modal with test data
 */

import { useState } from 'react';
import { UniversalMenuItemModal, AddToCartPayload } from '../components/menu/UniversalMenuItemModal';
import { UniversalMenuItem, ThemeTokens } from '../lib/menu/types';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

// Mock item from spec
const mockItem: UniversalMenuItem = {
  id: 'avo_toast',
  name: 'Avocado Toast',
  description: 'Sourdough, avocado, cherry tomatoes, microgreens, poached egg',
  basePrice: { amountCents: 1400, currency: 'USD' },
  imageUrl: 'https://source.unsplash.com/800x600/?avocado-toast',
  tags: [
    { id: 'veg', label: 'Vegetarian', tone: 'success' }
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
      min: 0,
      max: 3,
      choices: [
        { id: 'cheese', label: 'Feta', priceDeltaCents: 150 },
        { id: 'bacon', label: 'Bacon', priceDeltaCents: 250 }
      ]
    }
  ],
  notesPlaceholder: 'No onions, extra sauce, well done...',
  nutrition: { calories: 520, protein: '16g', carbs: '48g', fat: '28g' },
  allergens: ['eggs', 'wheat'],
  recommendations: ['cold_brew', 'brioche_french']
};

// Additional test items
const coffeeItem: UniversalMenuItem = {
  id: 'latte',
  name: 'Latte',
  description: 'Espresso with steamed milk',
  basePrice: { amountCents: 450, currency: 'USD' },
  imageUrl: 'https://source.unsplash.com/800x600/?latte-coffee',
  tags: [
    { id: 'hot', label: 'Hot Beverage', tone: 'info' },
    { id: 'caffeine', label: 'Contains Caffeine', tone: 'warning' }
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
        { id: 'almond', label: 'Almond Milk', priceDeltaCents: 75 },
        { id: 'soy', label: 'Soy Milk', priceDeltaCents: 50 }
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
        { id: 'caramel', label: 'Caramel', priceDeltaCents: 50 },
        { id: 'hazelnut', label: 'Hazelnut', priceDeltaCents: 50 }
      ]
    }
  ],
  notesPlaceholder: 'e.g., Extra hot, light foam...',
  nutrition: { calories: 190, protein: '9g', carbs: '18g', fat: '7g' },
  allergens: ['milk']
};

const burgerItem: UniversalMenuItem = {
  id: 'custom_burger',
  name: 'Build Your Burger',
  description: 'Premium Angus beef with your choice of toppings',
  basePrice: { amountCents: 1400, currency: 'USD' },
  imageUrl: 'https://source.unsplash.com/800x600/?gourmet-burger',
  tags: [
    { id: 'popular', label: 'Popular', icon: '⭐', tone: 'warning' },
    { id: 'protein', label: 'High Protein', tone: 'success' }
  ],
  variantGroups: [
    {
      id: 'bun',
      title: 'Choose Your Bun',
      type: 'single',
      required: true,
      choices: [
        { id: 'brioche', label: 'Brioche Bun', default: true },
        { id: 'wheat', label: 'Whole Wheat', priceDeltaCents: 50 },
        { id: 'lettuce', label: 'Lettuce Wrap', description: 'Low carb option' }
      ]
    },
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
};

// Recommendations
const recommendedItems: UniversalMenuItem[] = [
  {
    id: 'cold_brew',
    name: 'Cold Brew Coffee',
    basePrice: { amountCents: 550, currency: 'USD' },
    imageUrl: 'https://source.unsplash.com/300x300/?cold-brew-coffee',
  },
  {
    id: 'brioche_french',
    name: 'Brioche French Toast',
    basePrice: { amountCents: 1200, currency: 'USD' },
    imageUrl: 'https://source.unsplash.com/300x300/?french-toast',
  },
  {
    id: 'smoothie',
    name: 'Berry Smoothie',
    basePrice: { amountCents: 850, currency: 'USD' },
    imageUrl: 'https://source.unsplash.com/300x300/?berry-smoothie',
  },
  {
    id: 'croissant',
    name: 'Butter Croissant',
    basePrice: { amountCents: 450, currency: 'USD' },
    imageUrl: 'https://source.unsplash.com/300x300/?croissant',
  },
];

// Theme options
const themes: Record<string, ThemeTokens> = {
  'Tabsy Orange': {
    radius: 'rounded-2xl',
    shadow: 'shadow-2xl',
    brand: { bg: 'bg-[#C54B34]', hover: 'hover:bg-[#aa3f2c]' },
    accent: 'text-[#C54B34]',
    chip: { bg: 'bg-gray-100', text: 'text-gray-700' },
    border: 'border border-gray-200',
  },
  'Coffee Brown': {
    radius: 'rounded-xl',
    shadow: 'shadow-2xl',
    brand: { bg: 'bg-amber-700', hover: 'hover:bg-amber-800' },
    accent: 'text-amber-700',
    chip: { bg: 'bg-amber-50', text: 'text-amber-900' },
    border: 'border border-amber-200',
  },
  'Pizza Red': {
    radius: 'rounded-2xl',
    shadow: 'shadow-2xl',
    brand: { bg: 'bg-red-600', hover: 'hover:bg-red-700' },
    accent: 'text-red-600',
    chip: { bg: 'bg-red-50', text: 'text-red-900' },
    border: 'border border-red-200',
  },
  'Health Green': {
    radius: 'rounded-3xl',
    shadow: 'shadow-lg',
    brand: { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600' },
    accent: 'text-emerald-500',
    chip: { bg: 'bg-emerald-50', text: 'text-emerald-800' },
    border: 'border border-emerald-200',
  },
};

export default function UniversalMenuDemo() {
  const [selectedItem, setSelectedItem] = useState<UniversalMenuItem | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('Tabsy Orange');

  const handleAddToCart = (payload: AddToCartPayload) => {
    console.log('Add to Cart Payload:', payload);
    toast.success(`Added to cart! Total: $${(payload.total_cents / 100).toFixed(2)}`);
  };

  const items = [mockItem, coffeeItem, burgerItem];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Universal Menu Item Modal
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Production-ready modal with variants, add-ons, nutrition, allergens, and dynamic pricing.
            Click any item to see it in action!
          </p>

          {/* Theme Selector */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <span className="text-sm text-gray-700 mr-2">Theme:</span>
            {Object.keys(themes).map(themeName => (
              <button
                key={themeName}
                onClick={() => setSelectedTheme(themeName)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTheme === themeName
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {themeName}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow text-left"
            >
              <div className="aspect-video bg-gray-100 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.name}
                  </h3>
                  <span className="text-lg font-semibold text-orange-600">
                    ${(item.basePrice.amountCents / 100).toFixed(2)}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        {tag.icon && <span className="mr-1">{tag.icon}</span>}
                        {tag.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Features List */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              '✅ Variant groups (single/multi select)',
              '✅ Add-on groups with pricing',
              '✅ Real-time price calculation',
              '✅ Nutrition & allergen info',
              '✅ Validation with helpful errors',
              '✅ Local storage (remembers preferences)',
              '✅ Analytics events',
              '✅ Sticky mobile footer',
              '✅ Keyboard navigation (Enter, Esc)',
              '✅ Full accessibility (WCAG AA)',
              '✅ Responsive design',
              '✅ Recommendations carousel',
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Code Example */}
        <div className="mt-8 bg-gray-900 rounded-2xl p-6 text-white overflow-x-auto">
          <pre className="text-sm">
            <code>{`<UniversalMenuItemModal
  isOpen={true}
  item={item}
  theme={theme}
  onClose={() => setSelectedItem(null)}
  onAddToCart={(payload) => {
    console.log('Cart payload:', payload);
    // payload = {
    //   item_id, qty, notes,
    //   selections: { variants: [...], addons: [...] },
    //   unit_price_cents, total_cents
    // }
  }}
  recommendedItems={[...]}
/>`}</code>
          </pre>
        </div>
      </div>

      {/* Modal */}
      {selectedItem && (
        <UniversalMenuItemModal
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
          theme={themes[selectedTheme]}
          onAddToCart={handleAddToCart}
          recommendedItems={recommendedItems}
          onItemClick={(item) => setSelectedItem(item)}
        />
      )}
    </div>
  );
}
