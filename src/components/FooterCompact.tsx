import { Instagram, MapPin, Phone, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Config } from '../hooks/useConfig';
import { SubscribeForm } from './SubscribeForm';
import { BrandLogo } from './BrandLogo';

interface FooterCompactProps {
  config: Config;
  onNavigate: (path: string) => void;
}

export const FooterCompact = ({ config, onNavigate }: FooterCompactProps) => {
  const currentYear = new Date().getFullYear();
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    // Fetch version info
    fetch('/version.json?' + Date.now())
      .then(res => res.json())
      .then(data => {
        if (data.version) {
          setVersion(data.version);
        }
      })
      .catch(() => {
        // Silently fail if version.json doesn't exist
      });
  }, []);

  return (
    <footer className="bg-gray-50 border-t mt-12 sm:mt-16 pb-20 md:pb-8 safe-bottom">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Newsletter Section - Full Width on Top */}
        {config.newsletter && (
          <div className="mb-8 sm:mb-12 pb-8 sm:pb-12 border-b">
            <div className="max-w-2xl">
              <h3 className="mb-2 text-base sm:text-lg">Stay in the loop 🍽️</h3>
              <p className="text-sm text-gray-600 mb-4">
                Join our mailing list for updates, offers, and events.
              </p>
              <SubscribeForm brandColor={config.theme.brand} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <BrandLogo brandName={config.name} size="md" className="mb-4" />
            <p className="text-sm text-gray-600 mb-4">{config.tagline}</p>
            <div className="flex gap-3">
              {config.social.instagram && (
                <a
                  href="https://www.instagram.com/shahirizadafreshmarket/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { label: 'Products', path: '/products' },
                { label: 'Order Online', path: '/order' },
                { label: 'About Us', path: '/about' },
                { label: 'Support', path: '/support' },
                { label: 'Blog', path: '/blog' },
                { label: 'Contact', path: '/contact' },
              ].map((link) => (
                <li key={link.path}>
                  <button
                    onClick={() => onNavigate(link.path)}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  {config.address.line1}<br />
                  {config.address.city}, {config.address.state} {config.address.zip}
                </span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a href={`tel:${config.contact.phone}`} className="text-gray-600 hover:text-gray-900">
                  {config.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a href={`mailto:${config.contact.email}`} className="text-gray-600 hover:text-gray-900">
                  {config.contact.email}
                </a>
              </li>
            </ul>
          </div>

          {/* Additional */}
          <div>
            <h3 className="mb-4">More</h3>
            <ul className="space-y-2">
              {config.features.catering && (
                <li>
                  <button 
                    onClick={() => onNavigate('/contact')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Catering
                  </button>
                </li>
              )}
              {config.features.giftCards && (
                <li>
                  <button
                    onClick={() => onNavigate('/gift-cards')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Gift Cards
                  </button>
                </li>
              )}
              {config.features.careers && (
                <li>
                  <button
                    onClick={() => onNavigate('/careers')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Careers
                  </button>
                </li>
              )}
              <li>
                <button
                  onClick={() => onNavigate('/privacy-policy')}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-gray-500">
          <p>
            &copy; {currentYear} {config.name}. All rights reserved. Powered by{' '}
            <a
              href="https://tabsy.us/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 hover:text-gray-900 underline transition-colors"
            >
              Tabsy
            </a>
            .
          </p>
          {version && (
            <p className="mt-2 text-xs text-gray-400">
              V{version}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
};
