import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Loader2, RefreshCcw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { verifyAuth, resendCode } from '../lib/auth/client';

interface VerifyProps {
  onNavigate: (path: string) => void;
  brandColor?: string;
}

export const Verify = ({ onNavigate, brandColor = '#6B0F1A' }: VerifyProps) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get flowId and method from URL
  const urlParams = new URLSearchParams(window.location.search);
  const flowId = urlParams.get('flowId');
  const method = urlParams.get('method');
  const identifier = urlParams.get('identifier') || '';

  useEffect(() => {
    if (!flowId) {
      onNavigate('/login');
      return;
    }

    // Enable resend after 30 seconds
    const timer = setTimeout(() => {
      setCanResend(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, [flowId, onNavigate]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow single digit
    if (value.length > 1) {
      value = value.slice(-1);
    }

    // Only allow numbers
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Check if pasted data is 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      
      // Auto-submit
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (fullCode: string) => {
    if (!flowId) return;

    setError(null);
    setLoading(true);

    try {
      const response = await verifyAuth({
        flowId,
        code: fullCode,
      });

      if (response.success) {
        // Navigate to account
        onNavigate('/account');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!flowId) return;

    setResendLoading(true);
    setError(null);

    try {
      await resendCode(flowId);
      setCanResend(false);
      
      // Re-enable after 30 seconds
      setTimeout(() => {
        setCanResend(true);
      }, 30000);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      handleVerify(fullCode);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4"
            style={{ backgroundColor: brandColor }}
          >
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="mb-2">Enter verification code</h1>
          <p className="text-gray-600">
            {method === 'email' 
              ? `Code sent to your email` 
              : `Code sent via SMS`}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Check your {method === 'email' ? 'inbox' : 'messages'} for the 6-digit code
          </p>
        </div>

        {/* Form Card */}
        <Card className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Code Inputs */}
            <div className="flex gap-2 justify-center mb-6">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-2xl border rounded-lg focus:ring-2 focus:ring-offset-0 transition-all"
                  style={{
                    borderColor: digit ? brandColor : undefined,
                    ['--tw-ring-color' as string]: brandColor,
                  }}
                  disabled={loading}
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full text-white"
              style={{ backgroundColor: brandColor }}
              disabled={loading || code.join('').length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify and continue'
              )}
            </Button>
          </form>

          {/* Resend */}
          <div className="mt-4 text-center">
            <button
              onClick={handleResend}
              disabled={!canResend || resendLoading}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? (
                <>
                  <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
                  Sending...
                </>
              ) : canResend ? (
                <>
                  <RefreshCcw className="w-3 h-3 inline mr-1" />
                  Resend code
                </>
              ) : (
                'Resend code in 30s'
              )}
            </button>
          </div>
        </Card>

        {/* Back Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => onNavigate('/login')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to login
          </button>
        </div>
      </motion.div>
    </div>
  );
};
