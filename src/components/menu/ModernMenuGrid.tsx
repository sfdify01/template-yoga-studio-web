import { useEffect, useState, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ModernMenuCard } from './ModernMenuCard';
import { MenuItem, MenuCategory } from '../../hooks/useConfig';
import { useCart } from '../../lib/cart/useCart';
import { toast } from 'sonner';
import { normalizeUnit } from '../../lib/units';
import {
  filteredMenuItemsByCategoryAtom,
  menuCategoriesAtom,
  menuDietaryFiltersAtom,
  menuSearchQueryAtom,
  setMenuCategoriesAtom,
  toggleMenuFilterAtom,
} from '../../atoms/menu/menuAtoms';

interface ModernMenuGridProps {
  categories: MenuCategory[];
  dietaryFilters: { id: string; label: string; icon: string }[];
  brandColor: string;
}

export const ModernMenuGrid = ({ categories = [], dietaryFilters = [], brandColor }: ModernMenuGridProps) => {
  const [searchQuery, setSearchQuery] = useAtom(menuSearchQueryAtom);
  const selectedFilters = useAtomValue(menuDietaryFiltersAtom);
  const toggleFilter = useSetAtom(toggleMenuFilterAtom);
  const setCategories = useSetAtom(setMenuCategoriesAtom);
  const menuCategories = useAtomValue(menuCategoriesAtom);
  const filteredItemsByCategory = useAtomValue(filteredMenuItemsByCategoryAtom);
  const { addItem } = useCart();

  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    setCategories(categories || []);
  }, [categories, setCategories]);

  const displayedCategories = menuCategories.length ? menuCategories : categories;

  // Initialize activeTab when categories load
  useEffect(() => {
    if (displayedCategories.length > 0 && activeTab === null) {
      setActiveTab(displayedCategories[0].id);
    }
  }, [displayedCategories, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Update indicator position when active tab changes
  useEffect(() => {
    const currentActiveTab = activeTab || displayedCategories[0]?.id;
    if (!currentActiveTab) return;

    const updateIndicator = () => {
      const activeElement = tabRefs.current.get(currentActiveTab);
      const listElement = tabsListRef.current;

      if (activeElement && listElement) {
        const listRect = listElement.getBoundingClientRect();
        const activeRect = activeElement.getBoundingClientRect();

        setIndicatorStyle({
          left: activeRect.left - listRect.left + listElement.scrollLeft,
          width: activeRect.width,
        });
      }
    };

    // Small delay to ensure refs are populated
    const timeoutId = setTimeout(updateIndicator, 50);

    const listElement = tabsListRef.current;

    // Update on resize and scroll
    window.addEventListener('resize', updateIndicator);
    listElement?.addEventListener('scroll', updateIndicator);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateIndicator);
      listElement?.removeEventListener('scroll', updateIndicator);
    };
  }, [activeTab, displayedCategories]);

  const handleQuickAdd = (item: MenuItem, qty: number) => {
    addItem({
      sku: item.id,
      name: item.name,
      price: Math.round(item.price * 100), // Convert to cents
      priceUnit: normalizeUnit(item.unit || 'each'),
      unitLabel: item.unitLabel,
      qty,
      image: item.imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(item.image || item.name)}`,
    });

    toast.success(`Added ${qty}x ${item.name} to cart`, {
      duration: 2000,
    });
  };



  // If no categories, show empty state
  if (!displayedCategories || displayedCategories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No products available at this time.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4 md:space-y-6">
      {/* Search and Filters */}
      <div className="w-full space-y-2.5 sm:space-y-3 md:space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            paddingLeft={36}
            className="w-full pr-3 h-11 sm:h-12 rounded-lg sm:rounded-xl md:rounded-2xl text-sm sm:text-base"
          />
        </div>

        {dietaryFilters && dietaryFilters.length > 0 && (
          <div className="w-full flex flex-wrap gap-1.5 sm:gap-2">
            {dietaryFilters.map((filter) => (
              <Badge
                key={filter.id}
                variant={selectedFilters.includes(filter.id) ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80 transition-opacity text-xs sm:text-sm min-h-[36px] sm:min-h-[40px] px-2.5 sm:px-3 rounded-lg"
                style={selectedFilters.includes(filter.id) ? { backgroundColor: brandColor } : {}}
                onClick={() => toggleFilter(filter.id)}
              >
                <span className="mr-1">{filter.icon}</span>
                {filter.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Menu Categories */}
      <Tabs
        defaultValue={displayedCategories[0]?.id}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <div className="relative -mx-3 sm:mx-0 mb-4 sm:mb-6 w-full">
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none md:hidden z-20" />
          <TabsList
            ref={tabsListRef}
            className="relative w-full inline-flex h-auto min-h-[44px] items-center justify-start overflow-x-auto overflow-y-hidden flex-nowrap rounded-none sm:rounded-xl md:rounded-2xl bg-white border-y sm:border px-3 sm:px-0 scrollbar-hide"
          >
            {/* Animated indicator */}
            <motion.div
              className="absolute bottom-0 h-[3px] rounded-full z-10"
              style={{
                backgroundColor: brandColor,
                boxShadow: `0 0 12px ${brandColor}40, 0 0 4px ${brandColor}60`,
              }}
              initial={false}
              animate={{
                left: indicatorStyle.left,
                width: indicatorStyle.width,
              }}
              transition={{
                type: 'spring',
                stiffness: 380,
                damping: 30,
              }}
            />
            {displayedCategories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(category.id, el);
                }}
                className="whitespace-nowrap rounded-lg sm:rounded-xl md:rounded-2xl text-sm sm:text-base min-h-[44px] px-3 sm:px-4 flex-shrink-0 inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-200 data-[state=active]:text-[var(--brand-color)] text-gray-600 hover:text-gray-900 relative bg-transparent data-[state=active]:bg-transparent"
                style={{ '--brand-color': brandColor } as React.CSSProperties}
              >
                <span className="mr-1.5 sm:mr-2 text-base sm:text-lg transition-transform duration-200 data-[state=active]:scale-110">{category.icon}</span>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {displayedCategories.map((category) => {
          const filteredItems =
            filteredItemsByCategory[category.id] ?? (category.items || []);
          
          return (
            <TabsContent key={category.id} value={category.id} className="w-full mt-4 sm:mt-5 md:mt-6">
              <div className="w-full mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{category.description}</p>
              </div>

              {filteredItems.length === 0 ? (
                <div className="w-full text-center py-8 sm:py-10 md:py-12 text-gray-500 text-sm sm:text-base">
                  No items found matching your search or filters.
                </div>
              ) : (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                  {filteredItems.map((item) => (
                    <ModernMenuCard
                      key={item.id}
                      item={item}
                      brandColor={brandColor}
                      onAdd={handleQuickAdd}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
