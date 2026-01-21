import { MapPin, Navigation } from 'lucide-react';
import { Button } from './ui/button';

interface MapCardProps {
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  brandColor: string;
}

export const MapCard = ({ address, brandColor }: MapCardProps) => {
  const getDirectionsUrl = () => {
    const fullAddress = `${address.line1}, ${address.city}, ${address.state} ${address.zip}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
  };

  const getEmbedUrl = () => {
    // Using Google Maps embed with place query (no API key required)
    const fullAddress = `${address.line1}, ${address.city}, ${address.state} ${address.zip}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border">
      <div className="aspect-[16/9] bg-gray-100 relative">
        {/* Google Maps Embed */}
        <iframe
          src={getEmbedUrl()}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Shahirzada Fresh Market Location"
        />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-600" />
            <div>
              <p className="text-sm">
                {address.line1}<br />
                {address.city}, {address.state} {address.zip}
              </p>
            </div>
          </div>
          <a href={getDirectionsUrl()} target="_blank" rel="noopener noreferrer">
            <Button 
              size="sm"
              className="text-white hover:opacity-90 flex-shrink-0"
              style={{ backgroundColor: brandColor }}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Directions
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};
