import { motion } from 'motion/react';
import { Config } from '../hooks/useConfig';

interface PrivacyPolicyProps {
  config: Config;
}

export const PrivacyPolicy = ({ config }: PrivacyPolicyProps) => {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div 
        className="py-10 sm:py-12 md:py-16 text-white text-center"
        style={{ backgroundColor: config.theme.brand }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-white mb-3 sm:mb-4" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', lineHeight: '1.2' }}>Privacy Policy & Terms of Use</h1>
            <p className="text-white/90">Effective Date: {new Date().toLocaleDateString()}</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="prose prose-lg max-w-none text-gray-600"
        >
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
            <p className="text-sm text-blue-700 m-0">
              <strong>Note:</strong> This document outlines how {config.name} collects, uses, and protects your data. By using our services, you agree to these terms.
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
          <p>We collect information to provide better services to all our users. The types of information we collect include:</p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Personal Identification:</strong> Name, phone number, email address, and physical address for delivery.</li>
            <li><strong>Order Information:</strong> Details of the products you purchase, special instructions, and transaction history.</li>
            <li><strong>Payment Information:</strong> We use third-party payment processors (Stripe) to handle payments. We do not store your full credit card information on our servers.</li>
            <li><strong>Technical Data:</strong> IP address, browser type, device information, and usage data to improve our platform.</li>
            <li><strong>Location Data:</strong> We may collect your location to facilitate delivery services and estimated arrival times.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
          <p>Your information is used for the following purposes:</p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Order Fulfillment:</strong> To process and deliver your orders via our delivery partners (including Uber Direct).</li>
            <li><strong>Communication:</strong> To send order confirmations, updates, and delivery notifications via SMS (Twilio) or email.</li>
            <li><strong>Customer Support:</strong> To assist you with inquiries, refunds, or issues with your orders.</li>
            <li><strong>Loyalty Program:</strong> To track your points and rewards if you participate in our loyalty program.</li>
            <li><strong>Improvement:</strong> To analyze trends and improve our website, menu, and services.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Sharing and Third Parties</h2>
          <p>We do not sell your personal data. However, we share necessary information with trusted third-party service providers to operate our business:</p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li><strong>Payment Processing:</strong> We use <strong>Stripe</strong> for secure payment processing. Your payment details are tokenized and processed directly by Stripe.</li>
            <li><strong>Delivery Services:</strong> We partner with <strong>Uber Direct</strong> and other local couriers to deliver your orders. We share your name, phone number, and delivery address with them solely for delivery purposes.</li>
            <li><strong>Notifications:</strong> We use <strong>Twilio</strong> to send automated SMS updates regarding your order status.</li>
            <li><strong>Maps & Address Validation:</strong> We use <strong>Google Maps API</strong> to validate addresses and calculate delivery routes.</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cookies and Local Storage</h2>
          <p>We use local storage and cookies to enhance your experience, such as remembering your cart items, guest profile, and login status. You can control cookie preferences through your browser settings, though this may affect site functionality.</p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information. Payment transactions are encrypted using SSL technology. While we strive to protect your data, no method of transmission over the Internet is 100% secure.</p>

          <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal information. If you wish to exercise these rights or have questions about your data, please contact us.</p>

          <hr className="my-10 border-gray-200" />

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms of Use</h2>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h3>
          <p className="mb-4">By accessing our website and placing orders, you agree to be bound by these Terms of Use and our Privacy Policy.</p>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">2. Orders and Cancellations</h3>
          <p className="mb-4">We reserve the right to refuse or cancel any order for any reason, including availability, errors in pricing, or suspicion of fraud. If we cancel an order, we will issue a full refund.</p>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">3. Refund Policy</h3>
          <p className="mb-4">We take pride in our fresh products. If you are unsatisfied with your order, please contact us within 24 hours of delivery/pickup. Refunds are issued at our discretion based on the nature of the issue.</p>

          <h3 className="text-xl font-semibold text-gray-900 mb-2">4. User Conduct</h3>
          <p className="mb-4">You agree not to misuse our services, including but not limited to submitting false orders, interfering with our site's security, or using our content without permission.</p>

          <hr className="my-10 border-gray-200" />

          <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
          <p className="mb-4">If you have any questions about this Privacy Policy or our Terms, please contact us:</p>
          <div className="bg-gray-50 p-6 rounded-xl">
            <p className="font-semibold text-gray-900">{config.name}</p>
            <p>{config.address.line1}</p>
            <p>{config.address.city}, {config.address.state} {config.address.zip}</p>
            <p className="mt-4">
              <strong>Email:</strong> <a href={`mailto:${config.contact.email}`} className="text-blue-600 hover:underline">{config.contact.email}</a>
            </p>
            <p>
              <strong>Phone:</strong> <a href={`tel:${config.contact.phone}`} className="text-blue-600 hover:underline">{config.contact.phone}</a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};