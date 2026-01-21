import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from './types';
import { getCurrentUser, signOut as clientSignOut } from './client';
import { loadGuestUser, clearGuestUser, convertGuestRecordToUser, saveGuestUser } from './guest';
import { fetchLoyaltyProfile } from '../loyalty/api';

interface AuthContextType {
  user: User | null;
  loyaltyBalance: number;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const response = await getCurrentUser();
      if (response) {
        setUser(response.user);
        setLoyaltyBalance(response.loyaltyBalance);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }

    if (typeof window !== 'undefined') {
      const guest = loadGuestUser();
      if (guest) {
        let guestBalance = guest.loyaltyBalance ?? 0;
        if (guest.email || guest.phone) {
          try {
            const loyaltyResponse = await fetchLoyaltyProfile({
              email: guest.email,
              phone: guest.phone,
            });
            if (loyaltyResponse?.profile?.stars != null) {
              guestBalance = loyaltyResponse.profile.stars;
            }
          } catch (err) {
            console.warn('Failed to sync guest loyalty profile', err);
          }
        }
        if (guestBalance !== guest.loyaltyBalance) {
          saveGuestUser({ ...guest, loyaltyBalance: guestBalance });
        }
        setUser(convertGuestRecordToUser(guest));
        setLoyaltyBalance(guestBalance);
        setLoading(false);
        return;
      }
    }

    setUser(null);
    setLoyaltyBalance(0);
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await clientSignOut();
    } catch (error) {
      console.warn('Supabase sign-out failed (continuing)', error);
    }
    clearGuestUser();
    setUser(null);
    setLoyaltyBalance(0);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loyaltyBalance,
        loading,
        signOut: handleSignOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
