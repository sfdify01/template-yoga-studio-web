import * as Sentry from "@sentry/react";

// Detect environment based on hostname
const getSentryEnvironment = (): string => {
  if (typeof window === "undefined") return "development";
  const hostname = window.location.hostname;
  if (hostname === "shahirizadameatmarket.com" || hostname === "www.shahirizadameatmarket.com") {
    return "production";
  }
  if (hostname === "test.shahirizadameatmarket.com") {
    return "test";
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "development";
  }
  return "development";
};

// Initialize Sentry as early as possible
Sentry.init({
  dsn: "https://585e5e305b51004a62c76213edd0fa7f@o4510465657864192.ingest.us.sentry.io/4510465659043840",
  environment: getSentryEnvironment(),
  enabled: typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname), // Only enable on deployed environments
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // Sample 10% of sessions
  replaysOnErrorSampleRate: 1.0, // Sample 100% of sessions with errors
  // Send default PII data
  sendDefaultPii: true,
});

import { createRoot } from "react-dom/client";
import { Provider as JotaiProvider } from "jotai";
import App from "./App.tsx";
import "./index.css";
import "./styles/globals.css";

const disableStripeDevTools = () => {
  // Only run in browser environment
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const selectors = [
    '#__stripe-dev-tools',
    '#__stripe-testing-tools-toggle',
    'stripe-testing-tools-toggle',
    'stripe-testing-provider',
    '[aria-label="Stripe Testing Tools"]',
    '[data-testid="stripe-testing-tools-toggle"]',
    '.StripeTestingTools',
    '.StripeTestingTools__Toggle',
  ];

  const hide = () => {
    document.body.classList.add("hide-stripe-test-helper");
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.remove();
      });
    });
  };

  hide();

  // Continuously monitor and remove any Stripe dev tools that try to appear
  const observer = new MutationObserver(() => hide());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("beforeunload", () => observer.disconnect());
};

disableStripeDevTools();

createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary
    fallback={({ error }) => (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-4">
            We've been notified and are working to fix the issue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )}
    showDialog
  >
    <JotaiProvider>
      <App />
    </JotaiProvider>
  </Sentry.ErrorBoundary>
);
