import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, Eye, EyeOff, Check, X as XIcon, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '../../lib/supabase/client';
import { toast } from 'sonner';

interface ChangePasswordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  brandColor?: string;
  showHeader?: boolean;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains a number', test: (p) => /\d/.test(p) },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
];

export const ChangePasswordForm = ({
  onSuccess,
  onCancel,
  brandColor = '#6B0F1A',
  showHeader = true,
}: ChangePasswordFormProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRequirementsMet = passwordRequirements.every((req) => req.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = currentPassword.length > 0 && allRequirementsMet && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setLoading(true);

    try {
      // First verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Unable to verify your account. Please sign in again.');
      }

      // Verify current password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error('Current password is incorrect');
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      {showHeader && (
        <div className="pl-6 pr-12 pt-6 pb-5 border-b">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}10` }}
            >
              <ShieldCheck className="w-5 h-5" style={{ color: brandColor }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
              <p className="text-sm text-gray-500">Update your account password</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Current Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <Label htmlFor="current-password" className="text-sm font-medium text-gray-700">
            Current Password
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            <Input
              id="current-password"
              type={showCurrentPassword ? 'text' : 'password'}
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              className="h-11"
              paddingLeft={44}
              paddingRight={44}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        {/* New Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">
            New Password
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            <Input
              id="new-password"
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              className="h-11"
              paddingLeft={44}
              paddingRight={44}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Requirements */}
          <AnimatePresence>
            {newPassword.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5 pt-2"
              >
                {passwordRequirements.map((req, index) => {
                  const met = req.test(newPassword);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-2 text-xs transition-colors ${
                        met ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    >
                      {met ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-current" />
                      )}
                      {req.label}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Confirm Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
            Confirm New Password
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="h-11"
              paddingLeft={44}
              paddingRight={44}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {confirmPassword.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-1.5 text-xs ${
                  passwordsMatch ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {passwordsMatch ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Passwords match
                  </>
                ) : (
                  <>
                    <XIcon className="w-3.5 h-3.5" />
                    Passwords don't match
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error */}
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

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex gap-3 pt-2"
        >
          <Button
            type="submit"
            disabled={loading || !canSubmit}
            className="flex-1 h-11 font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100"
            style={{
              backgroundColor: canSubmit ? brandColor : '#d1d5db',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="px-6 h-11 font-medium"
            >
              Cancel
            </Button>
          )}
        </motion.div>

        {/* Forgot Password Link */}
        <div className="text-center pt-2">
          <a
            href="/reset-password"
            className="text-sm text-gray-500 hover:text-gray-700 hover:underline transition-colors"
          >
            Forgot your current password?
          </a>
        </div>
      </form>
    </div>
  );
};
