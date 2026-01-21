import { useState } from 'react';
import { Mail, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface NewsletterFormProps {
  brandColor: string;
  brandName: string;
}

export const NewsletterForm = ({ brandColor, brandName }: NewsletterFormProps) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // In production, integrate with email service
      console.log('Newsletter signup:', email);
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <div 
      className="rounded-2xl p-8 md:p-12 text-white"
      style={{ backgroundColor: brandColor }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-90" />
        <h2 className="text-white mb-2">Stay in the Loop</h2>
        <p className="text-white/90 mb-6">
          Subscribe to our newsletter for exclusive offers, new products, and upcoming events at {brandName}.
        </p>

        {subscribed ? (
          <div className="flex items-center justify-center gap-2 text-white bg-white/20 rounded-2xl py-4 px-6">
            <CheckCircle className="w-5 h-5" />
            <span>Thanks for subscribing!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 bg-white/90 backdrop-blur-sm border-0 rounded-2xl text-gray-900 placeholder:text-gray-500"
            />
            <Button
              type="submit"
              size="lg"
              className="bg-white text-gray-900 hover:bg-white/90 whitespace-nowrap"
            >
              Subscribe
            </Button>
          </form>
        )}

        <p className="text-xs text-white/75 mt-4">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </div>
  );
};
