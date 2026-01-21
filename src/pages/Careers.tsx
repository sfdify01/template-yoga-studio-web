import { motion } from 'motion/react';
import { Users, Heart, Clock, Beef, BadgeCheck, Mail, ArrowRight, MapPin, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Config } from '../hooks/useConfig';

interface CareersPageProps {
  config: Config;
  onNavigate: (path: string) => void;
}

export const CareersPage = ({ config, onNavigate }: CareersPageProps) => {
  const benefits = [
    {
      icon: Heart,
      title: 'Family Environment',
      description: 'Join a close-knit team that values respect, integrity, and collaboration',
    },
    {
      icon: Clock,
      title: 'Flexible Scheduling',
      description: 'We work with your schedule — part-time and full-time positions available',
    },
    {
      icon: Beef,
      title: 'Employee Discounts',
      description: 'Enjoy generous discounts on all our premium halal products',
    },
    {
      icon: BadgeCheck,
      title: 'Growth Opportunities',
      description: 'Learn the craft of butchery and advance within our expanding team',
    },
  ];

  const roles = [
    {
      title: 'Halal Butcher',
      type: 'Full-time',
      description: 'Skilled butcher experienced in halal meat preparation and customer service',
    },
    {
      title: 'Counter Associate',
      type: 'Part-time / Full-time',
      description: 'Friendly team member to assist customers and maintain product displays',
    },
    {
      title: 'Delivery Driver',
      type: 'Part-time',
      description: 'Reliable driver to deliver fresh orders to our local customers',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div
        className="relative py-16 sm:py-20 md:py-28 overflow-hidden"
        style={{ backgroundColor: config.theme.brand }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 60%)' }}
          />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* Now Hiring Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="text-white/90 text-sm font-medium tracking-wide">We're Hiring</span>
              </motion.div>

              <h1
                className="text-white mb-4 font-serif"
                style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', lineHeight: '1.1' }}
              >
                Join Our Team
              </h1>
              <p
                className="text-white/85 max-w-2xl mx-auto mb-8"
                style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', lineHeight: '1.6' }}
              >
                Be part of Naperville's premier halal butcher —
                where tradition meets quality, and every team member matters
              </p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-2 text-white/70"
              >
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{config.address.city}, {config.address.state}</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-serif mb-3">Why Work With Us</h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            At {config.name}, we believe in taking care of our team
            as well as we take care of our customers
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 h-full text-center hover:shadow-lg transition-shadow">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: config.theme.accent }}
                >
                  <benefit.icon className="w-7 h-7" style={{ color: config.theme.brand }} />
                </div>
                <h3 className="font-medium mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-gray-50 py-16 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-serif mb-3">Open Positions</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              We're always looking for passionate people who share our commitment to quality
            </p>
          </motion.div>

          <div className="max-w-2xl mx-auto space-y-4">
            {roles.map((role, index) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-lg">{role.title}</h3>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: config.theme.accent,
                            color: config.theme.brand,
                          }}
                        >
                          {role.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{role.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate('/contact')}
                      className="shrink-0"
                    >
                      Apply
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-center text-gray-500 text-sm mt-8"
          >
            Don't see a position that fits? We'd still love to hear from you!
          </motion.p>
        </div>
      </div>

      {/* Apply CTA */}
      <div
        className="py-16"
        style={{ backgroundColor: config.theme.accent }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <Users className="w-12 h-12 mx-auto mb-4" style={{ color: config.theme.brand }} />
            <h2 className="text-2xl sm:text-3xl font-serif mb-4">Ready to Join Our Family?</h2>
            <p className="text-gray-700 mb-6">
              Send us your resume and a brief introduction.
              We look forward to meeting you!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href={`mailto:${config.contact.email}?subject=Career Inquiry - ${config.name}`}>
                <Button
                  size="lg"
                  className="text-white w-full sm:w-auto"
                  style={{ backgroundColor: config.theme.brand }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email Your Resume
                </Button>
              </a>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onNavigate('/contact')}
                className="w-full sm:w-auto"
              >
                Visit the Store
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
