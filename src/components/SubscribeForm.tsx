import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Check, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { supabase } from '../lib/supabase/client';

const TENANT_ID = '807a5c76-c690-4f78-b721-0cf9ba763f5d';

interface SubscribeFormProps {
  brandColor?: string;
}

export const SubscribeForm = ({ brandColor = '#6B0F1A' }: SubscribeFormProps) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Simple email validation
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .upsert(
          { tenant_id: TENANT_ID, email: email.toLowerCase().trim() },
          { onConflict: 'tenant_id,email' }
        );

      if (insertError) {
        console.error('Newsletter signup error:', insertError);
        setError('Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
      setEmail('');

      // Reset after 5 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      console.error('Newsletter signup error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div
            key="form"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  paddingLeft={40}
                  className="h-10 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-offset-0"
                  style={{
                    ['--tw-ring-color' as string]: brandColor,
                  }}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="h-10 px-6 rounded-lg text-white font-medium shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Subscribe'
                )}
              </Button>
            </form>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 flex-shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-900">
                Thanks! You're now subscribed.
              </p>
              <p className="text-xs text-green-700">
                We'll keep you updated on offers and events.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
