import { motion } from 'motion/react';
import { Heart, Leaf, Users, Award } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Config } from '../hooks/useConfig';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

interface AboutPageProps {
  config: Config;
}

export const AboutPage = ({ config }: AboutPageProps) => {
  const values = [
    {
      icon: Heart,
      title: 'Passion for Food',
      description: 'Every dish is crafted with love and attention to detail',
    },
    {
      icon: Leaf,
      title: 'Sustainability',
      description: 'Locally sourced ingredients and eco-friendly practices',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'Building connections through shared meals',
    },
    {
      icon: Award,
      title: 'Quality',
      description: 'Committed to excellence in every aspect',
    },
  ];

  const team = [
    { name: 'Maria Rodriguez', role: 'Executive Chef', image: 'chef woman' },
    { name: 'James Chen', role: 'Sous Chef', image: 'chef man' },
    { name: 'Sarah Williams', role: 'Pastry Chef', image: 'baker woman' },
    { name: 'Alex Thompson', role: 'Restaurant Manager', image: 'restaurant manager' },
  ];

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
            <h1 className="text-white mb-3 sm:mb-4" style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', lineHeight: '1.2' }}>About Us</h1>
            <p className="text-white/90 max-w-2xl mx-auto px-2" style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)', lineHeight: '1.5' }}>
              Discover the story behind {config.name}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Story Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-12 items-center"
        >
          <div>
            <h2 className="mb-4">Our Story</h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Founded in the heart of {config.address.city}, {config.name} began with a simple vision: 
                to create a space where exceptional food meets warm hospitality.
              </p>
              <p>
                Our journey started with a passion for farm-to-table dining and a commitment to 
                showcasing the incredible flavors of locally-sourced ingredients. Today, we're proud 
                to be a cornerstone of our community, serving dishes that celebrate both tradition 
                and innovation.
              </p>
              <p>
                Every ingredient is carefully selected, every recipe thoughtfully crafted, and every 
                plate prepared with the care it deserves. We believe that great food brings people 
                together, creating memories that last a lifetime.
              </p>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg">
            <ImageWithFallback
              src="https://source.unsplash.com/800x600/?restaurant,interior"
              alt="Restaurant interior"
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
      </div>

      {/* Values */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-center mb-12">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 text-center h-full">
                    <value.icon 
                      className="w-10 h-10 mx-auto mb-4"
                      style={{ color: config.theme.brand }}
                    />
                    <h3 className="mb-2">{value.title}</h3>
                    <p className="text-sm text-gray-600">{value.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Team */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-center mb-4">Meet Our Team</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            The talented individuals who make {config.name} special
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-gray-100">
                  <ImageWithFallback
                    src={`https://source.unsplash.com/400x400/?${encodeURIComponent(member.image)}`}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg mb-1">{member.name}</h3>
                <p className="text-sm text-gray-600">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Sustainability */}
      <div 
        className="py-16 text-white"
        style={{ backgroundColor: config.theme.brand }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Leaf className="w-12 h-12 mx-auto mb-4 text-white" />
            <h2 className="text-white mb-4">Committed to Sustainability</h2>
            <p className="text-white/90 text-lg mb-6">
              We partner with local farms and suppliers to reduce our carbon footprint and support 
              our community. Our commitment to sustainability extends from our sourcing practices to 
              our compostable packaging and energy-efficient kitchen equipment.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
