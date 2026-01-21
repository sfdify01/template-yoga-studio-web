// Client-side configuration
// Configuration is loaded from the backend API at runtime
// DO NOT hardcode any API keys, secrets, or credentials here

export const config = {
  // Stripe configuration is fetched from /market-server/payments/config endpoint
  // See: src/lib/orders/api.ts - fetchStripeConfig()
};

// Helper to check if a service is configured
export function isConfigured(service: keyof typeof config): boolean {
  const serviceConfig = config[service];
  if (!serviceConfig) return false;

  // Check if all non-URL values are filled
  return Object.entries(serviceConfig).some(([key, value]) => {
    return !key.toLowerCase().includes('url') && value && value !== '';
  });
}
