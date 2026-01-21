import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';
import { Button } from './ui/button';

interface Review {
  id: number;
  name: string;
  rating: number;
  text: string;
  date: string;
}

interface ReviewCarouselProps {
  brandColor: string;
}

export const ReviewCarousel = ({ brandColor }: ReviewCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const reviews: Review[] = [
    {
      id: 1,
      name: 'Sarah M.',
      rating: 5,
      text: 'Absolutely incredible food and service! The atmosphere is perfect for a date night or casual dinner. The seasonal menu always has something new to try.',
      date: '2 weeks ago',
    },
    {
      id: 2,
      name: 'Michael T.',
      rating: 5,
      text: 'Best brunch in Naperville! The avocado toast is a must-try. Staff is friendly and attentive. Will definitely be coming back.',
      date: '1 month ago',
    },
    {
      id: 3,
      name: 'Emily R.',
      rating: 5,
      text: 'This place never disappoints. Fresh ingredients, creative dishes, and the coffee is outstanding. Great spot for remote work too!',
      date: '3 weeks ago',
    },
  ];

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  return (
    <div className="relative bg-gray-50 rounded-2xl p-8 md:p-12">
      <Quote 
        className="absolute top-6 left-6 w-12 h-12 opacity-10"
        style={{ color: brandColor }}
      />

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="mb-2">What Our Customers Say</h2>
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className="w-5 h-5 fill-current"
                style={{ color: brandColor }}
              />
            ))}
            <span className="ml-2 text-sm text-gray-600">(4.9 out of 5)</span>
          </div>
        </div>

        <div className="relative min-h-[200px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <p className="text-lg mb-4 italic text-gray-700">
                "{reviews[currentIndex].text}"
              </p>
              <div>
                <p>{reviews[currentIndex].name}</p>
                <p className="text-sm text-gray-500">{reviews[currentIndex].date}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="icon"
            onClick={prev}
            className="rounded-full"
            aria-label="Previous review"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex gap-2">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: index === currentIndex ? brandColor : '#d1d5db',
                  width: index === currentIndex ? '24px' : '8px',
                }}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={next}
            className="rounded-full"
            aria-label="Next review"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
