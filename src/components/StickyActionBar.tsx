import { motion } from 'motion/react';

interface StickyActionBarProps {
  brandColor: string;
  phone: string;
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  };
  onNavigate: (path: string) => void;
}

export const StickyActionBar = ({ brandColor, phone, address, onNavigate }: StickyActionBarProps) => {
  // StickyActionBar is now hidden - buttons removed per user request
  // Component preserved for potential future use
  return null;
};
