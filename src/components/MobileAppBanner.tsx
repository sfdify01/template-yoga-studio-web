import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import appIcon from 'figma:asset/c48f7b9362f2fad41d0ac7869d6f0f7fead10c9b.png';

interface MobileAppBannerProps {
  brandColor?: string;
  onVisibilityChange?: (visible: boolean) => void;
}

// Detect OS for display purposes
const getDeviceOS = (): 'ios' | 'android' | 'other' => {
  if (typeof window === 'undefined') return 'other';

  const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';

  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream) {
    return 'ios';
  }

  if (/android/i.test(userAgent)) {
    return 'android';
  }

  return 'other';
};

// Check if device is mobile
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const STORAGE_KEY = 'shahirizada_app_banner_dismissed';

// Apple App Store icon
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

// Google Play Store icon
const PlayStoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 16, height: 16 }}>
    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
  </svg>
);

// Hardcoded URL for reliable mobile navigation
const APP_DOWNLOAD_URL = 'https://share.shahirizadameatmarket.com';

export const MobileAppBanner = ({ onVisibilityChange }: MobileAppBannerProps) => {
  const [state, setState] = useState<'loading' | 'hidden' | 'visible'>('loading');
  const [deviceOS, setDeviceOS] = useState<'ios' | 'android' | 'other'>('ios');

  useEffect(() => {
    if (state === 'loading') return;
    onVisibilityChange?.(state === 'visible');
  }, [state, onVisibilityChange]);

  useEffect(() => {
    if (!isMobileDevice()) {
      setState('hidden');
      return;
    }

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < 7 * dayInMs) {
        setState('hidden');
        return;
      }
    }

    setDeviceOS(getDeviceOS());
    setState('visible');
  }, []);

  const handleDismiss = () => {
    setState('hidden');
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  };

  const handleGetApp = () => {
    // Direct navigation - most reliable method
    window.location.href = APP_DOWNLOAD_URL;
  };

  if (state !== 'visible') return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        zIndex: 99999,
        width: '100%',
        backgroundColor: '#1a1a1a',
        height: 64,
      }}
    >
      <div
        style={{
          height: 64,
          paddingLeft: 12,
          paddingRight: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          maxWidth: 1024,
          margin: '0 auto',
        }}
      >
        {/* Dismiss button */}
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            padding: 6,
            marginLeft: -4,
            borderRadius: 9999,
            flexShrink: 0,
            color: 'rgba(255,255,255,0.5)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Dismiss"
        >
          <X size={20} strokeWidth={1.5} />
        </button>

        {/* App Icon */}
        <div style={{ flexShrink: 0 }}>
          <img
            src={appIcon}
            alt="Shahirizada Fresh Market"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          />
        </div>

        {/* App Info */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 8, paddingRight: 8 }}>
          <p
            style={{
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            Shahirizada Fresh Market
          </p>
          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: 11,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            Order fresh halal meats
          </p>
        </div>

        {/* GET BUTTON - Using button for guaranteed click handling */}
        <button
          type="button"
          onClick={handleGetApp}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 6,
            paddingBottom: 6,
            borderRadius: 9999,
            flexShrink: 0,
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: 'none',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'rgba(255,255,255,0.2)',
          }}
        >
          <span style={{ color: 'white', opacity: 0.9, display: 'flex' }}>
            {deviceOS === 'ios' ? <AppleIcon /> : <PlayStoreIcon />}
          </span>
          <span
            style={{
              color: 'rgba(255,255,255,0.95)',
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Get
          </span>
        </button>
      </div>
    </div>
  );
};
