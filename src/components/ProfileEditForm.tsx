import { useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, Save } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { updateUserProfile } from '../lib/auth/client';
import { toast } from 'sonner';
import type { User as UserType } from '../lib/auth/types';

interface ProfileEditFormProps {
  user: UserType;
  onSuccess?: (updatedUser: UserType) => void;
  onCancel?: () => void;
  brandColor?: string;
}

export const ProfileEditForm = ({
  user,
  onSuccess,
  onCancel,
  brandColor = '#6B0F1A'
}: ProfileEditFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      const updatedUser = await updateUserProfile({
        name: formData.name,
        phone: formData.phone || undefined,
      });

      toast.success('Profile updated!');
      onSuccess?.(updatedUser);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    formData.name !== (user.name || '') ||
    formData.phone !== (user.phone || '');

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="pl-6 pr-12 pt-6 pb-5 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
        <p className="text-sm text-gray-500 mt-1">Update your personal information</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Name Field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              className="h-11"
              paddingLeft={44}
              required
            />
          </div>
        </motion.div>

        {/* Email Field (Read-only) */}
        {user.email && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-2"
          >
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
              <Input
                id="email"
                type="email"
                value={user.email}
                disabled
                className="h-11 bg-gray-50 text-gray-500 cursor-not-allowed"
                paddingLeft={44}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                Fixed
              </span>
            </div>
          </motion.div>
        )}

        {/* Phone Field */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Phone Number
          </Label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isLoading}
              className="h-11"
              paddingLeft={44}
            />
          </div>
          <p className="text-xs text-gray-500">
            Used for order notifications and account verification
          </p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex gap-3 pt-3"
        >
          <Button
            type="submit"
            disabled={isLoading || !hasChanges}
            className="flex-1 h-11 font-medium disabled:opacity-50"
            style={{
              backgroundColor: hasChanges ? brandColor : '#d1d5db',
              color: 'white',
            }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 h-11 font-medium"
            >
              Cancel
            </Button>
          )}
        </motion.div>

        {!hasChanges && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-gray-400 text-center"
          >
            No changes to save
          </motion.p>
        )}
      </form>
    </div>
  );
};
