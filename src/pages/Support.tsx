import { motion } from 'motion/react';
import { Search, ShoppingBag, Truck, CreditCard, RefreshCw, MessageCircle, Phone, Mail } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Config } from '../hooks/useConfig';

interface SupportProps {
  config: Config;
  onNavigate?: (path: string) => void;
}

export const Support = ({ config, onNavigate }: SupportProps) => {
  const categories = [
    {
      icon: ShoppingBag,
      title: 'Ordering',
      description: 'How to place an order, modify cart, and payment methods.',
    },
    {
      icon: Truck,
      title: 'Delivery & Pickup',
      description: 'Delivery areas, fees, and pickup instructions.',
    },
    {
      icon: RefreshCw,
      title: 'Returns & Refunds',
      description: 'Our policy on freshness and refunds.',
    },
    {
      icon: CreditCard,
      title: 'Account & Billing',
      description: 'Manage your profile, rewards, and payment history.',
    },
  ];

  const faqs = [
    {
      question: 'Where do you deliver?',
      answer: `We currently offer local delivery in ${config.address.city} and surrounding areas. You can check if we deliver to your address during checkout.`,
    },
    {
      question: 'How do I track my order?',
      answer: 'Once your order is confirmed, you will receive a tracking link via SMS or email. You can also track your order status in the "My Orders" section of your account.',
    },
    {
      question: 'What if an item is out of stock?',
      answer: 'We strive to keep our inventory updated in real-time. If an item becomes unavailable after you place an order, we will contact you immediately to offer a substitution or a refund.',
    },
    {
      question: 'Can I cancel or modify my order?',
      answer: 'Please contact us as soon as possible if you need to make changes. If the order has not yet been prepared, we can usually accommodate modifications.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div 
        className="py-16 sm:py-24 text-center text-white relative overflow-hidden"
        style={{ backgroundColor: config.theme.brand }}
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">How can we help you?</h1>
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for answers..."
                className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 -mt-8 relative z-20">
        {/* Support Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {categories.map((category, index) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 h-full hover:shadow-lg transition-shadow cursor-pointer bg-white">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${config.theme.brand}15` }}
                >
                  <category.icon className="w-6 h-6" style={{ color: config.theme.brand }} />
                </div>
                <h3 className="font-semibold text-lg mb-2">{category.title}</h3>
                <p className="text-gray-600 text-sm">{category.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Common Questions */}
        <div className="max-w-3xl mx-auto mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="p-6">
                <h3 className="font-semibold mb-2 text-lg">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* Contact Options */}
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-8">Still need help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 flex flex-col items-center">
              <Phone className="w-8 h-8 mb-4 text-gray-400" />
              <h3 className="font-semibold mb-2">Call Us</h3>
              <p className="text-gray-600 text-sm mb-4">Talk to a support specialist</p>
              <a href={`tel:${config.contact.phone}`}>
                <Button variant="outline" className="w-full">
                  {config.contact.phone}
                </Button>
              </a>
            </Card>

            <Card className="p-6 flex flex-col items-center">
              <Mail className="w-8 h-8 mb-4 text-gray-400" />
              <h3 className="font-semibold mb-2">Email Us</h3>
              <p className="text-gray-600 text-sm mb-4">Response within 24 hours</p>
              <a href={`mailto:${config.contact.email}`}>
                <Button variant="outline" className="w-full">
                  Send Email
                </Button>
              </a>
            </Card>

            <Card className="p-6 flex flex-col items-center">
              <MessageCircle className="w-8 h-8 mb-4 text-gray-400" />
              <h3 className="font-semibold mb-2">Chat</h3>
              <p className="text-gray-600 text-sm mb-4">Available during business hours</p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => onNavigate?.('/contact')}
              >
                Start Chat
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
