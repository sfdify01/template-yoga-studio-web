import { useState } from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { MapPin, Loader2 } from 'lucide-react';

interface Address {
  address: string;
  lat: number;
  lng: number;
  instructions?: string;
}

interface AddressFormProps {
  onResolve: (address: Address) => void;
  initialAddress?: Address;
  storeLocation: { lat: number; lng: number };
  maxDistance?: number;
}

export const AddressForm = ({
  onResolve,
  initialAddress,
  storeLocation,
  maxDistance = 10,
}: AddressFormProps) => {
  const [address, setAddress] = useState(initialAddress?.address || '');
  const [instructions, setInstructions] = useState(initialAddress?.instructions || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeocode = async () => {
    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Mock geocoding - in production, use Google Maps Geocoding API
      // const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      // const data = await response.json();
      
      // Mock coordinates for demo
      const mockLat = storeLocation.lat + (Math.random() - 0.5) * 0.1;
      const mockLng = storeLocation.lng + (Math.random() - 0.5) * 0.1;
      
      // Calculate distance
      const distance = calculateDistance(
        mockLat,
        mockLng,
        storeLocation.lat,
        storeLocation.lng
      );

      if (distance > maxDistance) {
        setError(`Sorry, this address is outside our delivery zone (${maxDistance} miles)`);
        setLoading(false);
        return;
      }

      onResolve({
        address: address.trim(),
        lat: mockLat,
        lng: mockLng,
        instructions: instructions.trim() || undefined,
      });
    } catch (err) {
      setError('Failed to verify address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="address" className="text-sm font-medium">Street Address *</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, City, State ZIP"
            className="rounded-xl flex-1 h-11"
            onKeyDown={(e) => e.key === 'Enter' && handleGeocode()}
          />
          <Button
            onClick={handleGeocode}
            disabled={loading}
            className="rounded-xl h-11 px-4"
            type="button"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>

      <div>
        <Label htmlFor="instructions" className="text-sm font-medium">Delivery Instructions (Optional)</Label>
        <Textarea
          id="instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Apartment number, gate code, etc."
          className="rounded-xl mt-1"
          rows={3}
        />
      </div>
    </div>
  );
};

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
