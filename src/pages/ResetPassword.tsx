import { useEffect, useState } from 'react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase/client';

const parseHashParams = (hash: string): Record<string, string> => {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash;
  return Object.fromEntries(new URLSearchParams(trimmed));
};

interface ResetPasswordProps {
  onNavigate: (path: string) => void;
}

export const ResetPassword = ({ onNavigate }: ResetPasswordProps) => {
  const [stage, setStage] = useState<'request' | 'update'>('request');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // On load, see if we're coming from the Supabase recovery link and hydrate the session
  useEffect(() => {
    const run = async () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const hashParams = parseHashParams(hash);
      const url = new URL(window.location.href);
      const codeFromQuery = url.searchParams.get('code');
      const accessToken = hashParams.access_token;
      const refreshToken = hashParams.refresh_token;
      const type = hashParams.type || url.searchParams.get('type');

      if (type === 'recovery' || accessToken || refreshToken || codeFromQuery) {
        setStage('update');
        setLoading(true);
        setError(null);
        try {
          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
          } else if (codeFromQuery) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeFromQuery);
            if (exchangeError) throw exchangeError;
          } else if (hash.includes('type=recovery')) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(hash);
            if (exchangeError) throw exchangeError;
          } else {
            throw new Error('Recovery link is missing required parameters.');
          }
          setMessage('Session confirmed. Please set your new password.');
        } catch (err: any) {
          console.error('Recovery exchange error', err);
          setError(err.message || 'Invalid or expired reset link.');
          setStage('request');
        } finally {
          setLoading(false);
        }
      }
    };
    run();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });
      if (resetError) throw resetError;
      setMessage('Check your email for a password reset link.');
    } catch (err: any) {
      setError(err.message || 'Unable to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setPasswordUpdated(true);
      setMessage('Password updated. You can now sign in.');
    } catch (err: any) {
      setError(err.message || 'Unable to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {stage === 'request' ? 'Forgot Password' : 'Set New Password'}
            </h1>
            <p className="text-sm text-gray-600">
              {stage === 'request'
                ? 'Send a reset link to your email.'
                : 'Enter your new password.'}
            </p>
          </div>
        </div>

        {stage === 'request' ? (
          <>
            <form className="space-y-3" onSubmit={handleRequest}>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
              {message && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{message}</div>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>
            <div className="flex items-center justify-center gap-4 text-sm pt-2">
              <button
                onClick={() => onNavigate('/login')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Login
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => onNavigate('/products')}
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                Continue Shopping
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </>
        ) : (
          <>
            <form className="space-y-3" onSubmit={handleUpdate}>
              <Input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={passwordUpdated}
              />
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
              {message && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{message}</div>}
              {!passwordUpdated && (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update password'
                  )}
                </Button>
              )}
            </form>
            {passwordUpdated && (
              <div className="space-y-3">
                <Button
                  onClick={() => onNavigate('/products')}
                  className="w-full"
                  variant="default"
                >
                  Continue Shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <button
                  onClick={() => onNavigate('/login')}
                  className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Sign in to your account
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
