# Jotai State Management Rules

CLEAN AND STRUCTURED CODE!

## Overview

This project uses **Jotai** as the primary state management solution. All business logic must live in Jotai atoms. This document outlines the rules, patterns, and best practices for state management in this codebase.

---

## Core Principle

**All business logic MUST live in Jotai atoms. Business logic MUST NOT live in regular classes.**

This ensures:
- ✅ Reactive, predictable state updates
- ✅ Easy testability and debugging
- ✅ Consistent patterns across the codebase
- ✅ Type-safe state management
- ✅ Minimal boilerplate
- ✅ Optimal React integration

---

## Installation

```bash
npm install jotai
```

---

## Rules & Guidelines

### Rule 1: Business Logic in Atoms Only

**DO:** Put business logic in Jotai atoms
```typescript
// ✅ CORRECT - Business logic in atoms
import { atom } from 'jotai';

// State atoms
export const cartItemsAtom = atom<CartItem[]>([]);
export const couponCodeAtom = atom<string>('');

// Derived atoms with logic
export const cartTotalsAtom = atom((get) => {
  const items = get(cartItemsAtom);
  const couponCode = get(couponCodeAtom);

  const subtotal = items.reduce((sum, item) => {
    const modsTotal = item.mods?.reduce((modSum, mod) => modSum + (mod.price || 0), 0) || 0;
    return sum + (item.price + modsTotal) * item.qty;
  }, 0);

  // Apply coupon discount logic
  let discountedSubtotal = subtotal;
  if (couponCode === 'WELCOME10') {
    discountedSubtotal = subtotal * 0.9;
  }

  const tax = Math.round(discountedSubtotal * 0.0875);
  const grandTotal = discountedSubtotal + tax;

  return {
    subtotal: discountedSubtotal,
    tax,
    grandTotal,
  };
});

// Write atoms for actions
export const addToCartAtom = atom(
  null,
  (get, set, item: Omit<CartItem, 'id'>) => {
    const currentItems = get(cartItemsAtom);
    const id = `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    set(cartItemsAtom, [...currentItems, { ...item, id }]);
  }
);
```

**DON'T:** Use classes for business logic
```typescript
// ❌ WRONG - Business logic in classes
class CartManager {
  private items: CartItem[] = [];

  addItem(item: CartItem) {
    this.items.push(item);
  }

  getTotals() {
    // Business logic here
  }
}
```

---

### Rule 2: Atom Organization Structure

Organize atoms by feature/domain in dedicated files:

```
/src/atoms
├── /cart
│   ├── cartAtoms.ts        # Cart state and derived atoms
│   ├── cartActions.ts      # Cart write atoms (actions)
│   └── types.ts            # TypeScript types
├── /auth
│   ├── authAtoms.ts
│   └── authActions.ts
├── /menu
│   ├── menuAtoms.ts
│   └── menuActions.ts
├── /loyalty
│   ├── loyaltyAtoms.ts
│   └── loyaltyActions.ts
└── index.ts                # Re-export all atoms
```

---

### Rule 3: Atom Types and Patterns

#### Primitive Atoms (State)
```typescript
import { atom } from 'jotai';

// Simple state atoms
export const userAtom = atom<User | null>(null);
export const isLoadingAtom = atom<boolean>(false);
export const errorAtom = atom<string | null>(null);
```

#### Derived Atoms (Read-only)
```typescript
// Computed state based on other atoms
export const isAuthenticatedAtom = atom((get) => {
  const user = get(userAtom);
  return user !== null;
});

export const cartItemCountAtom = atom((get) => {
  const items = get(cartItemsAtom);
  return items.reduce((sum, item) => sum + item.qty, 0);
});
```

#### Write Atoms (Actions)
```typescript
// Actions that modify state
export const loginAtom = atom(
  null,
  async (get, set, credentials: { email: string; password: string }) => {
    set(isLoadingAtom, true);
    set(errorAtom, null);

    try {
      const user = await authService.login(credentials);
      set(userAtom, user);
    } catch (error) {
      set(errorAtom, error.message);
    } finally {
      set(isLoadingAtom, false);
    }
  }
);
```

#### Read-Write Atoms
```typescript
// Atoms that can both read and write
export const searchQueryAtom = atom(
  '', // initial value
  (get, set, newValue: string) => {
    // You can add side effects or validation here
    const trimmed = newValue.trim();
    set(searchQueryAtom, trimmed);
  }
);
```

---

### Rule 4: Async Logic in Atoms

**DO:** Handle async operations in write atoms
```typescript
import { atom } from 'jotai';

export const fetchMenuAtom = atom(
  null,
  async (get, set) => {
    set(menuLoadingAtom, true);
    set(menuErrorAtom, null);

    try {
      const menu = await menuService.fetchMenu();
      set(menuItemsAtom, menu);
    } catch (error) {
      set(menuErrorAtom, error.message);
    } finally {
      set(menuLoadingAtom, false);
    }
  }
);
```

**DO:** Use atomWithStorage for persistence
```typescript
import { atomWithStorage } from 'jotai/utils';

// Automatically syncs with localStorage
export const cartItemsAtom = atomWithStorage<CartItem[]>(
  'tabsy-cart',
  []
);
```

---

### Rule 5: Component Integration

**DO:** Use atoms in components with hooks
```typescript
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { cartItemsAtom, addToCartAtom, cartTotalsAtom } from '@/atoms/cart';

function CartComponent() {
  // Read and write
  const [items, setItems] = useAtom(cartItemsAtom);

  // Read-only (more performant)
  const totals = useAtomValue(cartTotalsAtom);

  // Write-only (for actions)
  const addToCart = useSetAtom(addToCartAtom);

  return (
    <div>
      <p>Items: {items.length}</p>
      <p>Total: ${totals.grandTotal / 100}</p>
      <button onClick={() => addToCart(newItem)}>Add Item</button>
    </div>
  );
}
```

**DON'T:** Mix local state with business logic
```typescript
// ❌ WRONG - Business logic in component state
function CartComponent() {
  const [items, setItems] = useState<CartItem[]>([]);

  const calculateTotal = () => {
    // Complex business logic here - should be in atom!
    return items.reduce((sum, item) => sum + item.price, 0);
  };
}
```

---

### Rule 6: Testing Atoms

Atoms are easy to test in isolation:

```typescript
import { createStore } from 'jotai';
import { cartItemsAtom, addToCartAtom, cartTotalsAtom } from './cartAtoms';

describe('Cart Atoms', () => {
  it('should calculate totals correctly', () => {
    const store = createStore();

    // Set initial state
    store.set(cartItemsAtom, [
      { id: '1', name: 'Item 1', price: 1000, qty: 2 },
      { id: '2', name: 'Item 2', price: 500, qty: 1 },
    ]);

    // Get computed value
    const totals = store.get(cartTotalsAtom);

    expect(totals.subtotal).toBe(2500);
  });

  it('should add item to cart', () => {
    const store = createStore();

    const newItem = { name: 'New Item', price: 1000, qty: 1 };
    store.set(addToCartAtom, newItem);

    const items = store.get(cartItemsAtom);
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('New Item');
  });
});
```

---

### Rule 7: Atom Families for Dynamic Data

Use `atomFamily` for dynamic collections:

```typescript
import { atomFamily } from 'jotai/utils';

// Create atoms dynamically based on ID
export const menuItemAtomFamily = atomFamily((itemId: string) =>
  atom<MenuItem | null>(null)
);

// Usage in component
function MenuItemDetail({ itemId }: { itemId: string }) {
  const item = useAtomValue(menuItemAtomFamily(itemId));
  return <div>{item?.name}</div>;
}
```

---

### Rule 8: Debugging Atoms

Use Jotai DevTools for debugging:

```typescript
// In development, wrap your app with DevTools
import { DevTools } from 'jotai-devtools';
import 'jotai-devtools/styles.css';

function App() {
  return (
    <>
      {process.env.NODE_ENV === 'development' && <DevTools />}
      <YourApp />
    </>
  );
}
```

Enable debugging for specific atoms:

```typescript
import { atom } from 'jotai';

export const debugCartAtom = atom((get) => {
  const items = get(cartItemsAtom);
  console.log('Cart items changed:', items);
  return items;
});
```

---

## Migration Guide

### Converting Existing Code to Jotai

#### Before (Context API):
```typescript
// ❌ OLD - Context + useState
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totals, setTotals] = useState<CartTotals>({...});

  const addItem = (item: CartItem) => {
    setItems([...items, item]);
  };

  return (
    <CartContext.Provider value={{ items, totals, addItem }}>
      {children}
    </CartContext.Provider>
  );
}
```

#### After (Jotai):
```typescript
// ✅ NEW - Jotai atoms
import { atom } from 'jotai';

export const cartItemsAtom = atom<CartItem[]>([]);

export const cartTotalsAtom = atom((get) => {
  const items = get(cartItemsAtom);
  // Calculate totals
  return {...};
});

export const addItemAtom = atom(
  null,
  (get, set, item: CartItem) => {
    const currentItems = get(cartItemsAtom);
    set(cartItemsAtom, [...currentItems, item]);
  }
);

// In component
function Cart() {
  const items = useAtomValue(cartItemsAtom);
  const totals = useAtomValue(cartTotalsAtom);
  const addItem = useSetAtom(addItemAtom);

  return <div>...</div>;
}
```

---

## Best Practices

### ✅ DO:
1. **Keep atoms focused** - One responsibility per atom
2. **Use descriptive names** - `cartItemsAtom`, not `itemsAtom`
3. **Leverage derived atoms** - Compute values instead of storing them
4. **Use atomWithStorage** - For persistent state
5. **Type everything** - Full TypeScript support
6. **Colocate related atoms** - Group by feature/domain
7. **Use write atoms for actions** - Clear separation of concerns
8. **Test atoms in isolation** - Easy unit testing

### ❌ DON'T:
1. **Don't use classes for business logic** - Use atoms instead
2. **Don't mix useState with business logic** - Use atoms
3. **Don't store derived state** - Use derived atoms
4. **Don't mutate atom values** - Always return new objects/arrays
5. **Don't put UI state in atoms** - Local component state is fine for UI-only state (modals, hover states, etc.)
6. **Don't create global atoms unnecessarily** - Use local atoms when appropriate

---

## Examples by Feature

### Cart Management
```typescript
// /src/atoms/cart/cartAtoms.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const cartItemsAtom = atomWithStorage<CartItem[]>('cart', []);
export const couponCodeAtom = atom<string>('');
export const tipPercentageAtom = atom<number>(0);

export const cartSubtotalAtom = atom((get) => {
  const items = get(cartItemsAtom);
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
});

export const cartTotalAtom = atom((get) => {
  const subtotal = get(cartSubtotalAtom);
  const tipPercentage = get(tipPercentageAtom);
  const tip = Math.round(subtotal * (tipPercentage / 100));
  const tax = Math.round(subtotal * 0.0875);

  return subtotal + tip + tax;
});
```

### Authentication
```typescript
// /src/atoms/auth/authAtoms.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const userAtom = atomWithStorage<User | null>('user', null);
export const authLoadingAtom = atom<boolean>(false);
export const authErrorAtom = atom<string | null>(null);

export const isAuthenticatedAtom = atom((get) => {
  return get(userAtom) !== null;
});

export const loginAtom = atom(
  null,
  async (get, set, credentials: Credentials) => {
    set(authLoadingAtom, true);
    set(authErrorAtom, null);

    try {
      const user = await authService.login(credentials);
      set(userAtom, user);
    } catch (error) {
      set(authErrorAtom, error.message);
    } finally {
      set(authLoadingAtom, false);
    }
  }
);

export const logoutAtom = atom(null, (get, set) => {
  set(userAtom, null);
  set(cartItemsAtom, []);
  // Clear other user-specific state
});
```

### Menu/Products
```typescript
// /src/atoms/menu/menuAtoms.ts
import { atom } from 'jotai';

export const menuItemsAtom = atom<MenuItem[]>([]);
export const menuLoadingAtom = atom<boolean>(false);
export const searchQueryAtom = atom<string>('');
export const selectedCategoryAtom = atom<string | null>(null);

export const filteredMenuItemsAtom = atom((get) => {
  const items = get(menuItemsAtom);
  const query = get(searchQueryAtom).toLowerCase();
  const category = get(selectedCategoryAtom);

  return items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(query);
    const matchesCategory = !category || item.category === category;
    return matchesSearch && matchesCategory;
  });
});

export const fetchMenuAtom = atom(
  null,
  async (get, set) => {
    set(menuLoadingAtom, true);
    try {
      const items = await menuService.fetchMenu();
      set(menuItemsAtom, items);
    } finally {
      set(menuLoadingAtom, false);
    }
  }
);
```

---

## Additional Resources

- [Jotai Documentation](https://jotai.org)
- [Jotai Best Practices](https://jotai.org/docs/basics/primitives)
- [Jotai DevTools](https://jotai.org/docs/tools/devtools)
- [Testing with Jotai](https://jotai.org/docs/guides/testing)

---

## Summary

- ✅ All business logic lives in Jotai atoms
- ✅ No business logic in classes or components
- ✅ Atoms are organized by feature/domain
- ✅ Use primitive, derived, and write atoms appropriately
- ✅ Leverage TypeScript for type safety
- ✅ Test atoms in isolation
- ✅ Use atomWithStorage for persistence

By following these rules, we maintain a clean, predictable, and scalable state management architecture throughout the application.



# Shahirizada Meat Market - Repository Overview

## Project Purpose & Domain

**What It Is:**
This is a modern, production-ready **web application for Shahirizada Fresh Market** — a Halal meat market and grocery store located in Naperville, Illinois. It's built as a white-label, multi-tenant restaurant/food business website template that can be customized for different food establishments.

**Key Purpose:**
- Online presence for halal meat market (never-frozen, freshly cut daily)
- Native online ordering system with pickup and delivery capabilities
- Customer account management with loyalty rewards
- Blog/content management for recipes and store information
- Admin dashboard for managing products, orders, and inventory
- Mobile-first e-commerce experience

**Business Domain:**
- Halal food retail and e-commerce
- Restaurant/food service online ordering
- Customer engagement and loyalty programs
- Multi-channel fulfillment (pickup, delivery via DoorDash)

---

## Tech Stack

### Frontend Framework
- React 18.3.1 with TypeScript
- Vite 6.3.5 (build tool and dev server, port 3000)
- React DOM 18.3.1

### UI & Styling
- Tailwind CSS v4.0 (utility-first styling)
- shadcn/ui (50+ components including Radix UI primitives)
- Lucide React (icons library)
- Motion (animations, formerly Framer Motion)
- Sonner (toast notifications)

### Component Libraries
- 40+ shadcn/ui components (accordion, alert dialog, dialog, dropdown, popover, select, tabs, etc.)
- Radix UI primitives for accessible components
- Embla Carousel (carousel functionality)
- react-resizable-panels
- react-hook-form (form validation)
- react-day-picker (date selection)
- cmdk (command palette)

### Backend & Data
- Supabase (@supabase/supabase-js v2, @jsr/supabase__supabase-js v2.49.8)
- Hono (lightweight web framework for serverless functions)
- TypeScript for type safety
- Zod (schema validation)
- class-variance-authority (component styling patterns)

### Development & Build
- Vite with React SWC plugin (@vitejs/plugin-react-swc)
- npm for package management
- TypeScript strict mode
- ES2020+ target compilation

---

## Project Structure

```
/src
├── App.tsx                           # Main app router and state management
├── main.tsx                          # React entry point
├── index.css                         # Global styles
│
├── /pages (32+ pages)               # Route-level components
│   ├── Home.tsx                     # Homepage with hero, menu, reviews
│   ├── Menu.tsx                     # Menu display page
│   ├── About.tsx                    # About page with story/team
│   ├── Contact.tsx                  # Contact page with map/form
│   ├── Events.tsx                   # Events & catering page
│   ├── Blog.tsx                     # Blog listing
│   ├── BlogPost.tsx                 # Individual blog post
│   ├── Account.tsx                  # User account dashboard
│   ├── AccountOrders.tsx            # Order history
│   ├── AccountOrderDetail.tsx       # Order details
│   ├── AccountRewards.tsx           # Loyalty rewards page
│   ├── AccountReferrals.tsx         # Referral program
│   ├── Login.tsx                    # Authentication
│   ├── Verify.tsx                   # Email verification
│   ├── Cart.tsx                     # Shopping cart
│   ├── Confirmation.tsx             # Order confirmation
│   ├── Status.tsx                   # Order status tracking
│   ├── TrackOrder.tsx               # Live order tracking
│   ├── Loyalty.tsx                  # Loyalty info
│   ├── Admin.tsx                    # Admin dashboard
│   ├── AdminSimple.tsx              # Admin UI
│   ├── AdminHealth.tsx              # Admin health check
│   ├── AdminDebug.tsx               # Debug tools
│   ├── MigrateBlogPosts.tsx         # Data migration tool
│   ├── MigrateMenu.tsx              # Menu migration tool
│   ├── UniversalMenuDemo.tsx        # Demo/test page
│   ├── OrderingFlowDemo.tsx         # Demo/test page
│   ├── TestAdminConnection.tsx      # Connection testing
│   └── UploadBlogImages.tsx         # Image upload utility
│
├── /components (50+ components)    # Reusable UI components
│   ├── /ui                          # shadcn/ui base components (40+)
│   ├── /figma                       # System components from Figma
│   ├── /blog                        # Blog-related components
│   ├── /cart                        # Cart-related components
│   ├── /checkout                    # Checkout flow components
│   ├── /contact                     # Contact form components
│   ├── /fees                        # Fee display components
│   ├── /loyalty                     # Loyalty program UI
│   ├── /menu                        # Menu display components
│   ├── /ordering                    # Ordering workflow components
│   ├── /social                      # Social media components
│   ├── /status                      # Status tracking UI
│   ├── AnnouncementBar.tsx          # Top announcement banner
│   ├── Navigation.tsx               # Header navigation
│   ├── NavigationWithAccount.tsx    # Nav with account menu
│   ├── HeroSection.tsx              # Hero banner
│   ├── HoursBadge.tsx               # Hours display
│   ├── MenuGrid.tsx                 # Menu item grid
│   ├── MenuItemModal.tsx            # Item detail modal (complex)
│   ├── ReviewCarousel.tsx           # Reviews slider
│   ├── SocialGrid.tsx               # Social media grid
│   ├── MapCard.tsx                  # Location map embed
│   ├── CartSheet.tsx                # Mobile cart drawer
│   ├── OptionPicker.tsx             # Item modifiers/options
│   ├── NewsletterForm.tsx           # Email signup
│   ├── SubscribeForm.tsx            # Alternative subscribe form
│   ├── FooterCompact.tsx            # Footer section
│   ├── StickyActionBar.tsx          # Fixed action bar
│   ├── BrandLogo.tsx                # Logo component
│   └── AutoUploadKazanImage.tsx     # Auto image upload utility
│
├── /hooks                           # Custom React hooks
│   └── useConfig.ts                 # Configuration loader from JSON
│
├── /lib                             # Core utilities and services
│   ├── /admin                       # Admin-specific utilities
│   │   └── api-client.ts            # Admin API client
│   ├── /auth                        # Authentication system
│   │   ├── AuthContext.tsx          # Auth context provider
│   │   ├── client.ts                # Auth client (Supabase)
│   │   ├── store.ts                 # Auth state store
│   │   └── types.ts                 # Auth type definitions
│   ├── /cart                        # Shopping cart logic
│   │   └── useCart.ts               # Cart state management
│   ├── /loyalty                     # Loyalty program logic
│   │   ├── client.ts                # Loyalty API client
│   │   ├── store.ts                 # Loyalty state
│   │   └── types.ts                 # Loyalty types
│   ├── /menu                        # Menu utilities
│   │   ├── categories.ts            # Category management
│   │   ├── filters.ts               # Menu filtering logic
│   │   ├── search.ts                # Menu search
│   │   └── pricing.ts               # Price unit handling
│   ├── /courier                     # Delivery integrations
│   │   ├── doordash.ts              # DoorDash API
│   │   └── uber.ts                  # Uber Eats API
│   ├── /config                      # Configuration utilities
│   │   └── delivery.ts              # Delivery zones config
│   ├── /instagram                   # Instagram feed integration
│   ├── /pos                         # POS system integrations
│   ├── /utils                       # Utility functions
│   ├── api-client.ts                # Main API client
│   ├── blog.ts                      # Blog utilities
│   ├── blog-images.ts               # Blog image handling
│   ├── cart.ts                      # Cart utilities
│   ├── config.ts                    # Config loader
│   ├── db.ts                        # Local storage database
│   ├── eta.ts                       # ETA calculations
│   ├── markdown.ts                  # Markdown parsing
│   ├── mock-api.ts                  # Development mock API
│   ├── pricing.ts                   # Price calculations
│   ├── recommendations.ts           # AI recommendations
│   ├── seo.ts                       # SEO utilities
│   ├── state.ts                     # Global state management
│   ├── tenant.ts                    # Multi-tenant utilities
│   ├── types.ts                     # TypeScript type definitions
│   └── validation.ts                # Input validation (Zod)
│
├── /styles                          # Global styles
│   └── globals.css                  # Tailwind config + design tokens
│
├── /data                            # Configuration files
│   ├── /sample                      # Sample/default configuration
│   │   ├── config.json              # Restaurant info, branding, integrations
│   │   ├── hours.json               # Operating hours
│   │   ├── menu.json                # Menu items and categories
│   │   ├── blog.json                # Blog posts
│   │   └── logo.png                 # Restaurant logo
│   ├── /demo                        # Demo data
│   └── delivery-zones.json          # Delivery area configuration
│
├── /public                          # Static assets
│
└── /guidelines                      # Documentation
    └── Guidelines.md                # Style and code guidelines
```

---

## Key Features & Functionality

### Core E-Commerce Features

**1. Shopping Cart**
- Add/remove items with quantity management
- Real-time subtotal calculation
- Persistent cart (localStorage)
- Mobile-optimized cart sheet (slide from bottom)
- Full cart page with item management

**2. Product Menu System**
- Browse products by category
- Real-time search across menu
- Dietary filters (Vegetarian, Vegan, Gluten-Free)
- Item detail modals with images, descriptions, options
- Price unit handling (per lb, per item, per dozen, etc.)
- "Popular" item badges
- Staggered animations for grid items

**3. Checkout Flow**
- Fulfillment selection (Pickup vs Delivery)
- Delivery address form with distance validation
- Time picker (ASAP or scheduled)
- Contact information collection
- Tip selector (preset percentages + custom)
- Mock Stripe payment form
- Order summary with fee breakdown (subtotal, delivery, tax, tip)
- Form validation and error handling

### Order Management

**4. Order Tracking & Status**
- Real-time order status updates
- Visual timeline with progress indicators (Placed → Confirmed → Preparing → Ready → Delivered)
- ETA display and countdown
- Live delivery tracking with map (ready for Google Maps)
- Different timelines for pickup vs delivery
- Order history in account dashboard
- Order detail pages with item breakdown

**5. Order Confirmation**
- Success messaging with order ID
- Estimated time display
- Email confirmation (mock ready for real email service)

### Customer Accounts

**6. User Authentication**
- Email/password authentication (Supabase)
- Phone number verification
- Account creation and login
- Session management with cookies
- Account dashboard with profile info

**7. Loyalty & Rewards Program**
- Points/stars earned per dollar spent (configurable)
- Reward tier thresholds
- Referral program with link sharing
- Rewards balance display
- Redeemable rewards listing
- Points history and earning breakdown

### Content & Engagement

**8. Blog System**
- Blog post listing with pagination
- Individual blog post pages with images
- Auto image upload from Instagram
- Blog post search and filtering
- Deduplication system for blog posts
- Related posts recommendation
- Markdown support for content

**9. Instagram Integration**
- Embedded Instagram feed (live or mock data)
- Auto-fetch from Instagram API (with fallback)
- Image grid display
- Follow buttons linking to social profiles

**10. Newsletter Signup**
- Email capture form
- Success/error handling with toast notifications
- Integration-ready for email services (Mailchimp, SendGrid)

### Business Features

**11. Hours & Availability**
- Weekly schedule display
- Real-time open/closed status
- Special closures/holidays support
- Time zone aware
- Beautiful hours badge component

**12. Location & Map**
- Full address display
- Google Maps embed ready
- "Get Directions" button
- Coordinates for delivery distance calculation

**13. Events & Catering**
- Event listing page
- Event description and details
- Catering inquiry form
- Event registration/booking links

**14. Contact & FAQ**
- Contact form with validation
- Phone and email display
- Frequently asked questions
- Hours and location info
- Social media links

### Admin Features

**15. Admin Dashboard**
- Product/menu management
- Price and unit management
- Blog post management and creation
- Image upload utilities
- Database connection testing
- Health check utilities
- Data migration tools (blog posts, menu items)
- Debug tools and logging

### Advanced Features

**16. AI Recommendations**
- AI-powered product recommendations
- Based on browsing history and purchases
- Personalized suggestions on homepage

**17. Multi-Tenant Architecture**
- Single codebase serves multiple restaurants
- Tenant-specific configuration files
- Isolated branding per tenant (colors, logo, name)
- Scalable to database-driven config

**18. SEO Optimization**
- Dynamic meta tags per page
- Semantic HTML structure
- Structured data ready
- Mobile-responsive design
- Fast performance (Lighthouse 95+ ready)

---

## Configuration Files

### Key Configuration Files Located at `/src/data/sample/`

**1. config.json** - Main configuration
- Restaurant name: "Shahirizada Fresh Market"
- Tagline: "Halal, never-frozen meats — freshly cut daily in Naperville"
- Theme colors (brand: #6B0F1A, accent: #E8D5BA)
- Contact info (phone, email)
- Address and GPS coordinates
- Integration settings:
  - POS: Toast
  - Ordering mode: Stripe
  - Pickup enabled: true
  - Delivery: DoorDash (max 8 miles)
  - Reservations: OpenTable
- Social media handles (Instagram: @akmammet)
- Instagram feed settings
- SEO meta tags
- Announcement banner text
- Newsletter and loyalty program config
- Feature toggles (catering, events, gift cards, careers)

**2. hours.json** - Operating hours
- Weekly schedule with opening/closing times
- Special closures/holidays
- Delivery time windows

**3. menu.json** - Product catalog
- Categories (Meats, Grocery, Prepared Foods, etc.)
- Menu items with:
  - Name, description, images
  - Prices and price units (per lb, per item, etc.)
  - Dietary tags
  - Popular/featured flags
  - Modifiers/options (toppings, sides, etc.)
  - Availability status

**4. blog.json** - Blog posts
- Post title, content, images
- Publication dates
- Author info
- Tags and categories

**5. delivery-zones.json** - Service areas
- Geographic boundaries for delivery
- Zone-specific fees
- Distance-based pricing

### Root Configuration
- **.npmrc** - JSR registry configuration
- **vite.config.ts** - Build tool configuration with path aliases
- **package.json** - Dependencies and scripts

---

## Development Setup

### Getting Started

```bash
npm install      # Install dependencies
npm run dev      # Start dev server on port 3000 (opens browser automatically)
npm run build    # Build for production to /build directory
```

### Scripts
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build

### Build Configuration
- Output directory: `/build`
- Target: ES2020+
- Dev server on port 3000 with auto-open
- Optimized for performance with code splitting and lazy loading

---

## Key Integrations & External Services

### Payment & Orders
- Stripe (payment processing)
- Toast (POS system)

### Delivery
- DoorDash (delivery provider)
- Uber Eats (ready for integration)

### Reservations
- OpenTable (table booking)

### Social & Marketing
- Instagram (feed embed and auto-upload)
- Facebook (links and integration)

### Backend
- Supabase (authentication, database, storage)
- Hono functions (serverless backend)

### Email Services
- Ready for Mailchimp, SendGrid integration

---

## Notable Technical Patterns

### State Management
- Local React state for UI
- Context API for auth (AuthContext)
- Custom hooks (useConfig, useCart)
- localStorage for persistent data (cart, user session)
- Zustand-like patterns in lib/state.ts for global state

### Data Persistence
- Supabase for production data (users, orders, rewards)
- localStorage for client-side caching (cart, session)
- Mock API (mock-api.ts) for development without backend

### Responsive Design
- Mobile-first approach with Tailwind breakpoints
- Sticky navigation for mobile
- Floating action buttons for mobile UX
- Touch-optimized UI with large tap targets

### Performance
- Code splitting by route
- Image lazy loading
- Memoization for expensive calculations
- Tree-shaking enabled
- Optimized bundle (~200KB gzipped target)

---

## Extensive Documentation

The project includes 90+ markdown documentation files covering:
- Architecture guides (ARCHITECTURE.md)
- Feature specifications (FEATURES.md, COMPONENTS.md)
- Admin quickstart (ADMIN_QUICKSTART.md)
- Cart system documentation (CART_SYSTEM.md)
- Loyalty program setup (CART_REWARDS_SYSTEM.md)
- Blog management (BLOG_CONNECTION_COMPLETE.md)
- Deployment guides (DEPLOYMENT.md)
- Configuration guides (CONFIGURATION.md, CUSTOMIZATION.md)
- Quick start guides (QUICKSTART.md)
- Migration tools documentation
- And many more including bug fixes, feature completions, and guides

---

## Store Information

- **Business Name**: Shahirizada Fresh Market
- **Location**: Naperville, Illinois
- **Business Type**: Halal meat market and grocery store
- **Specialty**: Never-frozen, freshly cut daily halal meats
- **Instagram**: @akmammet
- **Tagline**: "Halal, never-frozen meats — freshly cut daily in Naperville"

---

## Summary

**Shahirizada Meat Market** is a sophisticated, production-ready e-commerce and content management platform built for a halal meat market. It's a modern React + TypeScript web application featuring a complete online ordering system, customer loyalty program, user authentication, blog management, social media integration, and a robust admin dashboard. The architecture is designed to be multi-tenant (supporting multiple restaurants from a single codebase), mobile-first, SEO-optimized, and ready for deployment to production platforms like Vercel or Netlify.

The tech stack leverages React 18, Tailwind CSS, shadcn/ui components, and Supabase for a scalable, maintainable solution with extensive documentation and demo pages for testing and development.
