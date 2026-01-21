/**
 * Map of Uber Direct error codes to user-friendly messages.
 * These are the most common errors from the Uber Direct API.
 */
const UBER_ERROR_MESSAGES: Record<string, string> = {
    // Authorization/Payment errors
    'authorization_hold': "Delivery service is temporarily unavailable. Please choose pickup or try again later.",
    'payment_method_invalid': "There was a payment issue with delivery. Please choose pickup or try again.",
    'insufficient_funds': "Unable to process delivery payment. Please choose pickup or contact support.",

    // Address/Location errors
    'address_undeliverable': "We cannot deliver to this address. Please check the address or choose pickup.",
    'address_undeliverable_limited_couriers': "Delivery is currently unavailable due to high demand or weather conditions. Please try again later or choose pickup.",
    'invalid_address': "The delivery address seems invalid. Please check the street and zip code.",
    'dropoff_address_undeliverable': "We cannot deliver to this address. Please check the address or choose pickup.",
    'pickup_address_invalid': "Store address issue. Please contact support or choose pickup.",

    // Quote errors
    'quote_expired': "The delivery quote has expired. Please try again.",
    'invalid_quote': "The delivery quote is no longer valid. Please refresh and try again.",

    // Courier availability errors
    'no_couriers_available': "All delivery drivers are currently busy. Please try again in a few minutes or choose pickup.",
    'couriers_busy': "All delivery drivers are currently busy. Please try again in a few minutes or choose pickup.",
    'no_couriers': "No delivery drivers available right now. Please try again later or choose pickup.",

    // Distance/Range errors
    'distance_too_far': "Your address is outside our delivery range. Please choose pickup instead.",
    'out_of_range': "Your address is outside our delivery range. Please choose pickup instead.",
    'dropoff_too_far': "Your address is too far for delivery. Please choose pickup instead.",

    // Store/Business errors
    'store_closed': "We're not currently accepting delivery orders. Please try pickup or come back later.",
    'merchant_not_accepting': "We're not currently accepting delivery orders. Please try pickup or come back later.",

    // Item/Order errors
    'manifest_invalid': "There was an issue with your order items. Please try again.",
    'order_too_large': "Your order is too large for delivery. Please contact us for other options.",
};

/**
 * Convert technical delivery/order errors into user-friendly messages
 */
export function getFriendlyDeliveryError(error: any): string {
    const message = error?.message || String(error);
    const lowerMessage = message.toLowerCase();

    // Log the raw error for debugging
    console.error("Raw delivery error:", message);

    // First, try to extract error code from formatted message: "[error_code] message"
    const codeMatch = message.match(/\[([^\]]+)\]/);
    if (codeMatch) {
        const errorCode = codeMatch[1].toLowerCase();
        const friendlyMessage = UBER_ERROR_MESSAGES[errorCode];
        if (friendlyMessage) {
            return friendlyMessage;
        }
    }

    // Check each known error code/keyword in the message
    for (const [code, friendlyMessage] of Object.entries(UBER_ERROR_MESSAGES)) {
        if (lowerMessage.includes(code.toLowerCase())) {
            return friendlyMessage;
        }
    }

    // Uber Direct: Courier dispatch failed (generic)
    if (lowerMessage.includes('failed to dispatch courier') || lowerMessage.includes('courier dispatch')) {
        return "We couldn't find a driver for your delivery right now. Please try again or choose pickup.";
    }

    // Uber Direct: Field converter error (address parsing issue)
    if (lowerMessage.includes('fieldconverter error') || lowerMessage.includes('field converter')) {
        return "The delivery address couldn't be processed. Please check and try again.";
    }

    // Generic fallback for technical errors
    // If it contains JSON-like structure or specific technical prefixes, show a friendly message
    if (
        message.includes('{') ||
        lowerMessage.includes('uber quote failed') ||
        lowerMessage.includes('uber delivery failed') ||
        lowerMessage.includes('uber auth failed') ||
        lowerMessage.includes('request failed') ||
        lowerMessage.includes('502') ||
        lowerMessage.includes('500') ||
        lowerMessage.includes('http ')
    ) {
        return "We're having trouble connecting to our delivery service. Please try again or choose pickup.";
    }

    // If it's already a reasonably clean message (no JSON, short), return it
    if (!message.includes('{') && !message.includes('Error:') && message.length < 150) {
        return message;
    }

    // Ultimate fallback
    return "Something went wrong with delivery. Please try again or choose pickup.";
}

/**
 * Convert technical order placement errors into user-friendly messages
 */
export function getFriendlyOrderError(error: any): string {
    const message = error?.message || String(error);

    // Log the raw error for debugging
    console.error("Raw order error:", message);

    // First check for delivery-specific errors
    const deliveryError = getFriendlyDeliveryError(error);
    if (deliveryError !== message) {
        return deliveryError;
    }

    // Payment errors
    if (message.includes('Payment') || message.includes('payment')) {
        if (message.includes('declined')) {
            return "Your payment was declined. Please try a different payment method.";
        }
        if (message.includes('expired')) {
            return "Your payment session expired. Please try again.";
        }
        if (message.includes('insufficient')) {
            return "Insufficient funds. Please try a different payment method.";
        }
        return "There was a problem processing your payment. Please try again.";
    }

    // Cart/inventory errors
    if (message.includes('out of stock') || message.includes('unavailable')) {
        return "Some items in your cart are no longer available. Please review your cart.";
    }

    if (message.includes('cart is empty')) {
        return "Your cart is empty. Please add items before checking out.";
    }

    // Server errors
    if (message.includes('500') || message.includes('server error')) {
        return "We're experiencing technical difficulties. Please try again in a moment.";
    }

    if (message.includes('timeout') || message.includes('timed out')) {
        return "The request took too long. Please check your connection and try again.";
    }

    // If it's already a reasonably clean message, return it
    if (!message.includes('{') && !message.includes('Error:') && message.length < 200) {
        return message;
    }

    // Generic fallback
    return "Something went wrong placing your order. Please try again.";
}
