import { useState, useRef, useEffect } from 'react';
import { Mail, Phone, Loader2, RefreshCcw, KeyRound, ArrowLeft, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { resendCode, startAuth, verifyAuth } from '../../lib/auth/client';
import { useAuth } from '../../lib/auth/AuthContext';
import { supabase } from '../../lib/supabase/client';
import { hasAdminRole } from '../../lib/auth/roles';

interface LoginFormProps {
  onSuccess: () => void;
  brandColor?: string;
  adminOnly?: boolean;
}

type AuthMethod = 'email-otp' | 'phone-otp' | 'password';
type Phase = 'select' | 'otp-verify' | 'password-form';

export const LoginForm = ({ onSuccess, brandColor = '#6B0F1A', adminOnly = false }: LoginFormProps) => {
  const { refreshUser } = useAuth();

  // Helper to check admin role before proceeding (used when adminOnly is true)
  const checkAdminAndProceed = async () => {
    if (!adminOnly) {
      onSuccess();
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!hasAdminRole(user)) {
      await supabase.auth.signOut();
      setError("You don't have admin access. Contact support if you need help.");
      return;
    }

    onSuccess();
  };
  const [method, setMethod] = useState<AuthMethod>('email-otp');
  const [phase, setPhase] = useState<Phase>('select');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (phase === 'otp-verify') {
      startResendCountdown();
      requestAnimationFrame(() => inputRefs.current[0]?.focus());
    }
  }, [phase]);

  const startResendCountdown = () => {
    setCanResend(false);
    setResendCountdown(30);
    if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    resendTimerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(resendTimerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const isPhone = method === 'phone-otp';
      const response = await startAuth({
        email: !isPhone ? email.trim() : undefined,
        phone: isPhone ? phone.trim() : undefined,
      });

      setFlowId(response.flowId);
      setIdentifier(isPhone ? phone.trim() : email.trim());
      setPhase('otp-verify');
      setCode(['', '', '', '', '', '']);
      setCodeError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      await refreshUser().catch(() => {});
      await checkAdminAndProceed();
    } catch (err: any) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setCodeError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (index === 5 && value) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      setCode(pastedData.split(''));
      inputRefs.current[5]?.focus();
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (overrideCode?: string) => {
    if (!flowId) return;
    const finalCode = overrideCode ?? code.join('');
    if (finalCode.length !== 6) {
      setCodeError('Enter the 6-digit code sent to you');
      return;
    }
    setCodeError(null);
    setVerifying(true);
    try {
      const response = await verifyAuth({ flowId, code: finalCode });
      if (response.success) {
        await refreshUser().catch(() => {});
        await checkAdminAndProceed();
      }
    } catch (err: any) {
      setCodeError(err.message || 'Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!flowId || resendLoading) return;
    setResendLoading(true);
    setCodeError(null);
    try {
      await resendCode(flowId);
      startResendCountdown();
    } catch (err: any) {
      setCodeError(err.message || 'Unable to resend code right now.');
    } finally {
      setResendLoading(false);
    }
  };

  const resetToSelect = () => {
    setPhase('select');
    setFlowId(null);
    setIdentifier('');
    setCode(['', '', '', '', '', '']);
    setCodeError(null);
    setError(null);
    setPassword('');
  };

  // OTP Verification Phase
  if (phase === 'otp-verify') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Back Button */}
        <button
          type="button"
          onClick={resetToSelect}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to login
        </button>

        {/* Header */}
        <div className="text-center space-y-2">
          <div
            className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: `${brandColor}10` }}
          >
            <Sparkles className="w-7 h-7" style={{ color: brandColor }} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Check your {method === 'phone-otp' ? 'phone' : 'inbox'}</h3>
          <p className="text-sm text-gray-600">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-gray-900">{identifier}</span>
          </p>
        </div>

        {/* Code Input */}
        <div className="flex gap-2.5 justify-center">
          {code.map((digit, index) => (
            <motion.input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="w-12 h-14 text-center text-xl font-semibold border-2 rounded-xl
                focus:outline-none focus:ring-0 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: digit ? brandColor : '#e5e7eb',
                backgroundColor: digit ? `${brandColor}05` : 'white',
              }}
              disabled={verifying}
            />
          ))}
        </div>

        {/* Error */}
        <AnimatePresence>
          {codeError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm text-center"
            >
              {codeError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={resetToSelect}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Wrong {method === 'phone-otp' ? 'number' : 'email'}?
          </button>
          <button
            type="button"
            onClick={handleResendCode}
            className="inline-flex items-center gap-1.5 transition-colors disabled:opacity-40"
            style={{ color: canResend ? brandColor : '#9ca3af' }}
            disabled={!canResend || resendLoading}
          >
            {resendLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Sending...
              </>
            ) : canResend ? (
              <>
                <RefreshCcw className="w-3.5 h-3.5" />
                Resend code
              </>
            ) : (
              `Resend in ${resendCountdown}s`
            )}
          </button>
        </div>

        {/* Verify Button */}
        <Button
          onClick={() => handleVerify()}
          className="w-full h-12 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: brandColor }}
          disabled={verifying || code.join('').length !== 6}
        >
          {verifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify & Sign In'
          )}
        </Button>
      </motion.div>
    );
  }

  // Password Form Phase
  if (phase === 'password-form') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="space-y-5"
      >
        {/* Back Button */}
        <button
          type="button"
          onClick={resetToSelect}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to login options
        </button>

        {/* Header */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Sign in with password</h3>
          <p className="text-sm text-gray-500">Enter your email and password to continue</p>
        </div>

        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password-email" className="text-sm font-medium text-gray-700">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                id="password-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 focus:border-gray-300 focus:ring-0"
                paddingLeft={44}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl border-gray-200 focus:border-gray-300 focus:ring-0"
                paddingLeft={44}
              />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            className="w-full h-12 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: brandColor }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="text-center">
            <a
              href="/reset-password"
              className="text-sm hover:underline transition-colors"
              style={{ color: brandColor }}
            >
              Forgot your password?
            </a>
          </div>
        </form>
      </motion.div>
    );
  }

  // Main Selection Phase (OTP Primary)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Method Toggle */}
      <div className="flex p-1 bg-gray-100 rounded-xl">
        <button
          type="button"
          onClick={() => setMethod('email-otp')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            method === 'email-otp'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        <button
          type="button"
          onClick={() => setMethod('phone-otp')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            method === 'phone-otp'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Phone className="w-4 h-4" />
          Phone
        </button>
      </div>

      {/* OTP Form */}
      <form onSubmit={handleSendOTP} className="space-y-4">
        <AnimatePresence mode="wait">
          {method === 'email-otp' ? (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 rounded-xl border-gray-200 focus:border-gray-300 focus:ring-0"
                  paddingLeft={44}
                />
              </div>
              <p className="text-xs text-gray-500 pl-1">
                We'll send you a one-time code to sign in securely
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Phone number
              </Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-12 rounded-xl border-gray-200 focus:border-gray-300 focus:ring-0"
                  paddingLeft={44}
                />
              </div>
              <p className="text-xs text-gray-500 pl-1">
                We'll text you a one-time code to sign in securely
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          className="w-full h-12 text-white font-medium rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{ backgroundColor: brandColor }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending code...
            </>
          ) : (
            'Send Sign-In Code'
          )}
        </Button>
      </form>

      {/* Password Login Option */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-gray-400 font-medium tracking-wider">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setMethod('password');
          setPhase('password-form');
        }}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
      >
        <KeyRound className="w-4 h-4" />
        Sign in with password
      </button>
    </motion.div>
  );
};
