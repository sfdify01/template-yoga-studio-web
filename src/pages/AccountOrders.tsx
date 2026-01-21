import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, ArrowLeft, Clock, CheckCircle2, XCircle, Package, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useAuth } from '../lib/auth/AuthContext';
import { normalizeOrderStatus } from '../lib/state';
import type { OrderStatus } from '../lib/types';
import { cn } from '../components/ui/utils';
import { edgeFunctionBaseUrl } from '../lib/supabase-edge';
import { publicAnonKey } from '../utils/supabase/info';

interface AccountOrdersProps {
  onNavigate: (path: string) => void;
  brandColor?: string;
}

type FilterType = 'all' | 'active' | 'completed';

const formatCurrency = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `$${safeValue.toFixed(2)}`;
};

export const AccountOrders = ({ onNavigate, brandColor = '#6B0F1A' }: AccountOrdersProps) => {
  const { user, loading } = useAuth();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);

        // Use edge function endpoint to bypass RLS for guest users
        const response = await fetch(`${edgeFunctionBaseUrl}/orders/customer-lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
            apikey: publicAnonKey,
          },
          body: JSON.stringify({
            customerId: user.customerId,
            email: user.email,
            phone: user.phone,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.status}`);
        }

        const data = await response.json();
        const ordersData = data.orders || [];

        const normalized = ordersData.map((order: any) => ({
          ...order,
          status: normalizeOrderStatus(order.status),
        }));

        setOrders(normalized);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (loading || ordersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-4 relative">
            <div
              className="absolute inset-0 border-2 rounded-full animate-spin"
              style={{
                borderColor: 'transparent',
                borderTopColor: brandColor,
              }}
            />
          </div>
          <p className="text-gray-500 text-sm">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900">Sign in to view orders</h2>
              <p className="text-gray-500 text-sm">Track your order history and status.</p>
            </div>
            <Button
              onClick={() => onNavigate('/login')}
              className="w-full h-11 font-medium"
              style={{ backgroundColor: brandColor }}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBucket = (status: OrderStatus): FilterType => {
    if (status === 'delivered' || status === 'canceled') return 'completed';
    return 'active';
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'accepted':
      case 'in_kitchen':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ready':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'courier_requested':
      case 'driver_en_route':
      case 'picked_up':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'delivered':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'canceled':
        return 'bg-red-50 text-red-600 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'accepted':
      case 'in_kitchen':
      case 'courier_requested':
      case 'driver_en_route':
      case 'picked_up':
        return <Clock className="w-3 h-3" />;
      case 'ready':
      case 'delivered':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'canceled':
        return <XCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const filteredOrders = orders.filter((order) => {
    const bucket = getStatusBucket(order.status);
    if (filter !== 'all' && bucket !== filter) return false;

    if (search) {
      const searchLower = search.toLowerCase();
      return (
        order.id.toLowerCase().includes(searchLower) ||
        (order.order_items || []).some((item: any) => item.name?.toLowerCase().includes(searchLower))
      );
    }

    return true;
  });

  const activeCount = orders.filter(o => getStatusBucket(o.status) === 'active').length;
  const completedCount = orders.filter(o => getStatusBucket(o.status) === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('/account')}
                className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">My Orders</h1>
                <p className="text-xs text-gray-500">{orders.length} total orders</p>
              </div>
            </div>

            <div className="hidden sm:flex gap-2">
              <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-medium">
                {activeCount} Active
              </div>
              <div className="px-3 py-1 bg-gray-100 border border-gray-200 text-gray-600 rounded-full text-xs font-medium">
                {completedCount} Completed
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by order # or item"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10"
                  paddingLeft={44}
                />
              </div>

              <div className="flex p-1 bg-gray-100 rounded-lg">
                {(['all', 'active', 'completed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                      filter === f
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">
              {search ? 'Try a different search term' : 'Start shopping to see your orders here'}
            </p>
            {!search && (
              <Button
                onClick={() => onNavigate('/products')}
                className="h-11 px-6 font-medium"
                style={{ backgroundColor: brandColor }}
              >
                Start Shopping
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-md transition-all duration-200 group"
                  onClick={() => onNavigate(`/account/orders/${order.id}`)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${brandColor}08` }}
                      >
                        <Package className="w-5 h-5" style={{ color: brandColor }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-mono font-medium text-gray-900 text-sm">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border",
                            getStatusColor(order.status)
                          )}>
                            {getStatusIcon(order.status)}
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{(order.order_items || []).length} items</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span>
                              {new Date(order.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(order.total_cents / 100)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
