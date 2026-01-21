import { useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { motion } from 'motion/react';
import { Search, Star } from 'lucide-react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MenuCategory } from '../hooks/useConfig';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  filteredMenuItemsByCategoryAtom,
  menuCategoriesAtom,
  menuDietaryFiltersAtom,
  menuSearchQueryAtom,
  setMenuCategoriesAtom,
  toggleMenuFilterAtom,
} from '../atoms/menu/menuAtoms';

interface MenuGridProps {
  categories: MenuCategory[];
  dietaryFilters: { id: string; label: string; icon: string }[];
  brandColor: string;
}

export const MenuGrid = ({ categories = [], dietaryFilters = [], brandColor }: MenuGridProps) => {
  const [searchQuery, setSearchQuery] = useAtom(menuSearchQueryAtom);
  const selectedFilters = useAtomValue(menuDietaryFiltersAtom);
  const toggleFilter = useSetAtom(toggleMenuFilterAtom);
  const setCategories = useSetAtom(setMenuCategoriesAtom);
  const menuCategories = useAtomValue(menuCategoriesAtom);
  const filteredItemsByCategory = useAtomValue(filteredMenuItemsByCategoryAtom);

  useEffect(() => {
    setCategories(categories || []);
  }, [categories, setCategories]);

  const displayedCategories = menuCategories.length ? menuCategories : categories;

  // If no categories, show empty state
  if (!displayedCategories || displayedCategories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No products available at this time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-2xl"
            paddingLeft={44}
          />
        </div>

        {dietaryFilters && dietaryFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {dietaryFilters.map((filter) => (
              <Badge
                key={filter.id}
                variant={selectedFilters.includes(filter.id) ? 'default' : 'outline'}
                className="cursor-pointer hover:opacity-80 transition-opacity"
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
      <Tabs defaultValue={displayedCategories[0]?.id} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap rounded-2xl">
          {displayedCategories.map((category) => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="whitespace-nowrap rounded-2xl"
            >
              <span className="mr-2">{category.icon}</span>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {displayedCategories.map((category) => {
          const filteredItems =
            filteredItemsByCategory[category.id] ?? (category.items || []);
          
          return (
            <TabsContent key={category.id} value={category.id} className="mt-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">{category.description}</p>
              </div>

              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No items found matching your search or filters.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border hover:shadow-md transition-all"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
                        <ImageWithFallback
                          src={item.imageUrl || `https://source.unsplash.com/400x300/?${encodeURIComponent(item.image)}`}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {item.popular && (
                          <Badge 
                            className="absolute top-3 right-3 text-white"
                            style={{ backgroundColor: brandColor }}
                          >
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Popular
                          </Badge>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg">{item.name}</h3>
                          <span
                            className="ml-2 flex-shrink-0 font-semibold"
                            style={{ color: brandColor }}
                          >
                            ${item.price.toFixed(2)}
                            {item.unit && item.unit !== 'each' && (
                              <span className="text-xs text-gray-500 font-normal">/{item.unit}</span>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {item.description}
                        </p>
                        {item.dietary.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.dietary.map((diet) => {
                              const filter = dietaryFilters.find(f => f.id === diet);
                              return filter ? (
                                <span key={diet} className="text-xs" title={filter.label}>
                                  {filter.icon}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
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
