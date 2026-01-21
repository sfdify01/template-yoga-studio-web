import shahirizadaLogo from 'figma:asset/c48f7b9362f2fad41d0ac7869d6f0f7fead10c9b.png';

interface BrandLogoProps {
  brandName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrandLogo = ({ brandName, className = '', size = 'md' }: BrandLogoProps) => {
  const sizeClasses = {
    sm: 'h-20',   // Another 50% bigger: was h-12 (48px) → now h-20 (80px)
    md: 'h-24',   // Another 50% bigger: was h-16 (64px) → now h-24 (96px)
    lg: 'h-36'    // Another 50% bigger: was h-24 (96px) → now h-36 (144px)
  };

  return (
    <img 
      src={shahirizadaLogo} 
      alt={brandName}
      className={`${sizeClasses[size]} w-auto ${className}`}
    />
  );
};
