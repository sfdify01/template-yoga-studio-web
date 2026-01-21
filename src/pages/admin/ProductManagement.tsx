import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase/client';
import { getProductImagesBucket, projectId } from '../../lib/supabase/storage';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Search,
  Package,
  DollarSign,
  ImageIcon,
  RefreshCw,
  AlertCircle,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { CategoryPicker } from '../../components/admin/CategoryPicker';

// Price unit enum values - must match database enum
const PRICE_UNITS = [
  { value: 'each', label: 'Each', description: 'Per item' },
  { value: 'lb', label: 'Per Pound (lb)', description: 'Weight-based' },
  { value: 'oz', label: 'Per Ounce (oz)', description: 'Weight-based' },
  { value: 'kg', label: 'Per Kilogram (kg)', description: 'Weight-based' },
  { value: 'g', label: 'Per Gram (g)', description: 'Weight-based' },
  { value: 'pack', label: 'Per Pack', description: 'Bundled items' },
  { value: 'dozen', label: 'Per Dozen', description: '12 items' },
  { value: 'bunch', label: 'Per Bunch', description: 'Grouped items' },
  { value: 'piece', label: 'Per Piece', description: 'Individual piece' },
] as const;

type PriceUnit = typeof PRICE_UNITS[number]['value'];

// Dietary tag options
const DIETARY_TAGS = [
  'halal',
  'vegan',
  'vegetarian',
  'gluten-free',
  'dairy-free',
  'organic',
  'kosher',
] as const;

// Product interface matching database schema
interface Product {
  id: string;
  tenant_id: string;
  external_id: string | null;
  name: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  price_unit: PriceUnit;
  dietary_tags: string[];
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Form state for creating/editing products
interface ProductForm {
  name: string;
  category: string;
  categoryIcon: string;
  description: string;
  image_url: string;
  price_dollars: string;
  price_unit: PriceUnit;
  dietary_tags: string[];
  is_active: boolean;
}

const initialFormState: ProductForm = {
  name: '',
  category: '',
  categoryIcon: '📁',
  description: '',
  image_url: '',
  price_dollars: '',
  price_unit: 'each',
  dietary_tags: [],
  is_active: true,
};

export const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form state
  const [form, setForm] = useState<ProductForm>(initialFormState);

  // Image upload state
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get unique categories from products
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  // Build category -> icon mapping from existing products
  const categoryIconMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const product of products) {
      if (product.category && product.metadata?.categoryIcon) {
        map[product.category] = product.metadata.categoryIcon as string;
      }
    }
    return map;
  }, [products]);

  // Handler for when category changes - also update the icon
  const handleCategoryChange = (newCategory: string) => {
    const existingIcon = categoryIconMap[newCategory];
    setForm(prev => ({
      ...prev,
      category: newCategory,
      // If this category already has an icon, use it; otherwise keep current icon
      categoryIcon: existingIcon || prev.categoryIcon,
    }));
  };

  // Fetch products from database
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err: any) {
      toast.error('Failed to load products: ' + (err.message || 'Unknown error'));
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Open editor for new product
  const handleAddProduct = () => {
    setEditingProduct(null);
    setForm(initialFormState);
    setImagePreview(null);
    setIsEditorOpen(true);
  };

  // Open editor for existing product
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category || '',
      categoryIcon: (product.metadata?.categoryIcon as string) || '📁',
      description: product.description || '',
      image_url: product.image_url || '',
      price_dollars: (product.price_cents / 100).toFixed(2),
      price_unit: product.price_unit,
      dietary_tags: product.dietary_tags || [],
      is_active: product.is_active,
    });
    setImagePreview(product.image_url || null);
    setIsEditorOpen(true);
  };

  // Toggle product visibility
  const handleToggleVisibility = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          is_active: !product.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ));

      toast.success(`${product.name} is now ${!product.is_active ? 'visible' : 'hidden'}`);
    } catch (err: any) {
      toast.error('Failed to update visibility: ' + (err.message || 'Unknown error'));
    }
  };

  // Open delete confirmation
  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success(`${productToDelete.name} deleted`);
    } catch (err: any) {
      toast.error('Failed to delete product: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  // Save product (create or update)
  const handleSaveProduct = async () => {
    // Validation
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!form.category.trim()) {
      toast.error('Category is required');
      return;
    }

    const priceNum = parseFloat(form.price_dollars);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSaving(true);
    try {
      const categoryName = form.category.trim() || null;
      const categoryIcon = form.categoryIcon || '📁';

      // Build metadata with categoryIcon
      const existingMetadata = editingProduct?.metadata || {};
      const newMetadata = {
        ...existingMetadata,
        categoryIcon,
      };

      const productData = {
        name: form.name.trim(),
        category: categoryName,
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        price_cents: Math.round(priceNum * 100),
        price_unit: form.price_unit,
        dietary_tags: form.dietary_tags,
        is_active: form.is_active,
        metadata: newMetadata,
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('menu_items')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;

        // Update local state for this product
        setProducts(prev => prev.map(p =>
          p.id === editingProduct.id ? { ...p, ...productData } : p
        ));
        toast.success('Product updated');
      } else {
        // Create new product - need tenant_id
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('id')
          .limit(1)
          .single();

        if (!tenantData) {
          throw new Error('No tenant found');
        }

        const { data, error } = await supabase
          .from('menu_items')
          .insert({
            ...productData,
            tenant_id: tenantData.id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;

        setProducts(prev => [...prev, data]);
        toast.success('Product created');
      }

      // Update ALL products in this category with the new icon (sync category icon across all products)
      if (categoryName) {
        const otherProductsInCategory = products.filter(
          p => p.category === categoryName && p.id !== editingProduct?.id
        );

        // Update each product's metadata with the new categoryIcon
        for (const product of otherProductsInCategory) {
          const updatedMetadata = { ...(product.metadata || {}), categoryIcon };
          await supabase
            .from('menu_items')
            .update({ metadata: updatedMetadata })
            .eq('id', product.id);
        }

        // Update local state for all products in this category
        setProducts(prev => prev.map(p =>
          p.category === categoryName
            ? { ...p, metadata: { ...(p.metadata || {}), categoryIcon } }
            : p
        ));
      }

      setIsEditorOpen(false);
      setEditingProduct(null);
      setForm(initialFormState);
    } catch (err: any) {
      toast.error('Failed to save product: ' + (err.message || 'Unknown error'));
      console.error('Failed to save product:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle dietary tag
  const toggleDietaryTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter(t => t !== tag)
        : [...prev.dietary_tags, tag],
    }));
  };

  // Handle image upload - direct to Supabase storage
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

      // Generate unique filename
      const ext = file.name.split('.').pop() || 'jpg';
      const productId = editingProduct?.id || `new-${Date.now()}`;
      const sanitizedId = productId.replace(/[^a-zA-Z0-9-_]/g, '');
      const filename = `${sanitizedId}-${Date.now()}.${ext}`;

      // Upload directly to Supabase storage
      const productBucket = getProductImagesBucket();
      const { data, error } = await supabase.storage
        .from(productBucket)
        .upload(filename, file, {
          contentType: file.type,
          upsert: true,
        });

      if (error) {
        console.error(`Upload failed to bucket "${productBucket}" on project "${projectId}":`, error);
        throw new Error(`${error.message || 'Upload failed'} (bucket: ${productBucket})`);
      }

      // Get public URL (bucket is public)
      const { data: urlData } = supabase.storage
        .from(productBucket)
        .getPublicUrl(filename);

      if (urlData?.publicUrl) {
        setForm(prev => ({ ...prev, image_url: urlData.publicUrl }));
        toast.success('Image uploaded successfully!');
      } else {
        throw new Error('Failed to get image URL');
      }
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      setImagePreview(form.image_url || null);
    } finally {
      setUploading(false);
    }
  };

  // Remove uploaded image
  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, image_url: '' }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      handleImageUpload({ target: { files: dataTransfer.files } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  // Format price display
  const formatPrice = (cents: number, unit: string) => {
    const dollars = (cents / 100).toFixed(2);
    const unitConfig = PRICE_UNITS.find(u => u.value === unit);
    const suffix = unit === 'each' ? '' : ` /${unit}`;
    return `$${dollars}${suffix}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Products</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage your store inventory ({products.length} items)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            disabled={loading}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleAddProduct}
            className="gap-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex gap-3"
      >
        <div className="relative" style={{ flex: '1 1 0%', minWidth: 0 }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            paddingLeft={44}
            className="rounded-xl w-full"
          />
        </div>
        <div className="flex-shrink-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="rounded-xl h-11 w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No products found</h3>
          <p className="text-gray-500 text-sm mb-4">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first product to get started'
            }
          </p>
          {!searchQuery && categoryFilter === 'all' && (
            <Button onClick={handleAddProduct} className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className={`rounded-2xl border-gray-100 shadow-sm hover:shadow-md transition-shadow ${!product.is_active ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                            {product.category && (
                              <p className="text-xs text-gray-500">{product.category}</p>
                            )}
                          </div>
                          {!product.is_active && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              Hidden
                            </Badge>
                          )}
                        </div>

                        <p className="text-lg font-bold text-gray-900 mt-1">
                          {formatPrice(product.price_cents, product.price_unit)}
                        </p>

                        {product.dietary_tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {product.dietary_tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                            {product.dietary_tags.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                +{product.dietary_tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleVisibility(product)}
                        className="h-8 w-8 p-0 rounded-lg"
                        title={product.is_active ? 'Hide product' : 'Show product'}
                      >
                        {product.is_active ? (
                          <Eye className="w-4 h-4 text-gray-500" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        className="h-8 w-8 p-0 rounded-lg"
                        title="Edit product"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(product)}
                        className="h-8 w-8 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Product Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Update the product details below'
                : 'Fill in the details to create a new product'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium text-gray-500">
                Product Name *
              </Label>
              <Input
                id="name"
                placeholder="e.g. Ribeye Steak"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="rounded-xl"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500">
                Category *
              </Label>
              <CategoryPicker
                value={form.category}
                onChange={handleCategoryChange}
                existingCategories={categories}
                placeholder="Select or create category"
                icon={form.categoryIcon}
                onIconChange={(icon) => setForm(prev => ({ ...prev, categoryIcon: icon }))}
                categoryIconMap={categoryIconMap}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs font-medium text-gray-500">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Brief description of the product..."
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="rounded-xl resize-none"
                rows={3}
              />
            </div>

            {/* Price and Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" className="text-xs font-medium text-gray-500">
                  Price ($) *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={form.price_dollars}
                    onChange={(e) => setForm(prev => ({ ...prev, price_dollars: e.target.value }))}
                    paddingLeft={44}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">
                  Price Unit *
                </Label>
                <Select
                  value={form.price_unit}
                  onValueChange={(value: PriceUnit) => setForm(prev => ({ ...prev, price_unit: value }))}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_UNITS.map(unit => (
                      <SelectItem key={unit.value} value={unit.value}>
                        <span className="flex items-center gap-2">
                          {unit.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Image */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500">
                Product Image
              </Label>

              {(imagePreview || form.image_url) ? (
                <div className="relative rounded-xl border-2 border-gray-200 overflow-hidden bg-gray-50">
                  <img
                    src={imagePreview || form.image_url}
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
                      className="shadow-lg rounded-lg"
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
                      className="shadow-lg rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="relative rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-pointer bg-gray-50 hover:bg-gray-100 p-8"
                >
                  <div className="text-center">
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG up to 10MB
                    </p>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Dietary Tags */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500">
                Dietary Tags
              </Label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map(tag => (
                  <Badge
                    key={tag}
                    variant={form.dietary_tags.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize transition-colors"
                    onClick={() => toggleDietaryTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
              <div>
                <Label htmlFor="visibility" className="font-medium text-gray-900">
                  Visible in Store
                </Label>
                <p className="text-xs text-gray-500 mt-0.5">
                  {form.is_active ? 'Product is visible to customers' : 'Product is hidden from customers'}
                </p>
              </div>
              <Switch
                id="visibility"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsEditorOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={saving}
              className="rounded-xl gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Delete Product
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{productToDelete?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="rounded-xl"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
