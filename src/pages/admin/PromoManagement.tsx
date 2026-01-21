import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase/client';
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
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Tag,
  DollarSign,
  Percent,
  RefreshCw,
  AlertCircle,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

// Promo interface matching database schema
interface Promo {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_subtotal_cents: number;
  max_discount_cents: number | null;
  first_time_only: boolean;
  one_per_customer: boolean;
  start_date: string;
  expire_date: string | null;
  usage_limit: number | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Form state for creating/editing promos
interface PromoForm {
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: string;
  min_subtotal_dollars: string;
  max_discount_dollars: string;
  first_time_only: boolean;
  one_per_customer: boolean;
  start_date: string;
  expire_date: string;
  usage_limit: string;
  is_active: boolean;
}

const initialFormState: PromoForm = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_subtotal_dollars: '',
  max_discount_dollars: '',
  first_time_only: false,
  one_per_customer: true,
  start_date: new Date().toISOString().split('T')[0],
  expire_date: '',
  usage_limit: '',
  is_active: true,
};

export const PromoManagement = () => {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [promoToDelete, setPromoToDelete] = useState<Promo | null>(null);

  // Form state
  const [form, setForm] = useState<PromoForm>(initialFormState);

  // Fetch promos
  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-server/admin/promos`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch promos');
      }

      const data = await response.json();
      setPromos(data.promos || []);
    } catch (err) {
      console.error('Failed to fetch promos:', err);
      toast.error('Failed to load promos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  // Filter promos
  const filteredPromos = promos.filter((promo) => {
    const matchesSearch = promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && promo.is_active) ||
      (statusFilter === 'inactive' && !promo.is_active);
    return matchesSearch && matchesStatus;
  });

  // Open editor for new promo
  const handleAddNew = () => {
    setEditingPromo(null);
    setForm(initialFormState);
    setIsEditorOpen(true);
  };

  // Open editor for existing promo
  const handleEdit = (promo: Promo) => {
    setEditingPromo(promo);
    setForm({
      code: promo.code,
      name: promo.name,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_type === 'percentage'
        ? promo.discount_value.toString()
        : (promo.discount_value / 100).toFixed(2),
      min_subtotal_dollars: (promo.min_subtotal_cents / 100).toFixed(2),
      max_discount_dollars: promo.max_discount_cents
        ? (promo.max_discount_cents / 100).toFixed(2)
        : '',
      first_time_only: promo.first_time_only,
      one_per_customer: promo.one_per_customer,
      start_date: promo.start_date.split('T')[0],
      expire_date: promo.expire_date ? promo.expire_date.split('T')[0] : '',
      usage_limit: promo.usage_limit?.toString() || '',
      is_active: promo.is_active,
    });
    setIsEditorOpen(true);
  };

  // Save promo
  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.discount_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const payload = {
        code: form.code.toUpperCase().trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        discount_type: form.discount_type,
        discount_value: form.discount_type === 'percentage'
          ? parseInt(form.discount_value)
          : Math.round(parseFloat(form.discount_value) * 100),
        min_subtotal_cents: form.min_subtotal_dollars
          ? Math.round(parseFloat(form.min_subtotal_dollars) * 100)
          : 0,
        max_discount_cents: form.max_discount_dollars
          ? Math.round(parseFloat(form.max_discount_dollars) * 100)
          : null,
        first_time_only: form.first_time_only,
        one_per_customer: form.one_per_customer,
        start_date: form.start_date,
        expire_date: form.expire_date || null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        is_active: form.is_active,
      };

      const url = editingPromo
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-server/admin/promos/${editingPromo.id}`
        : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-server/admin/promos`;

      const response = await fetch(url, {
        method: editingPromo ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save promo');
      }

      toast.success(editingPromo ? 'Promo updated' : 'Promo created');
      setIsEditorOpen(false);
      fetchPromos();
    } catch (err: any) {
      console.error('Failed to save promo:', err);
      toast.error(err.message || 'Failed to save promo');
    } finally {
      setSaving(false);
    }
  };

  // Delete promo
  const handleDelete = async () => {
    if (!promoToDelete) return;

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-server/admin/promos/${promoToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete promo');
      }

      toast.success('Promo deleted');
      setIsDeleteDialogOpen(false);
      setPromoToDelete(null);
      fetchPromos();
    } catch (err) {
      console.error('Failed to delete promo:', err);
      toast.error('Failed to delete promo');
    } finally {
      setSaving(false);
    }
  };

  // Check if promo is expired
  const isExpired = (promo: Promo) => {
    if (!promo.expire_date) return false;
    return new Date(promo.expire_date) < new Date();
  };

  // Check if promo is at usage limit
  const isAtLimit = (promo: Promo) => {
    if (!promo.usage_limit) return false;
    return promo.usage_count >= promo.usage_limit;
  };

  // Format discount display
  const formatDiscount = (promo: Promo) => {
    if (promo.discount_type === 'percentage') {
      return `${promo.discount_value}% off`;
    }
    return `$${(promo.discount_value / 100).toFixed(2)} off`;
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
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Promo Codes</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage discount codes and promotions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPromos}
            disabled={loading}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleAddNew}
            className="gap-2 rounded-xl bg-brand hover:bg-brand/90"
          >
            <Plus className="w-4 h-4" />
            Add Promo
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
            placeholder="Search promos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            paddingLeft={44}
            className="rounded-xl w-full"
          />
        </div>
        <div className="flex-shrink-0">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="rounded-xl h-11 w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Promos List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredPromos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Tag className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No promos found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery ? 'Try a different search term' : 'Create your first promo code'}
          </p>
          {!searchQuery && (
            <Button onClick={handleAddNew} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" />
              Add Promo
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredPromos.map((promo, index) => (
              <motion.div
                key={promo.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
              >
                <Card className={`rounded-2xl border-gray-100 shadow-sm hover:shadow-md transition-shadow ${
                  !promo.is_active || isExpired(promo) || isAtLimit(promo) ? 'opacity-60' : ''
                }`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          promo.discount_type === 'percentage'
                            ? 'bg-blue-100'
                            : 'bg-green-100'
                        }`}>
                          {promo.discount_type === 'percentage' ? (
                            <Percent className="w-5 h-5 text-blue-600" />
                          ) : (
                            <DollarSign className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-mono font-bold text-gray-900">{promo.code}</p>
                          <p className="text-xs text-gray-500">{promo.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg"
                          onClick={() => handleEdit(promo)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setPromoToDelete(promo);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`rounded-lg ${
                            promo.discount_type === 'percentage'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {formatDiscount(promo)}
                        </Badge>
                        {promo.max_discount_cents && (
                          <span className="text-xs text-gray-500">
                            (max ${(promo.max_discount_cents / 100).toFixed(0)})
                          </span>
                        )}
                      </div>

                      {promo.min_subtotal_cents > 0 && (
                        <p className="text-xs text-gray-500">
                          Min order: ${(promo.min_subtotal_cents / 100).toFixed(0)}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {promo.is_active ? (
                          <Badge variant="secondary" className="rounded-lg bg-emerald-50 text-emerald-700 gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-lg bg-gray-100 text-gray-600 gap-1">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </Badge>
                        )}
                        {isExpired(promo) && (
                          <Badge variant="secondary" className="rounded-lg bg-red-50 text-red-700 gap-1">
                            <Clock className="w-3 h-3" />
                            Expired
                          </Badge>
                        )}
                        {isAtLimit(promo) && (
                          <Badge variant="secondary" className="rounded-lg bg-amber-50 text-amber-700 gap-1">
                            <Users className="w-3 h-3" />
                            Limit Reached
                          </Badge>
                        )}
                        {promo.first_time_only && (
                          <Badge variant="secondary" className="rounded-lg bg-purple-50 text-purple-700">
                            First-time only
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
                        <span className="text-xs text-gray-500">
                          Used: {promo.usage_count}{promo.usage_limit ? `/${promo.usage_limit}` : ''}
                        </span>
                        {promo.expire_date && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(promo.expire_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPromo ? 'Edit Promo' : 'Create Promo'}</DialogTitle>
            <DialogDescription>
              {editingPromo ? 'Update promo code details' : 'Create a new promo code for your customers'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Code *</Label>
                <Input
                  placeholder="FRESH20"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="rounded-xl font-mono"
                  disabled={!!editingPromo}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Name *</Label>
                <Input
                  placeholder="Summer Sale"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500">Description</Label>
              <Textarea
                placeholder="20% off for first-time customers"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl resize-none"
                rows={2}
              />
            </div>

            {/* Discount Type & Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Discount Type *</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm({ ...form, discount_type: v as any, discount_value: '' })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed_amount">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">
                  {form.discount_type === 'percentage' ? 'Discount' : 'Discount'} *
                </Label>
                <div className="relative">
                  {form.discount_type === 'fixed_amount' && (
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  )}
                  <Input
                    type="number"
                    placeholder={form.discount_type === 'percentage' ? '20' : '5.00'}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    className={`rounded-xl ${form.discount_type === 'fixed_amount' ? 'pl-10' : 'pr-10'}`}
                    min="0"
                    step={form.discount_type === 'percentage' ? '1' : '0.01'}
                  />
                  {form.discount_type === 'percentage' && (
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  )}
                </div>
              </div>
            </div>

            {/* Min Subtotal & Max Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Min Subtotal</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="number"
                    placeholder="30.00"
                    value={form.min_subtotal_dollars}
                    onChange={(e) => setForm({ ...form, min_subtotal_dollars: e.target.value })}
                    className="rounded-xl pl-10"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Max Discount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="number"
                    placeholder="10.00"
                    value={form.max_discount_dollars}
                    onChange={(e) => setForm({ ...form, max_discount_dollars: e.target.value })}
                    className="rounded-xl pl-10"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Start Date *</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Expire Date</Label>
                <Input
                  type="date"
                  value={form.expire_date}
                  onChange={(e) => setForm({ ...form, expire_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Usage Limit */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-500">Usage Limit (leave empty for unlimited)</Label>
              <Input
                type="number"
                placeholder="100"
                value={form.usage_limit}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                className="rounded-xl"
                min="0"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">First-time customers only</p>
                  <p className="text-xs text-gray-500">Only users who haven't ordered before</p>
                </div>
                <Switch
                  checked={form.first_time_only}
                  onCheckedChange={(checked) => setForm({ ...form, first_time_only: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">One per customer</p>
                  <p className="text-xs text-gray-500">Each customer can only use once</p>
                </div>
                <Switch
                  checked={form.one_per_customer}
                  onCheckedChange={(checked) => setForm({ ...form, one_per_customer: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">Active</p>
                  <p className="text-xs text-gray-500">Promo can be used by customers</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditorOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingPromo ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Delete Promo
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{promoToDelete?.code}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-xl gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
