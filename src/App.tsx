import { useState, useEffect } from 'react';
import { NavigationWithAccount } from './components/NavigationWithAccount';
import { AnnouncementBar } from './components/AnnouncementBar';
import { StickyActionBar } from './components/StickyActionBar';
import { FooterCompact } from './components/FooterCompact';
import { AuthProvider } from './lib/auth/AuthContext';
import { Home } from './pages/Home';
import { MenuPage } from './pages/Menu';
import { Status } from './pages/Status';
import { Confirmation } from './pages/Confirmation';
import { Checkout } from './pages/Checkout';
import { AboutPage } from './pages/About';
import { EventsPage } from './pages/Events';
import { ContactPage } from './pages/Contact';
import { BlogPage } from './pages/Blog';
import { BlogPostPage } from './pages/BlogPost';
import { Login } from './pages/Login';
import { Verify } from './pages/Verify';
import { Account } from './pages/Account';
import { AccountOrders } from './pages/AccountOrders';
import { AccountOrderDetail } from './pages/AccountOrderDetail';
import { AccountRewards } from './pages/AccountRewards';
import { AccountReferrals } from './pages/AccountReferrals';
import { TrackOrder } from './pages/TrackOrder';
import { Loyalty } from './pages/Loyalty';
import UniversalMenuDemo from './pages/UniversalMenuDemo';
import OrderingFlowDemo from './pages/OrderingFlowDemo';
import UploadBlogImages from './pages/UploadBlogImages';
import { Admin } from './pages/Admin';
import { AdminSimple } from './pages/AdminSimple';
import { MigrateBlogPosts } from './pages/MigrateBlogPosts';
import { AdminHealth } from './pages/AdminHealth';
import { OrderChooser } from './components/ordering/OrderChooser';
import { useConfig } from './hooks/useConfig';
import { Toaster } from './components/ui/sonner';
import { getRelatedPosts } from './lib/blog';
import { AutoUploadKazanImage } from './components/AutoUploadKazanImage';
import { SMSConsentDemo } from './pages/SMSConsentDemo';
import { TipSelectorDemo } from './pages/TipSelectorDemo';
import { startVersionCheck, stopVersionCheck } from './lib/version-check';
import { initOneSignal } from './lib/onesignal/client';
import { SmartCart } from './components/cart/SmartCart';
import { ResetPassword } from './pages/ResetPassword';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { Support } from './pages/Support';
import { HowToDeleteAccount } from './pages/HowToDeleteAccount';
import { MobileAppBanner } from './components/MobileAppBanner';
import { GiftCardsPage } from './pages/GiftCards';
import { CareersPage } from './pages/Careers';

export default function App() {
  const { config, hours, menu, blog } = useConfig();
  const [showAnnouncementBar, setShowAnnouncementBar] = useState(true);
  const [showMobileAppBanner, setShowMobileAppBanner] = useState(true);
  const [mobileBannerVisible, setMobileBannerVisible] = useState(false);

  const ANNOUNCEMENT_BAR_HEIGHT = 40;
  const MOBILE_APP_BANNER_HEIGHT = 64;

  // Initialize from actual browser URL (pathname only, not query params)
  const getInitialPath = () => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  };

  const [currentPath, setCurrentPath] = useState(getInitialPath());
  const [orderChooserOpen, setOrderChooserOpen] = useState(false);

  // Handler to open order chooser
  const openOrderChooser = () => {
    setOrderChooserOpen(true);
  };

  // Handler for order mode selection
  const handleOrderModeSelect = (mode: 'pickup' | 'delivery') => {
    // TODO: Implement inline checkout flow with selected mode
    console.log('Selected order mode:', mode);
    handleNavigate('/products');
  };

  // SEO - Update document title based on route
  useEffect(() => {
    if (config) {
      const titles: { [key: string]: string } = {
        '/': config.seo.title,
        '/products': `Products | ${config.name}`,
        '/menu': `Products | ${config.name}`, // Backward compatibility
        '/checkout': `Checkout | ${config.name}`,
        '/about': `About Us | ${config.name}`,
        '/events': `Events & Catering | ${config.name}`,
        '/blog': `Blog | ${config.name}`,
        '/contact': `Contact | ${config.name}`,
        '/login': `Sign In | ${config.name}`,
        '/verify': `Verify Code | ${config.name}`,
        '/reset-password': `Reset Password | ${config.name}`,
        '/account': `My Account | ${config.name}`,
        '/account/orders': `My Orders | ${config.name}`,
        '/account/rewards': `My Rewards | ${config.name}`,
        '/account/referrals': `Referrals | ${config.name}`,
        '/track': `Track Order | ${config.name}`,
        '/loyalty': `Loyalty Rewards | ${config.name}`,
        '/privacy-policy': `Privacy Policy | ${config.name}`,
        '/support': `Support Center | ${config.name}`,
        '/how-to-delete-account': `Delete Account | ${config.name}`,
      };

      // Handle dynamic routes
      let title = config.seo.title;
      if (currentPath.startsWith('/status/')) {
        title = `Order Status | ${config.name}`;
      } else if (currentPath.startsWith('/confirm/')) {
        title = `Order Confirmed | ${config.name}`;
      } else if (currentPath.startsWith('/track/')) {
        title = `Track Order | ${config.name}`;
      } else if (currentPath.startsWith('/account/orders/')) {
        title = `Order Details | ${config.name}`;
      } else {
        title = titles[currentPath] || config.seo.title;
      }

      document.title = title;

      // Update meta viewport
      let metaViewport = document.querySelector('meta[name="viewport"]');
      if (!metaViewport) {
        metaViewport = document.createElement('meta');
        metaViewport.setAttribute('name', 'viewport');
        document.head.appendChild(metaViewport);
      }
      metaViewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');

      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', config.seo.description);
      }
    }
  }, [currentPath, config]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPath]);

  // Ensure body scroll is enabled on mount (fix for iOS Safari scroll lock issue)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Reset any lingering scroll locks
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';

      // Ensure touch scrolling works on iOS Safari
      document.body.style.touchAction = 'pan-y';
      document.documentElement.style.touchAction = 'pan-y';

      // Force a reflow to ensure styles are applied
      void document.body.offsetHeight;
    }
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const newPath = window.location.pathname || '/';
      setCurrentPath(newPath);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle referral attribution on page load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');

      if (refCode) {
        // Dynamically import to avoid circular dependencies
        import('./lib/loyalty/client').then(({ trackReferralClick }) => {
          trackReferralClick(refCode);
        });
      }
    }
  }, []);

  // Start version checking to ensure users always have latest code
  useEffect(() => {
    startVersionCheck();
    return () => stopVersionCheck();
  }, []);

  // Initialize OneSignal for push notifications (used by admin dashboard)
  useEffect(() => {
    // Only initialize on admin routes to avoid unnecessary overhead
    if (currentPath.startsWith('/admin')) {
      initOneSignal().catch((err) => {
        console.warn('[OneSignal] Init failed (non-critical):', err);
      });
    }
  }, [currentPath]);

  const handleNavigate = (path: string) => {
    // Update browser URL without reload (for query params and history)
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }

    // Extract base path (without query params)
    const basePath = path.split('?')[0];

    setCurrentPath(basePath);
  };

  // Admin routes - /admin, /admin/orders, /admin/settings
  if (currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    console.log('Rendering Admin route');
    try {
      return (
        <AuthProvider>
          <Admin />
        </AuthProvider>
      );
    } catch (error) {
      console.error('Error rendering Admin:', error);
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-md bg-white p-8 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Admin Route Error</h1>
            <p className="mb-4">Failed to render the admin page. Check console for details.</p>
            <div className="space-y-2">
              <a href="/admin-simple" className="block px-4 py-2 bg-blue-600 text-white rounded text-center">
                Try Simple Admin Test
              </a>
              <a href="/admin-health" className="block px-4 py-2 bg-green-600 text-white rounded text-center">
                Run Health Check
              </a>
              <a href="/" className="block px-4 py-2 bg-gray-600 text-white rounded text-center">
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  if (currentPath === '/reset-password') {
    return <ResetPassword onNavigate={handleNavigate} />;
  }

  // Simple admin test
  if (currentPath === '/admin-simple') {
    return <AdminSimple />;
  }

  // Migrate blog posts
  if (currentPath === '/migrate-blog') {
    return <MigrateBlogPosts />;
  }

  // Admin health check
  if (currentPath === '/admin-health') {
    return <AdminHealth />;
  }

  // Loading state
  if (!config || !hours || !menu || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"
          />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render current page
  const renderPage = () => {
    // Handle dynamic routes like /status/:id
    if (currentPath.startsWith('/status/')) {
      const orderId = currentPath.split('/')[2];
      return <Status orderId={orderId} onNavigate={handleNavigate} config={config} />;
    }

    // Handle confirmation routes /confirm/:id
    if (currentPath.startsWith('/confirm/')) {
      const orderId = currentPath.split('/')[2];
      return <Confirmation orderId={orderId} onNavigate={handleNavigate} config={config} />;
    }

    // Handle blog post routes /blog/:slug
    if (currentPath.startsWith('/blog/') && currentPath !== '/blog') {
      const slug = currentPath.split('/')[2];
      const posts = blog?.posts || [];
      const post = posts.find(p => p.slug === slug);
      if (post) {
        const relatedPosts = getRelatedPosts(post, posts, 3);
        return (
          <BlogPostPage
            post={post}
            relatedPosts={relatedPosts}
            brandColor={config.theme.brand}
            onNavigate={handleNavigate}
            onPostClick={(slug) => handleNavigate(`/blog/${slug}`)}
          />
        );
      }
    }

    // Handle track order routes /track/:orderNumber
    if (currentPath.startsWith('/track/')) {
      const orderNumber = currentPath.split('/')[2];
      return <TrackOrder orderNumber={orderNumber} onNavigate={handleNavigate} brandColor={config.theme.brand} />;
    }

    // Handle account order detail routes /account/orders/:id
    if (currentPath.startsWith('/account/orders/') && currentPath !== '/account/orders') {
      const orderId = currentPath.split('/')[3];
      return <AccountOrderDetail orderId={orderId} onNavigate={handleNavigate} config={config} brandColor={config.theme.brand} />;
    }

    switch (currentPath) {
      case '/':
        return <Home config={config} hours={hours} menu={menu} blog={blog} onNavigate={handleNavigate} onOrderNow={() => handleNavigate('/products')} />;
      case '/products':
      case '/menu': // Backward compatibility redirect
        return <MenuPage config={config} menu={menu} onNavigate={handleNavigate} showAnnouncementBar={showAnnouncementBar} />;
      case '/checkout':
        return <Checkout onNavigate={handleNavigate} brandColor={config.theme.brand} />;
      case '/blog':
        return (
          <BlogPage
            posts={blog?.posts || []}
            categories={blog?.categories || []}
            brandColor={config.theme.brand}
            brandName={config.name}
            onPostClick={(slug) => handleNavigate(`/blog/${slug}`)}
          />
        );
      case '/about':
        return <AboutPage config={config} />;
      case '/events':
        return <EventsPage config={config} />;
      case '/contact':
        return <ContactPage config={config} hours={hours} onNavigate={handleNavigate} />;
      case '/login':
        return <Login onNavigate={handleNavigate} brandColor={config.theme.brand} />;
      case '/verify':
        return <Verify onNavigate={handleNavigate} brandColor={config.theme.brand} />;
      case '/account':
        return <Account onNavigate={handleNavigate} brandColor={config.theme.brand} />;
      case '/account/orders':
        return <AccountOrders onNavigate={handleNavigate} brandColor={config.theme.brand} />;
      case '/account/rewards':
        return <AccountRewards onNavigate={handleNavigate} brandColor={config.theme.brand} />;
      case '/account/referrals':
        return <AccountReferrals onNavigate={handleNavigate} config={config} brandColor={config.theme.brand} />;
      case '/track':
        return <TrackOrder onNavigate={handleNavigate} brandColor={config.theme.brand} />;
      case '/loyalty':
        return <Loyalty onNavigate={handleNavigate} onOrderNow={openOrderChooser} brandColor={config.theme.brand} />;
      case '/admin':
        return <Admin />;
      case '/demo/universal-modal':
        return <UniversalMenuDemo />;
      case '/demo/ordering-flow':
        return <OrderingFlowDemo />;
      case '/demo/sms-consent':
        return <SMSConsentDemo />;
      case '/demo/tip-selector':
        return <TipSelectorDemo />;
      case '/upload-blog-images':
        return <UploadBlogImages />;
      case '/privacy-policy':
        return <PrivacyPolicy config={config} />;
      case '/support':
        return <Support config={config} onNavigate={handleNavigate} />;
      case '/how-to-delete-account':
        return <HowToDeleteAccount config={config} />;
      case '/gift-cards':
        return <GiftCardsPage config={config} onNavigate={handleNavigate} />;
      case '/careers':
        return <CareersPage config={config} onNavigate={handleNavigate} />;
      default:
        return <Home config={config} hours={hours} menu={menu} blog={blog} onNavigate={handleNavigate} onOrderNow={openOrderChooser} />;
    }
  };

  // Hide footer and sticky bar on auth pages and admin
  const hideFooter = currentPath === '/login' || currentPath === '/verify' || currentPath === '/admin';
  const showAnnouncement = !!(config.announcement && !hideFooter && showAnnouncementBar);
  const showMobileBanner = !hideFooter && showMobileAppBanner && mobileBannerVisible;
  const topBannerOffset = (showMobileBanner ? MOBILE_APP_BANNER_HEIGHT : 0) + (showAnnouncement ? ANNOUNCEMENT_BAR_HEIGHT : 0);
  const mainPaddingMobile = 64 + topBannerOffset;
  const mainPaddingDesktop = 80 + topBannerOffset;

  return (
    <AuthProvider>
      <div className="w-full min-h-screen flex flex-col">
        {/* Auto-upload Kazan Kebab image to Supabase Storage */}
        <AutoUploadKazanImage />

        {/* Mobile App Download Banner - only shows on mobile devices */}
        {!hideFooter && showMobileAppBanner && (
          <MobileAppBanner
            brandColor={config.theme.brand}
            onVisibilityChange={setMobileBannerVisible}
          />
        )}

        {/* Announcement Bar */}
        {showAnnouncement && (
          <AnnouncementBar
            message={config.announcement}
            brandColor={config.theme.brand}
            topOffset={showMobileBanner ? MOBILE_APP_BANNER_HEIGHT : 0}
            onClose={() => setShowAnnouncementBar(false)}
          />
        )}

        {/* Navigation */}
        <NavigationWithAccount
          brandName={config.name}
          brandColor={config.theme.brand}
          phone={config.contact.phone}
          onNavigate={handleNavigate}
          currentPath={currentPath}
          hasAnnouncementBar={showAnnouncement}
          topOffset={topBannerOffset}
        />

        {/* Main Content - Add top padding to account for fixed header + announcement bar */}
        <main
          className="w-full flex-1"
          style={{
            paddingTop: `${mainPaddingMobile}px`
          }}
        >
          <style>{`
              @media (min-width: 640px) {
                main {
                  padding-top: ${mainPaddingDesktop}px !important;
                }
              }
            `}</style>
          {renderPage()}
        </main>

        {/* Footer */}
        {!hideFooter && <FooterCompact config={config} onNavigate={handleNavigate} />}

        {/* Mobile Sticky Action Bar */}
        {!hideFooter && (
          <StickyActionBar
            brandColor={config.theme.brand}
            phone={config.contact.phone}
            address={config.address}
            onNavigate={handleNavigate}
          />
        )}

        {/* Toast Notifications */}
        <Toaster />

        {/* Global Smart Cart - Available on all pages */}
        {!hideFooter && (
          <SmartCart
            brandColor={config.theme.brand}
            onNavigate={handleNavigate}
            menu={menu}
            hasAnnouncementBar={showAnnouncement}
            topOffsetMobile={`${64 + topBannerOffset}px`}
            topOffsetDesktop={`${80 + topBannerOffset}px`}
            loyaltyConfig={config.loyalty}
          />
        )}

        {/* Order Chooser Modal */}
        <OrderChooser
          open={orderChooserOpen}
          onClose={() => setOrderChooserOpen(false)}
          onSelectMode={handleOrderModeSelect}
          brandColor={config.theme.brand}
        />
      </div>
    </AuthProvider>
  );
}
