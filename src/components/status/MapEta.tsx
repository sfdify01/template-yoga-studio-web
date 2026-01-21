import { useState, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from '../ui/button';

interface MapEtaProps {
  driverLocation?: { lat: number; lng: number };
  deliveryLocation: { lat: number; lng: number };
  eta?: string;
  trackingUrl?: string;
}

export const MapEta = ({
  driverLocation,
  deliveryLocation,
  eta,
  trackingUrl,
}: MapEtaProps) => {
  const [simulatedDriver, setSimulatedDriver] = useState(driverLocation);

  // Simulate driver movement for demo
  useEffect(() => {
    if (!driverLocation) return;

    const interval = setInterval(() => {
      setSimulatedDriver((prev) => {
        if (!prev) return driverLocation;
        
        // Move slightly towards delivery location
        const latDiff = (deliveryLocation.lat - prev.lat) * 0.1;
        const lngDiff = (deliveryLocation.lng - prev.lng) * 0.1;
        
        return {
          lat: prev.lat + latDiff,
          lng: prev.lng + lngDiff,
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [driverLocation, deliveryLocation]);

  return (
    <div className="space-y-4">
      {/* Map placeholder */}
      <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Live tracking map</p>
            {eta && (
              <p className="text-lg mt-2">
                ETA: <span className="font-medium">{eta}</span>
              </p>
            )}
          </div>
        </div>

        {/* Simulated markers */}
        {simulatedDriver && (
          <div
            className="absolute w-8 h-8 bg-blue-500 rounded-full border-4 border-white shadow-lg"
            style={{
              top: '30%',
              left: '40%',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            <Navigation className="w-4 h-4 text-white" />
          </div>
        )}
        <div
          className="absolute w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg"
          style={{ top: '60%', left: '70%' }}
        >
          <MapPin className="w-4 h-4 text-white" />
        </div>
      </div>

      {trackingUrl && (
        <Button
          variant="outline"
          className="w-full rounded-2xl"
          onClick={() => window.open(trackingUrl, '_blank')}
        >
          <Navigation className="w-4 h-4 mr-2" />
          Track on Map
        </Button>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};
