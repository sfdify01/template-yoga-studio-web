import { Menu, X, Phone, User, LogIn, Package, Star, Users, LogOut, Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { useAuth } from '../lib/auth/AuthContext';
import { Avatar } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { BrandLogo } from './BrandLogo';

interface NavigationWithAccountProps {
  brandName: string;
  brandColor: string;
  phone: string;
  onNavigate: (path: string) => void;
  currentPath: string;
  hasAnnouncementBar?: boolean;
  topOffset?: number;
}

export const NavigationWithAccount = ({ 
  brandName, 
  brandColor, 
  phone, 
  onNavigate, 
  currentPath,
  hasAnnouncementBar = false,
  topOffset
}: NavigationWithAccountProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [trackOrderNumber, setTrackOrderNumber] = useState('');
  const { user, loyaltyBalance, signOut } = useAuth();
  const navTop = typeof topOffset === 'number'
    ? `${topOffset}px`
    : hasAnnouncementBar
      ? '40px'
      : '0';

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Products', path: '/products' },
    { label: 'Loyalty', path: '/loyalty' },
    { label: 'About', path: '/about' },
    { label: 'Blog', path: '/blog' },
    { label: 'Contact', path: '/contact' },
  ];

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    handleNavigate('/');
  };

  const handleTrackOrder = () => {
    if (trackOrderNumber.trim()) {
      setTrackDialogOpen(false);
      handleNavigate(`/track/${trackOrderNumber.trim()}`);
      setTrackOrderNumber('');
    }
  };

  const getInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    if (user?.phone) {
      return 'U';
    }
    return '?';
  };

  return (
    <>
      <nav 
        className="bg-white border-b fixed left-0 right-0 w-full z-50 shadow-sm h-16 sm:h-20 transition-[top] duration-250 ease-in-out"
        style={{ top: navTop }}
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-full">
          <div className="flex justify-between items-center h-full">
            {/* Logo */}
            <button 
              onClick={() => handleNavigate('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
            >
              <BrandLogo brandName={brandName} size="sm" />
              <span className="text-base sm:text-lg font-bold truncate max-w-[180px] sm:max-w-none">{brandName}</span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`hover:opacity-70 transition-opacity ${
                    currentPath === item.path ? 'border-b-2' : ''
                  }`}
                  style={currentPath === item.path ? { borderColor: brandColor } : {}}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {/* Track Order */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setTrackDialogOpen(true)}
              >
                <Package className="w-4 h-4 mr-2" />
                Track
              </Button>

              <a href={`tel:${phone}`}>
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </a>

              {/* Account Menu or Login */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: brandColor }}
                      >
                        {getInitials()}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-2">
                      <p className="text-sm font-medium">{user.name || user.email || user.phone}</p>
                      <p className="text-xs text-gray-500 mt-1">{loyaltyBalance} ⭐ stars</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleNavigate('/account')}>
                      <User className="w-4 h-4 mr-2" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigate('/account/orders')}>
                      <Package className="w-4 h-4 mr-2" />
                      Orders
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigate('/account/rewards')}>
                      <Star className="w-4 h-4 mr-2" />
                      Rewards
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleNavigate('/account/referrals')}>
                      <Users className="w-4 h-4 mr-2" />
                      Referrals
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigate('/login')}
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Log in
                </Button>
              )}

              <Button 
                size="sm"
                style={{ backgroundColor: brandColor }}
                className="text-white hover:opacity-90"
                onClick={() => handleNavigate('/products')}
              >
                Order Now
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-4 space-y-3">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`block w-full text-left py-2 px-4 rounded-2xl transition-colors ${
                    currentPath === item.path ? 'bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {user && (
                <>
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium px-4 py-2">{user.name || user.email || user.phone}</p>
                    <p className="text-xs text-gray-500 px-4">{loyaltyBalance} ⭐ stars</p>
                  </div>
                  <button
                    onClick={() => handleNavigate('/account')}
                    className="block w-full text-left py-2 px-4 rounded-2xl hover:bg-gray-50"
                  >
                    <User className="w-4 h-4 mr-2 inline" />
                    Account
                  </button>
                  <button
                    onClick={() => handleNavigate('/account/orders')}
                    className="block w-full text-left py-2 px-4 rounded-2xl hover:bg-gray-50"
                  >
                    <Package className="w-4 h-4 mr-2 inline" />
                    Orders
                  </button>
                  <button
                    onClick={() => handleNavigate('/account/rewards')}
                    className="block w-full text-left py-2 px-4 rounded-2xl hover:bg-gray-50"
                  >
                    <Star className="w-4 h-4 mr-2 inline" />
                    Rewards
                  </button>
                  <button
                    onClick={() => handleNavigate('/account/referrals')}
                    className="block w-full text-left py-2 px-4 rounded-2xl hover:bg-gray-50"
                  >
                    <Users className="w-4 h-4 mr-2 inline" />
                    Referrals
                  </button>
                </>
              )}

              <div className="pt-3 border-t space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setTrackDialogOpen(true);
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Track Order
                </Button>

                <a href={`tel:${phone}`} className="block">
                  <Button variant="outline" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                </a>

                {user ? (
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => handleNavigate('/login')}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Log in
                  </Button>
                )}

                <Button 
                  className="w-full text-white"
                  style={{ backgroundColor: brandColor }}
                  onClick={() => handleNavigate('/products')}
                >
                  Order Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Track Order Dialog */}
      <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Track Your Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter your order number to see real-time status updates
            </p>
            <div>
              <Input
                placeholder="Enter order number or last 6 digits"
                value={trackOrderNumber}
                onChange={(e) => setTrackOrderNumber(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTrackOrder();
                  }
                }}
              />
            </div>
            <Button
              className="w-full text-white"
              style={{ backgroundColor: brandColor }}
              onClick={handleTrackOrder}
              disabled={!trackOrderNumber.trim()}
            >
              <Search className="w-4 h-4 mr-2" />
              Track Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
