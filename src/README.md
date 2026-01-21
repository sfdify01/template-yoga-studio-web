# 🍽️ Tabsy Restaurant Website Template

A modern, mobile-first, white-label website template for restaurants, cafes, coffee shops, and food businesses. Built with React, Tailwind CSS, and shadcn/ui.

## ✨ Features

### Core Functionality
- **Multi-tenant Configuration** - Easy white-label customization via JSON config files
- **Mobile-First Design** - Optimized for mobile devices with responsive layouts
- **SEO Optimized** - Schema markup ready, meta tags, and performance optimized
- **6 Complete Pages** - Home, Menu, Order, About, Events/Catering, Contact
- **Modern UI Components** - Built with shadcn/ui and Tailwind CSS
- **Smooth Animations** - Motion animations for enhanced user experience

### Key Components
- **AnnouncementBar** - Dismissible promotional banner
- **Navigation** - Responsive navigation with mobile menu
- **HeroSection** - Eye-catching hero with CTAs
- **HoursBadge** - Real-time open/closed status
- **MenuGrid** - Searchable, filterable menu with categories
- **MenuItemModal** - Detailed item view with dietary info
- **ReviewCarousel** - Customer testimonials slider
- **StickyActionBar** - Mobile bottom navigation (Order, Call, Directions, Menu)
- **MapCard** - Location with Google Maps integration
- **SocialGrid** - Instagram-style photo grid
- **NewsletterForm** - Email subscription
- **FooterCompact** - Comprehensive footer with links

### Pages

#### 1. Home
- Hero section with background image
- Hours widget with open/closed indicator
- Featured menu items carousel
- Customer reviews
- Location map
- Social media grid
- Newsletter signup

#### 2. Menu
- Category tabs
- Search and filter functionality
- Dietary filters (Vegetarian, Vegan, Gluten-Free)
- Item cards with images
- Popular items highlighting
- Detailed item modal

#### 3. Order/Reservations
- Integration links to Toast, Square, Stripe Connect, Uber Direct, DoorDash, OpenTable
- Quick pickup information
- Reservation booking

#### 4. About
- Brand story
- Team member grid
- Core values
- Sustainability commitment

#### 5. Events & Catering
- Upcoming events listing
- RSVP functionality
- Catering services overview
- Inquiry form

#### 6. Contact
- Contact information cards
- Full hours schedule
- Location map
- Quick action buttons
- FAQ section

## 🚀 Quick Start

### Configuration

The template is configured via JSON files in `/data/[tenant]/`:

#### `/data/sample/config.json`
```json
{
  "name": "Sample Bistro",
  "tagline": "Farm-to-table dining in the heart of Naperville",
  "theme": {
    "brand": "#D03A25",
    "accent": "#F1E6D0"
  },
  "contact": {
    "phone": "+1 312-555-1234",
    "email": "hello@samplebistro.com"
  },
  "integrations": {
    "ordering": {
      "type": "toast",
      "url": "https://order.toasttab.com/your-restaurant"
    },
    "reservations": {
      "type": "opentable",
      "url": "https://www.opentable.com/your-restaurant"
    }
  }
}
```

#### `/data/sample/hours.json`
Defines operating hours and special closures.

#### `/supabase/seed/menu.json`
Menu categories, items, prices, dietary information.

## 🎨 Customization

### White-Label Setup

1. **Create New Tenant Folder**
   ```
   /data/your-restaurant/
   ├── config.json
   ├── hours.json
   └── menu.json
   ```

2. **Update Configuration**
   - Brand colors in `theme`
   - Contact information
   - Integration URLs
   - Social media handles

3. **Update Hook**
   Modify `/hooks/useConfig.ts` to load your tenant:
   ```typescript
   fetch('/data/your-restaurant/config.json')
   ```

### Styling

The template uses Tailwind CSS v4.0 with custom design tokens in `/styles/globals.css`.

**Brand Colors** are applied dynamically from config:
- Primary buttons
- Badges and highlights
- Navigation accents
- Section headers

**Typography** follows a consistent system with default styles for h1-h4, p, labels, and buttons.

### Components

All components are modular and reusable:
- Located in `/components/`
- Accept props for customization
- Use brand colors from config
- Fully typed with TypeScript

## 📱 Mobile Experience

- Sticky bottom navigation bar (Order, Call, Directions, Menu)
- Large tap zones for CTAs
- Optimized images with lazy loading
- Touch-friendly UI elements
- Hamburger menu for mobile navigation

## 🔍 SEO Features

### Implemented
- Dynamic meta titles per page
- Meta descriptions from config
- Semantic HTML structure
- Alt text on all images
- Accessible navigation
- Mobile-responsive design

### Ready for Implementation
- Structured data (LocalBusiness, Restaurant, Menu schema)
- Open Graph tags
- Twitter Cards
- Sitemap generation
- robots.txt

## 🛠️ Tech Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4.0** - Styling
- **shadcn/ui** - UI components
- **Motion (Framer Motion)** - Animations
- **Lucide React** - Icons
- **Unsplash** - Placeholder images

## 📦 Project Structure

```
/
├── components/          # Reusable components
│   ├── ui/             # shadcn/ui components
│   ├── AnnouncementBar.tsx
│   ├── Navigation.tsx
│   ├── HeroSection.tsx
│   ├── MenuGrid.tsx
│   └── ...
├── pages/              # Page components
│   ├── Home.tsx
│   ├── Menu.tsx
│   ├── Order.tsx
│   ├── About.tsx
│   ├── Events.tsx
│   └── Contact.tsx
├── hooks/              # Custom hooks
│   └── useConfig.ts
├── utils/              # Utility functions
│   └── hours.ts
├── data/               # Configuration files
│   └── sample/
│       ├── config.json
│       ├── hours.json
│       └── menu.json
├── styles/
│   └── globals.css     # Global styles and tokens
└── App.tsx             # Main app with routing
```

## 🎯 Integration Points

### POS Systems
- Toast
- Square
- Custom ordering systems

### Payments
- Stripe Connect (Payment Element + Connect account transfers)

### Reservation Systems
- OpenTable
- Resy
- Custom booking systems

### Delivery Platforms
- Uber Direct (native dispatch + tracking)
- DoorDash
- Grubhub

### Email Marketing
Ready for integration with:
- Mailchimp
- SendGrid
- Customer.io

### Analytics
Add Google Analytics, Facebook Pixel, or other tracking:
```typescript
// In App.tsx or custom hook
useEffect(() => {
  // Initialize analytics
  gtag('config', 'GA_MEASUREMENT_ID');
}, []);
```

## 🚀 Future Enhancements

- [ ] Loyalty program widget
- [ ] Customer app download QR codes
- [ ] SMS/Email capture automation
- [ ] Online ordering cart (native)
- [ ] Gift card purchase flow
- [ ] Event ticket sales
- [ ] Blog/news section
- [ ] Multi-language support
- [ ] Dark mode toggle
- [ ] Progressive Web App (PWA)

## 📝 License

This is a white-label template for the Tabsy platform. Customize and deploy for your restaurant clients.

## 🤝 Support

For questions or customization support, contact the Tabsy team.

---

**Powered by Tabsy** - Modern restaurant technology solutions
