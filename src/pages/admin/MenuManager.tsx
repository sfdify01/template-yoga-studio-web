// Updated: 2025-11-04 - Pricing Unit Feature
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { 
  Search, Plus, Edit, Trash2, Star, DollarSign,
  FileText, Filter, ChevronDown, AlertCircle, CheckCircle2,
  UtensilsCrossed, X, Save, Upload, Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { formatUnitSuffix } from '../../lib/units';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;  // Original price before discount
  discountedPrice?: number; // Discounted price (if on sale)
  category: string;
  image?: string;
  imageUrl?: string;
  dietary: string[];
  popular?: boolean;
  unit?: 'lb' | 'each';
  unitLabel?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  items: MenuItem[];
}

interface MenuData {
  categories: MenuCategory[];
}

const renderUnitSuffix = (unit?: string, unitLabel?: string) => {
  const suffix = formatUnitSuffix(unit, unitLabel);
  if (!suffix) return '';
  return suffix.startsWith('/') ? suffix : ` ${suffix}`;
};

interface MenuManagerProps {
  // Can add props if needed
}

export const MenuManager = ({}: MenuManagerProps) => {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const { adminApi } = await import('../../lib/admin/api-client');
      const data = await adminApi.getMenu();
      console.log('Menu loaded:', data);
      setMenuData(data);
    } catch (error: any) {
      console.error('Failed to load menu:', error);
      toast.error(`Failed to load menu: ${error.message || 'Unknown error'}`);
      setMenuData({ categories: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async (item: MenuItem) => {
    try {
      if (!menuData) return;

      // Find the category this item belongs to
      const categoryIndex = menuData.categories.findIndex(
        cat => cat.id === item.category
      );

      if (categoryIndex === -1) {
        toast.error('Category not found');
        return;
      }

      const category = menuData.categories[categoryIndex];
      const itemIndex = category.items.findIndex(i => i.id === item.id);

      let updatedCategories = [...menuData.categories];
      
      if (itemIndex === -1) {
        // New item
        updatedCategories[categoryIndex] = {
          ...category,
          items: [...category.items, item]
        };
      } else {
        // Update existing item
        updatedCategories[categoryIndex] = {
          ...category,
          items: category.items.map((i, idx) => idx === itemIndex ? item : i)
        };
      }

      // Save to server using the admin API
      const { adminApi } = await import('../../lib/admin/api-client');
      await adminApi.updateMenu({ categories: updatedCategories });

      toast.success(itemIndex === -1 ? 'Item added successfully!' : 'Item updated successfully!');
      setMenuData({ categories: updatedCategories });
      setShowEditor(false);
      setEditingItem(null);
    } catch (error: any) {
      console.error('Failed to save item:', error);
      toast.error(`Failed to save item: ${error.message}`);
    }
  };

  const handleDeleteItem = async (categoryId: string, itemId: string) => {
    if (deleteConfirm !== itemId) {
      setDeleteConfirm(itemId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      if (!menuData) return;

      const categoryIndex = menuData.categories.findIndex(cat => cat.id === categoryId);
      if (categoryIndex === -1) return;

      const updatedCategories = [...menuData.categories];
      updatedCategories[categoryIndex] = {
        ...updatedCategories[categoryIndex],
        items: updatedCategories[categoryIndex].items.filter(i => i.id !== itemId)
      };

      // Save to server using the admin API
      const { adminApi } = await import('../../lib/admin/api-client');
      await adminApi.updateMenu({ categories: updatedCategories });

      toast.success('Item deleted successfully!');
      setMenuData({ categories: updatedCategories });
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      toast.error(`Failed to delete item: ${error.message}`);
    }
    setDeleteConfirm(null);
  };

  const handleNewItem = () => {
    const firstCategory = menuData?.categories[0];
    if (!firstCategory) {
      toast.error('Please create a category first');
      return;
    }

    setEditingItem({
      id: `item-${Date.now()}`,
      name: '',
      description: '',
      price: 0,
      category: firstCategory.id,
      dietary: ['halal'],
      popular: false,
      unit: 'lb'
    });
    setShowEditor(true);
  };

  const handleEditItem = (categoryId: string, item: MenuItem) => {
    setEditingItem({ ...item, category: categoryId });
    setShowEditor(true);
  };

  // Get all items across categories
  const allItems: Array<MenuItem & { categoryId: string; categoryName: string }> = [];
  menuData?.categories.forEach(cat => {
    cat.items.forEach(item => {
      allItems.push({
        ...item,
        categoryId: cat.id,
        categoryName: cat.name
      });
    });
  });

  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                         item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = menuData?.categories || [];

  return (
    <div className="space-y-6">
      {/* Info Banner - Show if no items */}
      {allItems.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-1">No products yet</h3>
              <p className="text-sm text-blue-700 mb-3">
                Product data now lives in Supabase. Seed it via <code className="text-xs bg-blue-100 px-1 rounded">supabase/seed/menu.json</code>
                or start fresh by creating new items below.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleNewItem}
                  className="gap-2"
                  disabled={categories.length === 0}
                >
                  <Plus className="w-4 h-4" />
                  Create New Product
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg border p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Search and Filter Row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                paddingLeft={40}
                className="w-full"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 w-full sm:w-auto justify-between sm:justify-center">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span className="truncate">{categoryFilter === 'all' ? 'All Categories' :
                      categories.find(c => c.id === categoryFilter)?.name || categoryFilter}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setCategoryFilter('all')}>
                  All Categories
                </DropdownMenuItem>
                {categories.map(cat => (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                  >
                    {cat.icon} {cat.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Action Button */}
          <div className="flex sm:justify-end">
            <Button
              onClick={handleNewItem}
              className="bg-brand hover:bg-brand-hover text-white gap-2 w-full sm:w-auto"
              disabled={categories.length === 0}
            >
              <Plus className="w-4 h-4" />
              New Product
            </Button>
          </div>
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading products...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="p-12 text-center">
          <UtensilsCrossed className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg mb-2">No products found</h3>
          <p className="text-gray-600 mb-6">
            {search || categoryFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'Get started by creating your first product'}
          </p>
          {!search && categoryFilter === 'all' && (
            <Button
              onClick={handleNewItem}
              className="bg-[#8B0000] hover:bg-[#6B0000]"
              disabled={categories.length === 0}
            >
              Create First Product
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const unitSuffix = renderUnitSuffix(item.unit, item.unitLabel);
            return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-3 sm:p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                  {/* Product Image Thumbnail - Top on mobile, Left on desktop */}
                  {item.imageUrl && (
                    <div className="w-full h-32 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{item.name}</h3>
                      {item.popular && (
                        <Badge variant="default" className="bg-yellow-500 gap-1 text-xs">
                          <Star className="w-3 h-3" />
                          Popular
                        </Badge>
                      )}
                      {item.imageUrl && (
                        <Badge variant="secondary" className="gap-1 text-xs hidden sm:flex">
                          <ImageIcon className="w-3 h-3" />
                          Custom Image
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                      <Badge variant="outline" className="text-xs">{item.categoryName}</Badge>
                      <span className="flex items-center gap-1 text-green-700 font-medium">
                        <DollarSign className="w-3 h-3" />
                        {item.price.toFixed(2)}
                        {unitSuffix}
                      </span>
                      {item.dietary.slice(0, 2).map(diet => (
                        <Badge key={diet} variant="secondary" className="text-xs hidden sm:inline-flex">
                          {diet}
                        </Badge>
                      ))}
                      {item.dietary.length > 2 && (
                        <span className="text-xs text-gray-500 hidden sm:inline">+{item.dietary.length - 2}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 sm:flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditItem(item.categoryId, item)}
                      className="gap-2 flex-1 sm:flex-none"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteItem(item.categoryId, item.id)}
                      className={`gap-2 flex-1 sm:flex-none ${
                        deleteConfirm === item.id
                          ? 'border-red-500 text-red-600 hover:bg-red-50'
                          : ''
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleteConfirm === item.id ? 'Confirm?' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Total Products</div>
          <div className="text-2xl mt-1">{allItems.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Popular Products</div>
          <div className="text-2xl mt-1">{allItems.filter(i => i.popular).length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Categories</div>
          <div className="text-2xl mt-1">{categories.length}</div>
        </Card>
      </div>

      {/* Item Editor Modal */}
      {showEditor && editingItem && (
        <ItemEditor
          item={editingItem}
          categories={categories}
          onSave={handleSaveItem}
          onCancel={() => {
            setShowEditor(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

// Item Editor Component
interface ItemEditorProps {
  item: MenuItem;
  categories: MenuCategory[];
  onSave: (item: MenuItem) => void;
  onCancel: () => void;
}

const ItemEditor = ({ item: initialItem, categories, onSave, onCancel }: ItemEditorProps) => {
  const [item, setItem] = useState<MenuItem>(initialItem);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(item.imageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('ItemEditor mounted with item:', item);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    
    if (item.price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    onSave(item);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    setUploading(true);

    try {
      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const { adminApi } = await import('../../lib/admin/api-client');
      const result = await adminApi.uploadProductImage(file, item.id);

      if (result.success && result.url) {
        setItem({ ...item, imageUrl: result.url });
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      setImagePreview(item.imageUrl || null); // Reset to original
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setItem({ ...item, imageUrl: undefined });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleDietary = (value: string) => {
    setItem(prev => ({
      ...prev,
      dietary: prev.dietary.includes(value)
        ? prev.dietary.filter(d => d !== value)
        : [...prev.dietary, value]
    }));
  };

  const dietaryOptions = ['halal', 'vegan', 'vegetarian', 'gluten-free', 'dairy-free'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 sm:p-6 border-b flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              {initialItem.name ? 'Edit Product' : 'New Product'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
              Fill in the details for your product
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium">Product Name *</Label>
            <Input
              id="name"
              value={item.name}
              onChange={(e) => setItem({ ...item, name: e.target.value })}
              placeholder="e.g. Ribeye Steak"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              value={item.description}
              onChange={(e) => setItem({ ...item, description: e.target.value })}
              placeholder="Brief description of the product"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="price" className="text-sm font-medium">Current Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={item.price}
                onChange={(e) => setItem({ ...item, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the price customers will pay
              </p>
            </div>

            <div>
              <Label htmlFor="category" className="text-sm font-medium">Category *</Label>
              <select
                id="category"
                value={item.category}
                onChange={(e) => setItem({ ...item, category: e.target.value })}
                className="flex h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 focus-visible:border-brand mt-1"
                required
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Discount Pricing Section */}
          <div className="border rounded-lg p-3 sm:p-4 space-y-3 bg-amber-50 border-amber-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label className="block font-medium text-amber-900 text-sm">Sale Pricing (Optional)</Label>
              <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded">Discount</span>
            </div>

            <p className="text-xs text-amber-700">
              Set original and discounted prices to show a strikethrough discount on the product card
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="originalPrice" className="text-xs sm:text-sm">Original Price</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.originalPrice || ''}
                  onChange={(e) => setItem({
                    ...item,
                    originalPrice: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  placeholder="e.g., 24.99"
                  className="bg-white mt-1"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Price before discount
                </p>
              </div>

              <div>
                <Label htmlFor="discountedPrice" className="text-xs sm:text-sm">Discounted Price</Label>
                <Input
                  id="discountedPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={item.discountedPrice || ''}
                  onChange={(e) => setItem({
                    ...item,
                    discountedPrice: e.target.value ? parseFloat(e.target.value) : undefined
                  })}
                  placeholder="e.g., 18.99"
                  className="bg-white mt-1"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Sale price (lower than original)
                </p>
              </div>
            </div>

            {/* Preview of discount pricing */}
            {item.originalPrice && item.discountedPrice && item.discountedPrice < item.originalPrice && (
              <div className="border border-green-200 rounded-md p-3 bg-green-50">
                <Label className="text-xs text-green-700 mb-2 block">Discount Preview</Label>
                <div className="flex items-center gap-2">
                  <span className="text-lg line-through text-gray-400">
                    ${item.originalPrice.toFixed(2)}
                  </span>
                  <span className="text-2xl font-semibold text-green-700">
                    ${item.discountedPrice.toFixed(2)}
                  </span>
                  <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full font-medium">
                    SAVE ${(item.originalPrice - item.discountedPrice).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  ✓ Discount will be displayed on product card
                </p>
              </div>
            )}

            {item.originalPrice && item.discountedPrice && item.discountedPrice >= item.originalPrice && (
              <div className="border border-red-200 rounded-md p-3 bg-red-50">
                <p className="text-xs text-red-700">
                  ⚠️ Discounted price must be lower than original price
                </p>
              </div>
            )}
          </div>

          {/* Pricing Unit Section - Select unit for product */}
          <div className="border rounded-lg p-3 sm:p-4 space-y-3 bg-gray-50">
            <Label className="block font-medium text-sm">Pricing Unit</Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4 sm:flex-col sm:gap-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="unit-lb"
                      name="unit"
                      value="lb"
                      checked={item.unit === 'lb'}
                      onChange={(e) => setItem({ ...item, unit: 'lb' as 'lb' | 'each' })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <Label htmlFor="unit-lb" className="cursor-pointer font-normal text-sm">
                      Pound (lb)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="unit-each"
                      name="unit"
                      value="each"
                      checked={item.unit === 'each'}
                      onChange={(e) => setItem({ ...item, unit: 'each' as 'lb' | 'each' })}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <Label htmlFor="unit-each" className="cursor-pointer font-normal text-sm">
                      Each
                    </Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="unitLabel" className="text-xs text-gray-600">
                    Custom label (optional)
                  </Label>
                  <Input
                    id="unitLabel"
                    value={item.unitLabel || ''}
                    onChange={(e) => setItem({ ...item, unitLabel: e.target.value.slice(0, 64) })}
                    placeholder="per pack, per 2 lb, per box..."
                    maxLength={64}
                    className="text-sm mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    e.g., "per pack" or "per 2 lb"
                  </p>
                </div>
              </div>

              <div className="border rounded-md p-3 bg-white">
                <Label className="text-xs text-gray-600 mb-2 block">Preview</Label>
                <div className="text-xl sm:text-2xl font-semibold text-green-700">
                  ${item.price.toFixed(2)}
                  {renderUnitSuffix(item.unit, item.unitLabel)}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This is how customers will see the price
                </p>
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div>
            <Label className="mb-2 block">Product Image</Label>
            
            {imagePreview ? (
              <div className="relative rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="shadow-lg"
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={handleRemoveImage}
                    disabled={uploading}
                    className="shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white">Uploading...</div>
                  </div>
                )}
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100 p-8"
              >
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">
                    Click to upload product image
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            <p className="text-xs text-gray-500 mt-2">
              Upload a custom image or use auto-generated images below
            </p>
          </div>

          <div>
            <Label htmlFor="image">Image Search Query (Fallback)</Label>
            <Input
              id="image"
              value={item.image || ''}
              onChange={(e) => setItem({ ...item, image: e.target.value })}
              placeholder="e.g. ribeye steak beef"
            />
            <p className="text-xs text-gray-500 mt-1">
              Keywords for auto-generating images when no custom image is uploaded
            </p>
          </div>

          <div>
            <Label className="mb-2 block">Dietary Tags</Label>
            <div className="flex flex-wrap gap-2">
              {dietaryOptions.map(option => (
                <Badge
                  key={option}
                  variant={item.dietary.includes(option) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleDietary(option)}
                >
                  {option}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="popular"
              checked={item.popular || false}
              onCheckedChange={(checked) => setItem({ ...item, popular: checked })}
            />
            <Label htmlFor="popular" className="cursor-pointer">
              Mark as Popular Product
            </Label>
          </div>
        </form>

        <div className="p-3 sm:p-6 border-t flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-brand hover:bg-brand-hover text-white gap-2 w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            Save Product
          </Button>
        </div>
      </Card>
    </div>
  );
};
