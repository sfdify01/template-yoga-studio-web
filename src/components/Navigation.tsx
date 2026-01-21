import { Menu, X, Phone } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { BrandLogo } from './BrandLogo';

interface NavigationProps {
  brandName: string;
  brandColor: string;
  phone: string;
  onNavigate: (path: string) => void;
  currentPath: string;
}

export const Navigation = ({ brandName, brandColor, phone, onNavigate, currentPath }: NavigationProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Products', path: '/products' },
    { label: 'About', path: '/about' },
    { label: 'Blog', path: '/blog' },
    { label: 'Contact', path: '/contact' },
  ];

  const handleNavigate = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <button 
              onClick={() => handleNavigate('/')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <BrandLogo brandName={brandName} size="sm" />
              <span className="text-lg font-bold">{brandName}</span>
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
              <a href={`tel:${phone}`}>
                <Button variant="outline" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </a>
              <Button 
                size="sm"
                style={{ backgroundColor: brandColor }}
                className="text-white hover:opacity-90"
                onClick={() => handleNavigate('/order')}
              >
                Order Now
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-2xl transition-colors"
              aria-label="Toggle menu"
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
              <div className="pt-3 border-t space-y-2">
                <a href={`tel:${phone}`} className="block">
                  <Button variant="outline" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                </a>
                <Button 
                  className="w-full text-white"
                  style={{ backgroundColor: brandColor }}
                  onClick={() => handleNavigate('/order')}
                >
                  Order Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};
