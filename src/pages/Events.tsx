import { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Users, Utensils, Send } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Config } from '../hooks/useConfig';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

interface EventsPageProps {
  config: Config;
}

export const EventsPage = ({ config }: EventsPageProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    guestCount: '',
    date: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Catering inquiry:', formData);
    alert('Thank you for your inquiry! We\'ll be in touch soon.');
    setFormData({
      name: '',
      email: '',
      phone: '',
      eventType: '',
      guestCount: '',
      date: '',
      message: '',
    });
  };

  const upcomingEvents = [
    {
      id: 1,
      title: 'Wine Tasting Night',
      date: 'October 25, 2025',
      time: '7:00 PM - 10:00 PM',
      description: 'Join us for an evening of curated wines paired with chef-selected appetizers',
      image: 'wine tasting event',
      spots: 15,
    },
    {
      id: 2,
      title: 'Cooking Class: Italian Classics',
      date: 'November 2, 2025',
      time: '6:00 PM - 9:00 PM',
      description: 'Learn to make authentic Italian pasta from our executive chef',
      image: 'cooking class',
      spots: 8,
    },
    {
      id: 3,
      title: 'Live Jazz Brunch',
      date: 'November 10, 2025',
      time: '11:00 AM - 2:00 PM',
      description: 'Enjoy brunch with live jazz music in our dining room',
      image: 'jazz brunch',
      spots: 25,
    },
  ];

  const cateringOptions = [
    {
      icon: Users,
      title: 'Corporate Events',
      description: 'Professional catering for meetings, conferences, and company celebrations',
    },
    {
      icon: Calendar,
      title: 'Private Parties',
      description: 'Customized menus for birthdays, anniversaries, and special occasions',
    },
    {
      icon: Utensils,
      title: 'Wedding Catering',
      description: 'Make your special day unforgettable with our elegant catering services',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div 
        className="py-16 text-white text-center"
        style={{ backgroundColor: config.theme.brand }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Calendar className="w-16 h-16 mx-auto mb-4 text-white" />
            <h1 className="text-white mb-4">Events & Catering</h1>
            <p className="text-white/90 text-lg max-w-2xl mx-auto">
              Celebrate with us or let us bring the experience to you
            </p>
          </motion.div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-8">Upcoming Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upcomingEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden h-full flex flex-col">
                  <div className="aspect-[16/9] bg-gray-100">
                    <ImageWithFallback
                      src={`https://source.unsplash.com/600x400/?${encodeURIComponent(event.image)}`}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="mb-2">{event.title}</h3>
                    <p className="text-sm mb-1" style={{ color: config.theme.brand }}>
                      {event.date}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">{event.time}</p>
                    <p className="text-sm text-gray-600 mb-4 flex-1">{event.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{event.spots} spots left</span>
                      <Button 
                        size="sm"
                        style={{ backgroundColor: config.theme.brand }}
                        className="text-white"
                      >
                        RSVP
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Catering Services */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-center mb-4">Catering Services</h2>
            <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
              Let us bring the {config.name} experience to your next event
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cateringOptions.map((option, index) => (
                <motion.div
                  key={option.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 text-center h-full">
                    <option.icon 
                      className="w-12 h-12 mx-auto mb-4"
                      style={{ color: config.theme.brand }}
                    />
                    <h3 className="mb-2">{option.title}</h3>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Inquiry Form */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="p-8">
            <h2 className="mb-2">Catering Inquiry</h2>
            <p className="text-gray-600 mb-6">
              Fill out the form below and we'll get back to you within 24 hours
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label htmlFor="eventType">Event Type</Label>
                  <Input
                    id="eventType"
                    type="text"
                    placeholder="e.g. Wedding, Corporate Event"
                    value={formData.eventType}
                    onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guestCount">Number of Guests</Label>
                  <Input
                    id="guestCount"
                    type="number"
                    value={formData.guestCount}
                    onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>
                <div>
                  <Label htmlFor="date">Preferred Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="rounded-2xl"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  rows={4}
                  placeholder="Tell us about your event..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="rounded-2xl"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full text-white"
                style={{ backgroundColor: config.theme.brand }}
              >
                <Send className="w-5 h-5 mr-2" />
                Send Inquiry
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
