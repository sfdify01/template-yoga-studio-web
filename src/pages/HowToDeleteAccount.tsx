import { motion } from 'motion/react';
import { Mail, UserX, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Config } from '../hooks/useConfig';

interface HowToDeleteAccountProps {
  config: Config;
}

export const HowToDeleteAccount = ({ config }: HowToDeleteAccountProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div
        className="py-16 sm:py-20 text-center text-white relative overflow-hidden"
        style={{ backgroundColor: config.theme.brand }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <UserX className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h1 className="text-3xl sm:text-4xl font-bold">Delete Your Account</h1>
            <p className="mt-3 opacity-90">{config.name} App (us.tabsy.shahirizada)</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Steps to Delete */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: config.theme.brand }} />
              Steps to Request Account Deletion
            </h2>

            <ol className="space-y-4">
              <li className="flex gap-3">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: config.theme.brand }}
                >
                  1
                </span>
                <div>
                  <p className="font-medium">Send an email to one of our support addresses</p>
                  <p className="text-gray-600 text-sm mt-1">
                    Use <strong>partner@sfdify.com</strong> or <strong>info@sfdify.com</strong>
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: config.theme.brand }}
                >
                  2
                </span>
                <div>
                  <p className="font-medium">Include "Account Deletion Request" in the subject line</p>
                </div>
              </li>

              <li className="flex gap-3">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: config.theme.brand }}
                >
                  3
                </span>
                <div>
                  <p className="font-medium">Provide the following information in your email:</p>
                  <ul className="text-gray-600 text-sm mt-2 space-y-1 list-disc list-inside">
                    <li>Your registered email address or phone number</li>
                    <li>Restaurant/branch name: <strong>{config.name}</strong></li>
                    <li>App ID: <strong>us.tabsy.shahirizada</strong></li>
                  </ul>
                </div>
              </li>

              <li className="flex gap-3">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium"
                  style={{ backgroundColor: config.theme.brand }}
                >
                  4
                </span>
                <div>
                  <p className="font-medium">Wait for confirmation</p>
                  <p className="text-gray-600 text-sm mt-1">
                    We will verify your identity and process your request within 7 business days.
                  </p>
                </div>
              </li>
            </ol>
          </Card>
        </motion.div>

        {/* Data Deletion Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 sm:p-8 mb-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Trash2 className="w-5 h-5" style={{ color: config.theme.brand }} />
              What Data Will Be Deleted
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-green-700 mb-2">Immediately Deleted:</h3>
                <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
                  <li>Your profile information (name, email, phone number)</li>
                  <li>Saved addresses</li>
                  <li>Loyalty points and rewards</li>
                  <li>Saved payment methods</li>
                  <li>Cart and wishlist items</li>
                  <li>App preferences and settings</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-amber-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Retained for 30 Days (then deleted):
                </h3>
                <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
                  <li>Order history (for refund/dispute purposes)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Retained for Legal Compliance:</h3>
                <ul className="text-gray-600 text-sm space-y-1 list-disc list-inside">
                  <li>Transaction records (retained for 7 years as required by tax law)</li>
                  <li>This data is anonymized and cannot be linked back to you</li>
                </ul>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" style={{ color: config.theme.brand }} />
              Contact Us
            </h2>

            <div className="space-y-3">
              <a
                href="mailto:partner@sfdify.com?subject=Account Deletion Request - us.tabsy.shahirizada"
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-gray-200"
              >
                <span className="text-sm text-gray-500">Primary Contact:</span>
                <span className="block text-lg font-medium" style={{ color: config.theme.brand }}>
                  partner@sfdify.com
                </span>
              </a>

              <a
                href="mailto:info@sfdify.com?subject=Account Deletion Request - us.tabsy.shahirizada"
                className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-2 border-transparent hover:border-gray-200"
              >
                <span className="text-sm text-gray-500">Alternative Contact:</span>
                <span className="block text-lg font-medium" style={{ color: config.theme.brand }}>
                  info@sfdify.com
                </span>
              </a>
            </div>
          </Card>
        </motion.div>

        <p className="text-center text-gray-500 text-sm mt-8">
          Questions? We're here to help. Response time is typically within 24-48 hours.
        </p>
      </div>
    </div>
  );
};
