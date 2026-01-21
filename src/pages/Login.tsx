import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { Card } from '../components/ui/card';
import { LoginForm } from '../components/auth/LoginForm';

interface LoginProps {
  onNavigate: (path: string) => void;
  brandColor?: string;
}

export const Login = ({ onNavigate, brandColor = '#6B0F1A' }: LoginProps) => {
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
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="mb-2">Welcome back</h1>
          <p className="text-gray-600">
            Sign in to see your orders and rewards
          </p>
        </div>

        <Card className="p-6">
          <LoginForm
            onSuccess={() => onNavigate('/account')}
            brandColor={brandColor}
          />
        </Card>

        {/* Help Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => onNavigate('/contact')}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Having trouble? Contact us
          </button>
        </div>
      </motion.div>
    </div>
  );
};
