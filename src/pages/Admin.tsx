import { useAtomValue } from 'jotai';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '../components/ui/button';
import {
  adminSessionLoadableAtom,
} from '../atoms/admin/ordersAtoms';
import { AdminOrders } from './admin/AdminOrders';
import { ProductManagement } from './admin/ProductManagement';
import { PromoManagement } from './admin/PromoManagement';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { LoginForm } from '../components/auth/LoginForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { supabase } from '../lib/supabase/client';
import {
  Loader2, ShieldAlert, Eye, EyeOff, Check, KeyRound,
  LayoutDashboard, ShoppingBag, Users, Settings, LogOut,
  DollarSign, Package, ChevronRight,
  RefreshCw, Store, AlertCircle,
  Activity, CreditCard, MapPin, ExternalLink, PanelLeftClose, PanelLeft,
  TrendingUp, Clock, Tag, Menu, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { assignRole, resetUserPassword } from '../lib/admin/users-api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from '../components/BrandLogo';
import { NotificationSettings } from '../components/admin/NotificationSettings';

type AdminTab = 'dashboard' | 'orders' | 'products' | 'promos' | 'settings';

// User role options for dropdown
const USER_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to manage store' },
  { value: 'client', label: 'Client', description: 'Customer account' },
] as const;

// Map URL paths to tabs
const pathToTab: Record<string, AdminTab> = {
  '/admin': 'dashboard',
  '/admin/dashboard': 'dashboard',
  '/admin/orders': 'orders',
  '/admin/products': 'products',
  '/admin/promos': 'promos',
  '/admin/settings': 'settings',
};

const tabToPath: Record<AdminTab, string> = {
  dashboard: '/admin',
  orders: '/admin/orders',
  products: '/admin/products',
  promos: '/admin/promos',
  settings: '/admin/settings',
};

// Dashboard stats fetcher - uses Stripe as source of truth via backend API
const useDashboardStats = () => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      // Fetch from backend API which uses Stripe as source of truth
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-server/admin/stats`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats({
          totalOrders: data.totalOrders || 0,
          activeOrders: data.activeOrders || 0,
          todayOrders: data.todayOrders || 0,
          totalRevenue: data.totalRevenue || 0,
          todayRevenue: data.todayRevenue || 0,
          totalCustomers: data.totalCustomers || 0,
          avgOrderValue: data.avgOrderValue || 0,
        });
      } else {
        // Fallback to direct Supabase query
        const { data: ordersData } = await supabase
          .from('orders')
          .select('total_cents, payment_status, status, created_at');

        const { data: customersData } = await supabase
          .from('customers')
          .select('id');

        if (ordersData) {
          const today = new Date().toISOString().split('T')[0];
          const paidOrders = ordersData.filter(o => o.payment_status === 'paid');
          const todayPaidOrders = paidOrders.filter(o => o.created_at?.startsWith(today));
          const activeOrders = ordersData.filter(o =>
            !['delivered', 'canceled', 'failed', 'rejected'].includes(o.status)
          );

          setStats({
            totalOrders: ordersData.length,
            activeOrders: activeOrders.length,
            todayOrders: ordersData.filter(o => o.created_at?.startsWith(today)).length,
            totalRevenue: paidOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100,
            todayRevenue: todayPaidOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100,
            totalCustomers: customersData?.length || 0,
            avgOrderValue: paidOrders.length > 0
              ? paidOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0) / paidOrders.length / 100
              : 0,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { stats, loading, refresh };
};

// Stat Card with refined design
const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    className="group relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-default overflow-hidden"
  >
    {/* Subtle gradient overlay on hover */}
    <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

    <div className="relative flex items-start justify-between gap-2">
      <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
        <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider truncate">{title}</p>
        <p className="text-xl sm:text-3xl font-bold text-gray-900 tracking-tight truncate">{value}</p>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 truncate">
            {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
            {subtitle}
          </p>
        )}
      </div>
      <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-gray-900 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
    </div>
  </motion.div>
);

// Sidebar Nav Item with better feedback
const SidebarNavItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  collapsed
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  collapsed: boolean;
}) => (
  <motion.button
    onClick={onClick}
    title={collapsed ? label : undefined}
    whileTap={{ scale: 0.97 }}
    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
      active
        ? 'bg-white text-gray-900 shadow-md'
        : 'text-gray-400 hover:text-white hover:bg-white/8'
    } ${collapsed ? 'justify-center' : ''}`}
  >
    {active && (
      <motion.div
        layoutId="activeTab"
        className="absolute inset-0 bg-white rounded-xl shadow-md"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
      />
    )}
    <span className={`relative z-10 ${active ? 'text-gray-900' : ''}`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
    </span>
    {!collapsed && (
      <span className={`relative z-10 flex-1 font-medium text-sm ${active ? 'text-gray-900' : ''}`}>
        {label}
      </span>
    )}
    {!collapsed && badge !== undefined && badge > 0 && (
      <span className={`relative z-10 text-[10px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center ${
        active ? 'bg-amber-100 text-amber-700' : 'bg-amber-500 text-white'
      }`}>
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    {collapsed && badge !== undefined && badge > 0 && (
      <span className="absolute -top-1 -right-1 w-5 h-5 text-[10px] font-bold bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </motion.button>
);

// Dashboard Overview with refined cards
const DashboardOverview = ({ onViewOrders }: { onViewOrders: () => void }) => {
  const { stats, loading, refresh } = useDashboardStats();

  return (
    <div className="space-y-6 sm:space-y-10 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">Store performance overview</p>
        </div>
        <Button
          size="sm"
          onClick={refresh}
          disabled={loading}
          variant="outline"
          className="gap-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
        <StatCard
          title="Revenue"
          value={`$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
          subtitle={`+$${stats.todayRevenue.toFixed(0)} today`}
          icon={DollarSign}
          trend="up"
          delay={0}
        />
        <StatCard
          title="Orders"
          value={stats.totalOrders}
          subtitle={`${stats.todayOrders} today`}
          icon={ShoppingBag}
          delay={0.05}
        />
        <StatCard
          title="Active"
          value={stats.activeOrders}
          subtitle="Pending orders"
          icon={Activity}
          delay={0.1}
        />
        <StatCard
          title="Avg Order"
          value={`$${stats.avgOrderValue.toFixed(0)}`}
          subtitle={`${stats.totalCustomers} customers`}
          icon={CreditCard}
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 lg:gap-8">
        {/* Manage Orders Card - Brand colors */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
          whileTap={{ scale: 0.99 }}
          onClick={onViewOrders}
          className="relative text-left rounded-2xl p-6 overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, #6B0F1A 0%, #8B1A2A 50%, #4A0A12 100%)',
          }}
        >
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-amber-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10 group-hover:bg-white/15 transition-colors duration-300">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 group-hover:translate-x-1 transition-all duration-300">
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Manage Orders</h3>
            <p className="text-white/70 text-sm flex items-center gap-2">
              {stats.activeOrders > 0 ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {stats.activeOrders} orders need attention
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  All caught up!
                </>
              )}
            </p>
          </div>
        </motion.button>

        {/* Your Store Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between mb-5">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Store className="w-7 h-7 text-gray-600" />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open('/', '_blank')}
              className="gap-1.5 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
            >
              Open <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Your Store</h3>
          <p className="text-gray-500 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Naperville, IL
          </p>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Open now
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Closes 9 PM</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Settings Panel
const SettingsPanel = () => {
  const [roleEmail, setRoleEmail] = useState('');
  const [roleValue, setRoleValue] = useState('admin');
  const [roleAction, setRoleAction] = useState<'add' | 'remove'>('add');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState(false);

  const [myCurrentPassword, setMyCurrentPassword] = useState('');
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [showMyCurrentPassword, setShowMyCurrentPassword] = useState(false);
  const [showMyNewPassword, setShowMyNewPassword] = useState(false);
  const [myPasswordLoading, setMyPasswordLoading] = useState(false);
  const [myPasswordError, setMyPasswordError] = useState<string | null>(null);

  // Current user info for notifications
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({ id: user.id, email: user.email || '' });
      }
    });
  }, []);

  const handleChangeMyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myNewPassword !== myConfirmPassword) {
      setMyPasswordError('Passwords do not match');
      return;
    }
    if (myNewPassword.length < 8) {
      setMyPasswordError('Password must be at least 8 characters');
      return;
    }

    setMyPasswordError(null);
    setMyPasswordLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Unable to verify your account');

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: myCurrentPassword,
      });
      if (verifyError) throw new Error('Current password is incorrect');

      const { error: updateError } = await supabase.auth.updateUser({ password: myNewPassword });
      if (updateError) throw updateError;

      toast.success('Your password has been updated');
      setMyCurrentPassword('');
      setMyNewPassword('');
      setMyConfirmPassword('');
    } catch (err: any) {
      setMyPasswordError(err.message || 'Failed to update password');
    } finally {
      setMyPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h2>
        <p className="text-gray-500 text-sm mt-0.5">Manage admin users and security</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Assign Role</CardTitle>
                  <CardDescription>Add or remove admin access</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">User Email</Label>
                <Input
                  placeholder="user@example.com"
                  value={roleEmail}
                  onChange={(e) => setRoleEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">Role</Label>
                <Select value={roleValue} onValueChange={setRoleValue}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{role.label}</span>
                          <span className="text-xs text-gray-400">- {role.description}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={roleAction === 'add' ? 'default' : 'outline'}
                  onClick={() => setRoleAction('add')}
                  className="flex-1 rounded-xl"
                >
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={roleAction === 'remove' ? 'destructive' : 'outline'}
                  onClick={() => setRoleAction('remove')}
                  className="flex-1 rounded-xl"
                >
                  Remove
                </Button>
              </div>
              <Button
                className="w-full rounded-xl active:scale-[0.98] transition-transform"
                disabled={adminActionLoading || !roleEmail}
                onClick={async () => {
                  setAdminActionMessage(null);
                  setAdminActionLoading(true);
                  try {
                    const res = await assignRole({ email: roleEmail, role: roleValue, action: roleAction });
                    setAdminActionMessage(`Success. Roles: ${res.roles.join(', ') || 'none'}`);
                    toast.success('Role updated');
                  } catch (err: any) {
                    setAdminActionMessage(err.message || 'Failed');
                    toast.error(err.message || 'Failed');
                  } finally {
                    setAdminActionLoading(false);
                  }
                }}
              >
                {adminActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Role'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Reset User Password</CardTitle>
                  <CardDescription>Set new password for any user</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">User Email</Label>
                <Input
                  placeholder="user@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-500">New Password</Label>
                <Input
                  type="password"
                  placeholder="New password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <Button
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition-all"
                disabled={adminActionLoading || !resetEmail || !resetPassword}
                onClick={async () => {
                  setAdminActionMessage(null);
                  setAdminActionLoading(true);
                  try {
                    await resetUserPassword({ email: resetEmail, password: resetPassword });
                    setAdminActionMessage('Password reset successfully');
                    toast.success('Password reset');
                    setResetPassword('');
                  } catch (err: any) {
                    setAdminActionMessage(err.message || 'Failed');
                    toast.error(err.message || 'Failed');
                  } finally {
                    setAdminActionLoading(false);
                  }
                }}
              >
                {adminActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Push Notifications */}
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <NotificationSettings
              userId={currentUser.id}
              email={currentUser.email}
              brandColor="#6B0F1A"
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="rounded-2xl border-gray-100 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Change My Password</CardTitle>
                  <CardDescription>Update your admin password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangeMyPassword} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">Current Password</Label>
                    <div className="relative">
                      <Input
                        type={showMyCurrentPassword ? 'text' : 'password'}
                        placeholder="Current password"
                        value={myCurrentPassword}
                        onChange={(e) => { setMyCurrentPassword(e.target.value); setMyPasswordError(null); }}
                        className="pr-10 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowMyCurrentPassword(!showMyCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showMyCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">New Password</Label>
                    <div className="relative">
                      <Input
                        type={showMyNewPassword ? 'text' : 'password'}
                        placeholder="Min 8 characters"
                        value={myNewPassword}
                        onChange={(e) => { setMyNewPassword(e.target.value); setMyPasswordError(null); }}
                        className="pr-10 rounded-xl"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowMyNewPassword(!showMyNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showMyNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500">Confirm Password</Label>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      value={myConfirmPassword}
                      onChange={(e) => { setMyConfirmPassword(e.target.value); setMyPasswordError(null); }}
                      className="rounded-xl"
                      required
                    />
                    {myConfirmPassword && myNewPassword && (
                      <p className={`text-xs flex items-center gap-1 ${myNewPassword === myConfirmPassword ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {myNewPassword === myConfirmPassword && <Check className="w-3 h-3" />}
                        {myNewPassword === myConfirmPassword ? 'Passwords match' : 'Passwords do not match'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  {myPasswordError && (
                    <p className="flex-1 text-sm text-red-600 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      {myPasswordError}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="ml-auto rounded-xl active:scale-[0.98] transition-transform"
                    disabled={myPasswordLoading || !myCurrentPassword || !myNewPassword || myNewPassword !== myConfirmPassword}
                  >
                    {myPasswordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {adminActionMessage && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-center text-gray-600 bg-gray-100 rounded-xl px-4 py-3"
        >
          {adminActionMessage}
        </motion.p>
      )}
    </div>
  );
};

export const Admin = () => {
  const sessionState = useAtomValue(adminSessionLoadableAtom);

  // Custom routing using window.location and history API
  const [currentPath, setCurrentPath] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/admin'
  );

  const [activeOrders, setActiveOrders] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get active tab from URL
  const activeTab: AdminTab = pathToTab[currentPath] || 'dashboard';

  // Navigate to tab - updates URL without page reload
  const setActiveTab = useCallback((tab: AdminTab) => {
    const newPath = tabToPath[tab];
    window.history.pushState({}, '', newPath);
    setCurrentPath(newPath);
    setMobileMenuOpen(false); // Close mobile menu on navigation
  }, []);

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const fetchActiveOrders = async () => {
      try {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .not('status', 'in', '("delivered","canceled","failed","rejected")');
        setActiveOrders(count || 0);
      } catch (err) {
        console.error('Failed to fetch active orders:', err);
      }
    };
    fetchActiveOrders();

    const channel = supabase
      .channel('orders-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchActiveOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Loading State
  if (sessionState.state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Checking access...</p>
        </motion.div>
      </div>
    );
  }

  // Error State
  if (sessionState.state === 'hasError') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Session Error</h1>
          <p className="text-gray-500 mb-6">{(sessionState.error as Error)?.message || 'Please try again.'}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.assign('/login')} className="rounded-xl">Go to Login</Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="rounded-xl">Retry</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not Admin - Login Page
  if (!sessionState.data?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <BrandLogo brandName="Shahirizada" size="sm" className="h-10" />
            <Button variant="outline" onClick={() => window.location.assign('/')} className="gap-2 rounded-xl">
              <Store className="w-4 h-4" />
              Visit Store
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', bounce: 0.4 }}
                  className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center mx-auto mb-4 shadow-lg"
                >
                  <ShieldAlert className="w-8 h-8 text-white" />
                </motion.div>
                <h1 className="text-2xl font-bold text-gray-900">Merchant Console</h1>
                <p className="text-gray-500 mt-1">Sign in to manage your store</p>
              </div>

              <LoginForm
                adminOnly={true}
                brandColor="#6B0F1A"
                onSuccess={() => window.location.reload()}
              />

              <p className="text-center text-xs text-gray-400 mt-6">
                Admin access required. Contact support if you need help.
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // Main Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - visible on small screens */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#0f172a] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-white">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'orders' && 'Orders'}
              {activeTab === 'products' && 'Products'}
              {activeTab === 'promos' && 'Promos'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <p className="text-[10px] text-gray-400">Merchant Console</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open('/', '_blank')}
          className="text-white hover:bg-white/10 rounded-lg h-9 px-3"
        >
          <Store className="w-4 h-4" />
        </Button>
      </header>

      {/* Mobile Slide-out Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
            />
            {/* Slide-out Menu */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-[#0f172a] z-50 flex flex-col"
            >
              {/* Menu Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <BrandLogo brandName="Shahirizada" size="sm" className="h-7 brightness-0 invert" />
                  <p className="text-[10px] text-gray-500 mt-1 font-medium tracking-wide">MERCHANT CONSOLE</p>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                <SidebarNavItem
                  icon={LayoutDashboard}
                  label="Dashboard"
                  active={activeTab === 'dashboard'}
                  onClick={() => setActiveTab('dashboard')}
                  collapsed={false}
                />
                <SidebarNavItem
                  icon={ShoppingBag}
                  label="Orders"
                  active={activeTab === 'orders'}
                  onClick={() => setActiveTab('orders')}
                  badge={activeOrders}
                  collapsed={false}
                />
                <SidebarNavItem
                  icon={Package}
                  label="Products"
                  active={activeTab === 'products'}
                  onClick={() => setActiveTab('products')}
                  collapsed={false}
                />
                <SidebarNavItem
                  icon={Tag}
                  label="Promos"
                  active={activeTab === 'promos'}
                  onClick={() => setActiveTab('promos')}
                  collapsed={false}
                />
                <SidebarNavItem
                  icon={Settings}
                  label="Settings"
                  active={activeTab === 'settings'}
                  onClick={() => setActiveTab('settings')}
                  collapsed={false}
                />
              </nav>

              {/* Mobile Sign Out */}
              <div className="p-3 border-t border-white/10">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </motion.button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Layout with Grid */}
      <div
        className="min-h-screen max-lg:hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: sidebarCollapsed ? '72px 1fr' : '256px 1fr',
          transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Desktop Sidebar */}
        <aside className="bg-[#0f172a] min-h-screen flex flex-col relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

          {/* Logo */}
          <div className={`relative z-10 p-5 border-b border-white/10 ${sidebarCollapsed ? 'flex justify-center' : ''}`}>
            {sidebarCollapsed ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
              >
                <span className="text-white font-bold text-lg">S</span>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <BrandLogo brandName="Shahirizada" size="sm" className="h-8 brightness-0 invert" />
                <p className="text-[11px] text-gray-500 mt-2 font-medium tracking-wide">MERCHANT CONSOLE</p>
              </motion.div>
            )}
          </div>

          {/* Navigation */}
          <nav className="relative z-10 flex-1 p-3 space-y-1">
            <SidebarNavItem
              icon={LayoutDashboard}
              label="Dashboard"
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              collapsed={sidebarCollapsed}
            />
            <SidebarNavItem
              icon={ShoppingBag}
              label="Orders"
              active={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
              badge={activeOrders}
              collapsed={sidebarCollapsed}
            />
            <SidebarNavItem
              icon={Package}
              label="Products"
              active={activeTab === 'products'}
              onClick={() => setActiveTab('products')}
              collapsed={sidebarCollapsed}
            />
            <SidebarNavItem
              icon={Tag}
              label="Promos"
              active={activeTab === 'promos'}
              onClick={() => setActiveTab('promos')}
              collapsed={sidebarCollapsed}
            />
            <SidebarNavItem
              icon={Settings}
              label="Settings"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              collapsed={sidebarCollapsed}
            />
          </nav>

          {/* Collapse Toggle */}
          <div className="relative z-10 p-3 border-t border-white/10">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all duration-200"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <>
                  <PanelLeftClose className="w-5 h-5" />
                  <span className="text-sm font-medium">Collapse</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Sign Out */}
          <div className={`relative z-10 p-3 border-t border-white/10 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleLogout}
              title={sidebarCollapsed ? 'Sign Out' : undefined}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/8 transition-all duration-200 ${
                sidebarCollapsed ? 'w-full justify-center' : 'w-full'
              }`}
            >
              <LogOut className="w-4 h-4" />
              {!sidebarCollapsed && <span className="text-sm font-medium">Sign Out</span>}
            </motion.button>
          </div>
        </aside>

        {/* Desktop Main Content Area */}
        <main className="flex flex-col min-h-screen overflow-hidden">
          {/* Desktop Top Bar */}
          <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-sm">
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'orders' && 'Orders'}
                {activeTab === 'products' && 'Products'}
                {activeTab === 'promos' && 'Promos'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.open('/', '_blank')}
              className="gap-2 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
            >
              <Store className="w-4 h-4" />
              View Store
            </Button>
          </header>

          {/* Desktop Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <DashboardOverview onViewOrders={() => setActiveTab('orders')} />
                </motion.div>
              )}
              {activeTab === 'orders' && (
                <motion.div
                  key="orders"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <AdminOrders />
                </motion.div>
              )}
              {activeTab === 'products' && (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <ProductManagement />
                </motion.div>
              )}
              {activeTab === 'promos' && (
                <motion.div
                  key="promos"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <PromoManagement />
                </motion.div>
              )}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <SettingsPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Content Area */}
      <main className="lg:hidden pt-16 pb-20 min-h-screen">
        <div className="p-4">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard-mobile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardOverview onViewOrders={() => setActiveTab('orders')} />
              </motion.div>
            )}
            {activeTab === 'orders' && (
              <motion.div
                key="orders-mobile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <AdminOrders />
              </motion.div>
            )}
            {activeTab === 'products' && (
              <motion.div
                key="products-mobile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <ProductManagement />
              </motion.div>
            )}
            {activeTab === 'promos' && (
              <motion.div
                key="promos-mobile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <PromoManagement />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div
                key="settings-mobile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <SettingsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-2 py-2 safe-area-pb">
        <div className="flex items-center justify-around">
          {[
            { tab: 'dashboard' as AdminTab, icon: LayoutDashboard, label: 'Home' },
            { tab: 'orders' as AdminTab, icon: ShoppingBag, label: 'Orders', badge: activeOrders },
            { tab: 'products' as AdminTab, icon: Package, label: 'Products' },
            { tab: 'promos' as AdminTab, icon: Tag, label: 'Promos' },
            { tab: 'settings' as AdminTab, icon: Settings, label: 'Settings' },
          ].map(({ tab, icon: Icon, label, badge }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                activeTab === tab
                  ? 'text-brand'
                  : 'text-gray-400 active:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge !== undefined && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
              {activeTab === tab && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -bottom-1 w-8 h-0.5 bg-brand rounded-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
