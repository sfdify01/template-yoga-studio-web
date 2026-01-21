import { TenantSettings } from './types';

export function generateLocalBusinessSchema(settings: TenantSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: settings.name,
    image: settings.logo,
    '@id': '',
    url: '',
    telephone: settings.contact.phone,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address.line1,
      addressLocality: settings.address.city,
      addressRegion: settings.address.state,
      postalCode: settings.address.zip,
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: settings.address.lat,
      longitude: settings.address.lng,
    },
    servesCuisine: 'American',
    acceptsReservations: true,
  };
}

export function generateMenuSchema(menuItems: any[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    hasMenuSection: menuItems.map(category => ({
      '@type': 'MenuSection',
      name: category.name,
      hasMenuItem: category.items.map((item: any) => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.description,
        offers: {
          '@type': 'Offer',
          price: item.price,
          priceCurrency: 'USD',
        },
      })),
    })),
  };
}
