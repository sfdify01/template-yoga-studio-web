import { motion } from 'motion/react';
import { ModernMenuGrid } from '../components/menu/ModernMenuGrid';
import { Config, MenuData } from '../hooks/useConfig';
import { useCart } from '../lib/cart/useCart';
import { useAtomValue } from 'jotai';
import { cartMinimizedAtom } from '../atoms/cart';

interface MenuPageProps {
  config: Config;
  menu: MenuData;
  onNavigate: (path: string) => void;
  showAnnouncementBar?: boolean;
}

export const MenuPage = ({ config, menu, onNavigate, showAnnouncementBar = false }: MenuPageProps) => {
  const { items } = useCart();
  const isMinimized = useAtomValue(cartMinimizedAtom);
  const hasCartItems = items.length > 0;
  const shouldAddPadding = hasCartItems && !isMinimized;

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="py-6 sm:py-8 md:py-12 lg:py-16 text-white text-center w-full"
        style={{ backgroundColor: config.theme.brand }}
      >
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-white mb-2 sm:mb-3 md:mb-4" style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', lineHeight: '1.2' }}>Our Products</h1>
            <p className="text-white/90 max-w-2xl mx-auto px-1" style={{ fontSize: 'clamp(0.813rem, 3vw, 1.125rem)', lineHeight: '1.6' }}>
              Explore our selection of premium halal products, fresh meats, and specialty items
            </p>
          </motion.div>
        </div>
      </div>

      {/* Menu Content */}
      <div className={`w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-12 pb-28 md:pb-32 lg:pb-12 transition-all duration-300 ${shouldAddPadding ? 'lg:pr-[440px]' : ''}`}>
        <div className="w-full max-w-7xl mx-auto">
          <ModernMenuGrid
            categories={menu.categories}
            dietaryFilters={menu.dietaryFilters}
            brandColor={config.theme.brand}
          />
        </div>
      </div>
    </div>
  );
};
