import { motion } from 'motion/react';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HeroSectionProps {
  brandName: string;
  tagline: string;
  brandColor: string;
  heroImage: string;
  onOrderClick: () => void;
  onReserveClick: () => void;
}

export const HeroSection = ({
  brandName,
  tagline,
  brandColor,
  heroImage,
  onOrderClick,
  onReserveClick
}: HeroSectionProps) => {
  return (
    <div className="relative h-[60vh] sm:h-[70vh] min-h-[400px] sm:min-h-[500px] max-h-[700px] overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <ImageWithFallback
          src={heroImage}
          alt={`${brandName} hero`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center justify-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <h1 className="text-white mb-3 sm:mb-4" style={{ fontSize: 'clamp(1.75rem, 5vw, 3.5rem)', lineHeight: '1.15' }}>
              {brandName}
            </h1>
            <p className="text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-2" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', lineHeight: '1.5' }}>
              {tagline}
            </p>
            <div className="flex justify-center items-center px-4">
              <Button
                size="lg"
                className="text-white hover:opacity-90 w-full sm:w-auto min-w-[160px] h-11 sm:h-12"
                style={{ backgroundColor: brandColor }}
                onClick={onOrderClick}
              >
                Order Now
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator - Desktop only, uses CSS animation to avoid iOS touch issues */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block opacity-0 animate-fade-in">
        <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 bg-white/75 rounded-full animate-bounce-slow" />
        </div>
      </div>
    </div>
  );
};
