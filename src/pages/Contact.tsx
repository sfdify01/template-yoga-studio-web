import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { MapCard } from '../components/MapCard';
import { HoursBadge } from '../components/HoursBadge';
import { CateringPromo } from '../components/contact/CateringPromo';
import { Config, Hours } from '../hooks/useConfig';
import { getFormattedPhone } from '../utils/hours';

interface ContactPageProps {
  config: Config;
  hours: Hours;
  onNavigate?: (path: string) => void;
}

export const ContactPage = ({ config, hours, onNavigate }: ContactPageProps) => {
  const allHours = hours ? Object.entries(hours.schedule).map(([day, schedule]) => ({
    day: day.charAt(0).toUpperCase() + day.slice(1),
    hours: schedule.closed 
      ? 'Closed' 
      : `${schedule.open} - ${schedule.close}`,
  })) : [];

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
            <h1 className="text-white mb-3 sm:mb-4" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', lineHeight: '1.2' }}>Contact Us</h1>
            <p className="text-white/90 max-w-2xl mx-auto px-2" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)', lineHeight: '1.5' }}>
              We'd love to hear from you
            </p>
          </motion.div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-12">
          {/* Left Column - Contact Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div>
              <h2 className="mb-6">Get in Touch</h2>
              <p className="text-gray-600 mb-8">
                Have a question or want to make a reservation? We're here to help!
              </p>
            </div>

            {/* Contact Cards */}
            <Card className="p-4 sm:p-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: config.theme.accent }}
                >
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: config.theme.brand }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 text-base sm:text-lg">Address</h3>
                  <p className="text-gray-600">
                    {config.address.line1}<br />
                    {config.address.city}, {config.address.state} {config.address.zip}
                  </p>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      `${config.address.line1}, ${config.address.city}, ${config.address.state} ${config.address.zip}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button 
                      variant="link" 
                      className="p-0 h-auto mt-2"
                      style={{ color: config.theme.brand }}
                    >
                      Get Directions →
                    </Button>
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: config.theme.accent }}
                >
                  <Phone className="w-6 h-6" style={{ color: config.theme.brand }} />
                </div>
                <div>
                  <h3 className="mb-2">Phone</h3>
                  <a 
                    href={`tel:${config.contact.phone}`}
                    className="text-gray-600 hover:underline"
                  >
                    {getFormattedPhone(config.contact.phone)}
                  </a>
                  <p className="text-sm text-gray-500 mt-1">Available during business hours</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: config.theme.accent }}
                >
                  <Mail className="w-6 h-6" style={{ color: config.theme.brand }} />
                </div>
                <div>
                  <h3 className="mb-2">Email</h3>
                  <a 
                    href={`mailto:${config.contact.email}`}
                    className="text-gray-600 hover:underline"
                  >
                    {config.contact.email}
                  </a>
                  <p className="text-sm text-gray-500 mt-1">We'll respond within 24 hours</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: config.theme.accent }}
                >
                  <Clock className="w-6 h-6" style={{ color: config.theme.brand }} />
                </div>
                <div className="flex-1">
                  <h3 className="mb-3">Hours</h3>
                  <HoursBadge hours={hours} brandColor={config.theme.brand} />
                  <div className="mt-4 space-y-2">
                    {allHours.map((item) => (
                      <div key={item.day} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.day}</span>
                        <span className="text-gray-900">{item.hours}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Right Column - Map */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:sticky lg:top-24 h-fit"
          >
            <MapCard address={config.address} brandColor={config.theme.brand} />
            
            {/* Quick Actions */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <a href={`tel:${config.contact.phone}`}>
                <Button 
                  variant="outline" 
                  className="w-full"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Now
                </Button>
              </a>
              <a href={`mailto:${config.contact.email}`}>
                <Button 
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Us
                </Button>
              </a>
            </div>

            {/* Catering Services Promo */}
            <CateringPromo 
              brandColor={config.theme.brand} 
              onNavigate={onNavigate}
            />
          </motion.div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Do you take reservations?',
                  a: "We're a retail butcher and grocery market, so reservations aren't needed! Stop by anytime during business hours — our butchers are always ready to assist with fresh halal meat orders.",
                },
                {
                  q: 'Do you offer delivery or pickup?',
                  a: 'Yes! We offer in-store pickup and local delivery for select areas in Naperville. You can place your order online or call us directly for same-day preparation.',
                },
                {
                  q: 'Are your meats halal-certified?',
                  a: 'Absolutely. Every product at Shahirzada Fresh Market is 100% halal-certified, prepared according to Islamic standards, and handled with care in a dedicated halal facility. We never sell non-halal products or mix equipment.',
                },
                {
                  q: 'Do you sell frozen meat?',
                  a: 'No — never! All our beef, lamb, and goat are fresh, never frozen, and cut daily by our in-house halal butchers for unmatched flavor and quality.',
                },
                {
                  q: 'Do you accept custom orders or special cuts?',
                  a: "Yes! We take pride in custom halal cutting. Let us know how you'd like your meat trimmed, ground, or portioned, and our butchers will prepare it exactly to your needs — from BBQ-ready cubes to steakhouse cuts.",
                },
                {
                  q: 'Do you offer catering-sized orders?',
                  a: 'We do! Large families, restaurants, and community events often order from us in bulk. Call ahead or visit the store to discuss your quantity, cuts, and pickup or delivery timing.',
                },
                {
                  q: 'Do you have parking?',
                  a: 'Yes — we have ample parking available right in front of the store at: 📍 3124 Illinois Rte 59 Suite 154, Naperville, IL 60564',
                },
                {
                  q: 'What are your store hours?',
                  a: "We're open 7 days a week: 🕒 Monday–Saturday: 10 AM – 8 PM | 🕕 Sunday: 10 AM – 6 PM",
                },
                {
                  q: 'How can I contact you?',
                  a: 'You can reach us by phone, email, or in person: 📞 (772) 773-7680 | 📧 shahirzadafreshmarket@gmail.com — Or stop by the market, our team is always happy to help!',
                },
              ].map((faq, index) => (
                <Card key={index} className="p-6">
                  <h3 className="mb-2">{faq.q}</h3>
                  <p className="text-gray-600 whitespace-pre-line">{faq.a}</p>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
