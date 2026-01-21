import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  error?: string | null;
}

export const AdminLogin = ({ onLoginSuccess, error: initialError }: AdminLoginProps) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { adminApi } = await import('../../lib/admin/api-client');
      await adminApi.login(password);
      toast.success('Login successful');
      onLoginSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'Invalid password';
      setError(errorMessage);
      
      // If it's a fetch error, show helpful message
      if (errorMessage.includes('fetch') || errorMessage.includes('connect')) {
        setError('Cannot connect to server. The Supabase Edge Function may not be deployed. Check browser console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="w-full p-6 sm:p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand rounded-full flex items-center justify-center mb-4">
              <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center">Admin Dashboard</h1>
            <p className="text-sm text-gray-600 text-center">
              Enter password to access dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full h-12"
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full h-12 bg-brand hover:bg-brand-hover text-white font-medium"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Protected area • Authorized access only
            </p>
          </div>
        </Card>
      </motion.div>

      {/* SEO: Prevent indexing */}
      <meta name="robots" content="noindex,nofollow" />
    </div>
  );
};
