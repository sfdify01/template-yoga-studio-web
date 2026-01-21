import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Star, Package, Users, Settings, LogOut, Gift, ChevronRight, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { ChangePasswordForm } from '../components/auth/ChangePasswordForm';
import { useAuth } from '../lib/auth/AuthContext';
import { supabase } from '../lib/supabase/client';

interface AccountProps {
  onNavigate: (path: string) => void;
  brandColor?: string;
}

const formatCurrency = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `$${safeValue.toFixed(2)}`;
};

const getStatusColor = (status: string) => {
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

export const Account = ({ onNavigate, brandColor = '#6B0F1A' }: AccountProps) => {
  const { user, loyaltyBalance, loading, refreshUser, signOut } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);

        // Build OR clause dynamically - only include conditions with actual values
        const conditions: string[] = [];
        if (user.email) {
          conditions.push(`contact_email.eq.${user.email}`);
        }
        if (user.phone) {
          conditions.push(`contact_phone.eq.${user.phone}`);
        }

        // If no email or phone, can't match any orders
        if (conditions.length === 0) {
          setOrders([]);
          setOrdersLoading(false);
          return;
        }

        const { data: ordersData, error } = await supabase
          .from('orders')
          .select('*')
          .or(conditions.join(','))
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setOrders(ordersData || []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  if (loading) {
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
          <p className="text-gray-500 text-sm">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="max-w-sm w-full overflow-hidden">
            <CardContent className="p-8 text-center space-y-6">
              <div
                className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${brandColor}10` }}
              >
                <Star className="w-8 h-8" style={{ color: brandColor }} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-gray-900">Welcome Back</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Sign in to view your orders, track rewards, and manage your account.
                </p>
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
        </motion.div>
      </div>
    );
  }

  const displayName = user.name || user.email || user.phone || 'Guest';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const latestOrder = orders.length > 0 ? orders[0] : null;
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="text-white" style={{ backgroundColor: brandColor }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Profile */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-4"
            >
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl font-semibold text-white">
                {initials}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-white">{displayName}</h1>
                <p className="text-white/70 text-sm mt-0.5">Member since {memberSince}</p>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-center gap-2"
            >
              <div className="px-3 py-1.5 bg-white/15 rounded-lg text-white text-sm font-medium">
                {orders.length} orders · {loyaltyBalance.toLocaleString()} pts
              </div>
              <Button
                onClick={signOut}
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white hover:bg-white/15"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 space-y-6">
        {/* Loyalty Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card
            className="cursor-pointer hover:shadow-lg transition-shadow duration-300 overflow-hidden"
            onClick={() => onNavigate('/account/rewards')}
          >
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${brandColor}10` }}
                  >
                    <Star className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: brandColor, fill: `${brandColor}30` }} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500 text-xs uppercase tracking-wider font-medium">Your Balance</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-bold leading-none" style={{ color: brandColor }}>
                        {loyaltyBalance.toLocaleString()}
                      </span>
                      <span className="text-gray-400 font-medium text-sm">points</span>
                    </div>
                  </div>
                </div>
                <Button
                  className="h-11 px-5 font-medium shadow-sm w-full sm:w-auto"
                  style={{ backgroundColor: brandColor }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Redeem Rewards
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              icon: Package,
              title: 'My Orders',
              subtitle: 'Track and view history',
              path: '/account/orders',
              color: '#3b82f6',
              delay: 0.2,
            },
            {
              icon: Users,
              title: 'Refer Friends',
              subtitle: 'Earn bonus points',
              path: '/account/referrals',
              color: '#10b981',
              delay: 0.25,
            },
            {
              icon: Settings,
              title: 'Profile',
              subtitle: 'Manage your details',
              onClick: () => setIsEditDialogOpen(true),
              color: '#f59e0b',
              delay: 0.3,
            },
            {
              icon: ShieldCheck,
              title: 'Security',
              subtitle: 'Change password',
              onClick: () => setIsPasswordDialogOpen(true),
              color: '#8b5cf6',
              delay: 0.35,
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: item.delay }}
            >
              <Card
                className="h-full cursor-pointer hover:shadow-md transition-all duration-200 group"
                onClick={item.onClick || (() => onNavigate(item.path!))}
              >
                <CardContent className="p-5 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                      style={{ backgroundColor: `${item.color}10` }}
                    >
                      <item.icon className="w-5 h-5" style={{ color: item.color }} strokeWidth={1.5} />
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all duration-200" />
                  </div>
                  <div className="mt-auto">
                    <h3 className="font-medium text-gray-900 mb-0.5">{item.title}</h3>
                    <p className="text-gray-500 text-sm">{item.subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Latest Order */}
        {latestOrder && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-gray-900">Latest Order</h2>
              <Button
                variant="link"
                onClick={() => onNavigate('/account/orders')}
                className="text-gray-500 hover:text-gray-900 p-0 h-auto text-sm font-medium"
              >
                View All <ChevronRight className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow duration-200 group"
              onClick={() => onNavigate(`/account/orders/${latestOrder.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${brandColor}08` }}
                  >
                    <Gift className="w-6 h-6" style={{ color: brandColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="font-mono font-medium text-gray-900">
                        #{latestOrder.id.slice(-6).toUpperCase()}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(latestOrder.status)}`}>
                        {latestOrder.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(latestOrder.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(latestOrder.total_cents / 100)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md p-0 gap-0 rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your account information</DialogDescription>
          </DialogHeader>
          <ProfileEditForm
            user={user}
            brandColor={brandColor}
            onSuccess={async () => {
              setIsEditDialogOpen(false);
              if (refreshUser) {
                await refreshUser();
              }
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md p-0 gap-0 rounded-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Update your account password</DialogDescription>
          </DialogHeader>
          <ChangePasswordForm
            brandColor={brandColor}
            onSuccess={() => setIsPasswordDialogOpen(false)}
            onCancel={() => setIsPasswordDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
