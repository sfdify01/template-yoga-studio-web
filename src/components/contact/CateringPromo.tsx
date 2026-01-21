import { Utensils } from 'lucide-react';

interface CateringPromoProps {
  brandColor?: string;
  onNavigate?: (path: string) => void;
}

export const CateringPromo = ({ brandColor = '#E4572E', onNavigate }: CateringPromoProps) => {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(path);
    }
  };

  return (
    <div 
      className="mt-6 rounded-xl border border-gray-200 p-6 shadow-sm"
      style={{ backgroundColor: '#FFF8F6' }}
    >
      <h3 
        className="flex items-center gap-2"
        role="heading" 
        aria-level={3}
      >
        <Utensils className="w-5 h-5" style={{ color: brandColor }} />
        Catering Services
      </h3>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
        Planning a special event, office lunch, or family gathering? 
        We offer full-service catering with customizable menus and delivery options. 
        Choose from our <span className="font-medium text-gray-900">Catering Menu</span> and let our team make your occasion memorable.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <a 
          href="/catering"
          onClick={(e) => handleNavClick(e, '/catering')}
          className="inline-flex items-center rounded-lg px-4 py-2 text-white text-sm transition hover:opacity-90"
          style={{ backgroundColor: brandColor }}
          aria-label="View our catering menu"
        >
          View Catering Menu
        </a>
        <a 
          href="/contact?type=catering"
          onClick={(e) => handleNavClick(e, '/contact?type=catering')}
          className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          aria-label="Request a catering quote"
        >
          Request a Quote
        </a>
      </div>
    </div>
  );
};
