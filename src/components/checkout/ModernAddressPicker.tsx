import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Navigation, AlertCircle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
}

interface ModernAddressPickerProps {
  onAddressSelect: (address: Address) => void;
  initialAddress?: Partial<Address>;
  googleMapsApiKey?: string;
  brandColor?: string;
  hideMapPreview?: boolean;
}

// Global callback for Google Maps script loading
declare global {
  interface Window {
    initGoogleMaps?: () => void;
  }
}

export const ModernAddressPicker = ({
  onAddressSelect,
  initialAddress,
  googleMapsApiKey,
  brandColor = '#6B0F1A',
  hideMapPreview = false,
}: ModernAddressPickerProps) => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState(initialAddress?.instructions || '');
  const [line2, setLine2] = useState(initialAddress?.line2 || '');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scriptLoadedRef = useRef(false);
  const notifyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingPlaceRef = useRef(false);
  const confirmedAddressRef = useRef('');

  // Load Google Maps script
  useEffect(() => {
    if (!googleMapsApiKey) {
      setIsLoadingMaps(false);
      setMapsError('Google Maps API key not configured');
      return;
    }

    // Check if already loaded
    if (window.google?.maps?.places) {
      console.log('✅ Google Maps already loaded');
      setIsLoadingMaps(false);
      initializeAutocomplete();
      return;
    }

    // Prevent multiple script loads
    if (scriptLoadedRef.current) {
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    );
    if (existingScript) {
      console.log('✅ Google Maps script already in DOM, waiting for load...');
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkLoaded);
          setIsLoadingMaps(false);
          initializeAutocomplete();
        }
      }, 100);
      return;
    }

    scriptLoadedRef.current = true;
    console.log('🔄 Loading Google Maps API...');

    // Create unique callback name
    const callbackName = 'initGoogleMaps_' + Date.now();

    // Define global callback
    (window as any)[callbackName] = () => {
      console.log('✅ Google Maps API loaded successfully');
      setIsLoadingMaps(false);
      initializeAutocomplete();
      // Cleanup callback
      delete (window as any)[callbackName];
    };

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      console.error('❌ Failed to load Google Maps API');
      setIsLoadingMaps(false);
      setMapsError('Failed to load Google Maps. Please check your API key and internet connection.');
      scriptLoadedRef.current = false;
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup autocomplete listeners
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [googleMapsApiKey]);

  const initializeAutocomplete = () => {
    if (!inputRef.current) {
      console.warn('⚠️ Input ref not ready');
      return;
    }

    if (!window.google?.maps?.places) {
      console.warn('⚠️ Google Maps Places API not loaded');
      return;
    }

    try {
      console.log('🎯 Initializing Google Places Autocomplete...');

      // Create autocomplete
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
        types: ['address'],
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', handlePlaceSelect);

      // Add Enter key handler to ensure immediate selection
      if (inputRef.current) {
        inputRef.current.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            // Let Google autocomplete handle it first
            e.stopPropagation();
          }
        });
      }

      console.log('✅ Autocomplete initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize autocomplete:', error);
      setMapsError('Failed to initialize address autocomplete');
    }
  };

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current?.getPlace();

    if (!place) {
      console.warn('⚠️ No place selected');
      isSelectingPlaceRef.current = false;
      return;
    }

    if (!place.address_components) {
      console.warn('⚠️ Place has no address components');
      isSelectingPlaceRef.current = false;
      return;
    }

    console.log('📍 Place selected:', place.formatted_address);

    // Set flag to prevent onChange interference
    isSelectingPlaceRef.current = true;

    const address = parseGoogleAddress(place);
    if (address) {
      confirmedAddressRef.current = place.formatted_address || '';
      // Use setTimeout to ensure the autocomplete selection completes
      // before React state updates, preventing the double-tap issue
      setTimeout(() => {
        setSelectedAddress(address);
        setSearchValue(place.formatted_address || '');
        console.log('✅ Address parsed successfully:', address);

        // Auto-confirm address immediately with current optional fields
        notifyAddressChange(address, line2, instructions, true);

        // Reset flag after a brief delay
        setTimeout(() => {
          isSelectingPlaceRef.current = false;
        }, 100);
      }, 0);
    } else {
      console.error('❌ Failed to parse address');
      isSelectingPlaceRef.current = false;
    }
  };

  const parseGoogleAddress = (place: google.maps.places.PlaceResult): Address | null => {
    const components = place.address_components || [];
    const formattedParts = place.formatted_address?.split(',').map(part => part.trim()) ?? [];

    const getComponent = (types: string[], useShort = false) => {
      const component = components.find((c) => types.some((type) => c.types.includes(type)));
      if (!component) return '';
      return useShort ? component.short_name || '' : component.long_name || '';
    };

    const streetNumber = getComponent(['street_number']);
    const route = getComponent(['route']);
    let line1 = `${streetNumber} ${route}`.trim();
    if (!line1 && formattedParts.length > 0) {
      line1 = formattedParts[0];
    } else if (!line1 && place.name) {
      line1 = place.name;
    }

    let city =
      getComponent(['locality']) ||
      getComponent(['postal_town']) ||
      getComponent(['administrative_area_level_3']) ||
      getComponent(['administrative_area_level_2']) ||
      '';
    if (!city && formattedParts.length > 1) {
      city = formattedParts[1];
    }

    let state = getComponent(['administrative_area_level_1'], true);
    if (!state && formattedParts.length > 2) {
      const stateMatch = formattedParts[2].match(/[A-Z]{2}/);
      state = stateMatch?.[0] || '';
    }

    let zip = getComponent(['postal_code']);
    if (!zip && formattedParts.length > 2) {
      const zipMatch = formattedParts[2].match(/\d{5}(?:-\d{4})?/);
      zip = zipMatch?.[0] || '';
    }

    if (!line1 || !city || !state || !zip) {
      console.error('❌ Incomplete address (falling back to formatted string):', {
        line1,
        city,
        state,
        zip,
        formatted: place.formatted_address,
      });
      return null;
    }

    return {
      line1,
      line2: '',
      city,
      state,
      zip,
      country: 'US',
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
    };
  };

  // More lenient parser for reverse geocoding results
  const parseLenientAddress = (place: google.maps.places.PlaceResult): Address | null => {
    const components = place.address_components || [];
    const formattedParts = place.formatted_address?.split(',').map(part => part.trim()) ?? [];

    const getComponent = (types: string[], useShort = false) => {
      const component = components.find((c) => types.some((type) => c.types.includes(type)));
      if (!component) return '';
      return useShort ? component.short_name || '' : component.long_name || '';
    };

    // Be more flexible with line1
    const streetNumber = getComponent(['street_number']);
    const route = getComponent(['route']);
    const neighborhood = getComponent(['neighborhood']);
    const sublocality = getComponent(['sublocality']);

    let line1 = `${streetNumber} ${route}`.trim();
    if (!line1) line1 = route || neighborhood || sublocality || '';
    if (!line1 && formattedParts.length > 0) line1 = formattedParts[0];
    if (!line1 && place.name) line1 = place.name;

    // Get city with more fallbacks
    let city =
      getComponent(['locality']) ||
      getComponent(['postal_town']) ||
      getComponent(['sublocality']) ||
      getComponent(['neighborhood']) ||
      getComponent(['administrative_area_level_3']) ||
      getComponent(['administrative_area_level_2']) ||
      '';
    if (!city && formattedParts.length > 1) {
      city = formattedParts[1];
    }

    // Get state
    let state = getComponent(['administrative_area_level_1'], true);
    if (!state && formattedParts.length > 2) {
      const stateMatch = formattedParts.join(' ').match(/\b([A-Z]{2})\b/);
      state = stateMatch?.[1] || '';
    }

    // Get ZIP with more flexible matching
    let zip = getComponent(['postal_code']);
    if (!zip) {
      const zipMatch = formattedParts.join(' ').match(/\b(\d{5}(?:-\d{4})?)\b/);
      zip = zipMatch?.[1] || '';
    }

    // For lenient parsing, require at minimum: line1, city, and state
    // ZIP is often missing in reverse geocoding
    if (!line1 || !city || !state) {
      console.error('❌ Lenient parsing also failed:', {
        line1,
        city,
        state,
        zip,
        formatted: place.formatted_address,
      });
      return null;
    }

    // Use placeholder ZIP if missing (backend should validate)
    if (!zip) {
      console.warn('⚠️ ZIP code missing, using placeholder');
      zip = '00000';
    }

    console.log('✅ Lenient parsing succeeded:', { line1, city, state, zip });

    return {
      line1,
      line2: '',
      city,
      state,
      zip,
      country: 'US',
      latitude: place.geometry?.location?.lat(),
      longitude: place.geometry?.location?.lng(),
    };
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    if (!window.google?.maps) {
      alert('Google Maps is not loaded yet. Please wait and try again.');
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log('📍 Got user location:', { latitude, longitude });

        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, status) => {
            console.log('🔍 Geocode results:', { status, resultsCount: results?.length });

            if (status === 'OK' && results && results.length > 0) {
              // Try to find a valid address in the results
              let address: Address | null = null;
              let formattedAddress = '';

              // Strategy 1: Look for a precise street address first
              const preciseResult = results.find(r =>
                r.types.includes('street_address') ||
                r.types.includes('premise')
              );

              if (preciseResult) {
                console.log('🎯 Found precise result:', preciseResult.formatted_address);
                address = parseGoogleAddress(preciseResult);
                if (address) formattedAddress = preciseResult.formatted_address;
              }

              // Strategy 2: If no precise result parsed correctly, try all results in order
              if (!address) {
                console.log('⚠️ No precise result parsed, trying all results...');
                for (const result of results) {
                  // Skip the one we already tried if it failed
                  if (result === preciseResult) continue;

                  const parsed = parseGoogleAddress(result);
                  if (parsed) {
                    console.log('✅ Found valid result in list:', result.formatted_address);
                    address = parsed;
                    formattedAddress = result.formatted_address;
                    break;
                  }
                }
              }

              // Strategy 3: Fallback to lenient parsing on the first (most specific) result
              if (!address && results.length > 0) {
                console.log('⚠️ Standard parsing failed for all, trying lenient parsing on first result...');
                const bestResult = results[0];
                address = parseLenientAddress(bestResult);
                if (address) formattedAddress = bestResult.formatted_address;
              }

              if (address) {
                setSelectedAddress(address);
                setSearchValue(formattedAddress || '');
                confirmedAddressRef.current = formattedAddress || '';
                console.log('✅ Location address set:', formattedAddress);
                // Auto-confirm address from current location
                notifyAddressChange(address, line2, instructions, true);
                setIsLoadingLocation(false);
              } else {
                setIsLoadingLocation(false);
                console.error('❌ Could not parse address from location results');
                alert('We found your location but couldn\'t determine the exact address. Please type your address manually.');
              }
            } else if (status === 'ZERO_RESULTS') {
              setIsLoadingLocation(false);
              alert('Could not find an address at your location. Please enter your address manually.');
            } else if (status === 'ERROR' || status === 'UNKNOWN_ERROR') {
              setIsLoadingLocation(false);
              alert('Network error while getting your location. Please check your connection and try again.');
            } else {
              setIsLoadingLocation(false);
              console.error('Geocoding failed:', status);
              alert('Unable to determine your address. Please type it manually.');
            }
          }
        );
      },
      (error) => {
        setIsLoadingLocation(false);
        console.error('Geolocation error:', error);

        if (error.code === error.PERMISSION_DENIED) {
          alert('Location permission denied. Please enable location access in your browser settings or type your address manually.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          alert('Your location is currently unavailable. Please type your address manually.');
        } else if (error.code === error.TIMEOUT) {
          alert('Location request timed out. Please try again or type your address manually.');
        } else {
          alert('Unable to get your location. Please type your address manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Helper function to notify parent of address changes (with debouncing for optional fields)
  const notifyAddressChange = (address: Address, apt?: string, notes?: string, immediate = false) => {
    const fullAddress = {
      ...address,
      line2: apt || '',
      instructions: notes || '',
    };

    const sendUpdate = () => {
      console.log('📤 Notifying parent of address change:', {
        line1: fullAddress.line1,
        city: fullAddress.city,
        state: fullAddress.state,
        zip: fullAddress.zip,
        line2: fullAddress.line2,
        hasInstructions: !!fullAddress.instructions,
      });
      onAddressSelect(fullAddress);
    };

    if (immediate) {
      // Immediate notification for address selection
      if (notifyTimerRef.current) {
        clearTimeout(notifyTimerRef.current);
      }
      sendUpdate();
    } else {
      // Debounced notification for optional field changes
      if (notifyTimerRef.current) {
        clearTimeout(notifyTimerRef.current);
      }
      notifyTimerRef.current = setTimeout(sendUpdate, 500);
    }
  };

  // Show error state
  if (mapsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-900 text-sm">Google Maps Error</p>
          <p className="text-sm text-red-700 mt-1">{mapsError}</p>
          <p className="text-xs text-red-600 mt-2">
            Please contact support if this issue persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <style>{`
        /* Google Places Autocomplete Dropdown Styling */
        .pac-container {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          margin-top: 4px;
          font-family: inherit;
          z-index: 9999 !important;
        }

        .pac-item {
          padding: 12px 16px;
          cursor: pointer;
          border: none;
          font-size: 14px;
          line-height: 1.5;
        }

        .pac-item:hover {
          background-color: #f3f4f6;
        }

        .pac-item-selected,
        .pac-item-selected:hover {
          background-color: #e5e7eb;
        }

        .pac-icon {
          display: none;
        }

        .pac-item-query {
          font-size: 14px;
          color: #111827;
          font-weight: 500;
        }

        .pac-matched {
          font-weight: 700;
          color: ${brandColor};
        }
      `}</style>

      <div>
        <Label className="text-sm font-medium mb-2 block">Delivery Address</Label>

        {isLoadingMaps && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 mb-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 text-sm">Loading Google Maps...</p>
              <p className="text-sm text-blue-700">Setting up address autocomplete</p>
            </div>
          </div>
        )}

        {/* Address Search */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => {
                // Don't interfere when Google autocomplete is selecting a place
                if (isSelectingPlaceRef.current) {
                  return;
                }

                const newValue = e.target.value;
                setSearchValue(newValue);

                // Clear map/selection if user is manually editing the address
                if (selectedAddress && newValue !== confirmedAddressRef.current) {
                  setSelectedAddress(null);
                  confirmedAddressRef.current = '';
                }
              }}
              placeholder="Start typing your address..."
              className="h-12 text-base"
              paddingLeft={44}
              disabled={isLoadingMaps}
              autoComplete="off"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={isLoadingLocation || isLoadingMaps}
            className="h-12 px-4"
            title="Use my current location"
          >
            {isLoadingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          {isLoadingMaps
            ? 'Loading address autocomplete...'
            : 'Start typing your address and select from dropdown'
          }
        </p>
      </div>

      {/* Address Details (No Map) */}
      {selectedAddress && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-2">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-green-900 text-sm">Address confirmed!</p>
              <p className="text-sm text-green-700">
                {selectedAddress.line1}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}
              </p>
            </div>
          </div>

          {/* Apartment/Unit */}
          <div>
            <Label htmlFor="line2" className="text-sm">
              Apartment, Suite, Unit, etc. (Optional)
            </Label>
            <Input
              id="line2"
              value={line2}
              onChange={(e) => {
                const newValue = e.target.value;
                setLine2(newValue);
                if (selectedAddress) {
                  notifyAddressChange(selectedAddress, newValue, instructions, false);
                }
              }}
              placeholder="Apt 5B"
              className="mt-1"
            />
          </div>

          {/* Delivery Instructions */}
          <div>
            <Label htmlFor="instructions" className="text-sm">
              Delivery Instructions (Optional)
            </Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => {
                const newValue = e.target.value;
                setInstructions(newValue);
                if (selectedAddress) {
                  notifyAddressChange(selectedAddress, line2, newValue, false);
                }
              }}
              placeholder="Gate code, building entrance, where to leave, etc."
              className="mt-1 resize-none"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
};
